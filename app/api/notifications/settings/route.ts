import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateSettingSchema = z.object({
  notificationType: z.string(),
  isEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  thresholds: z.record(z.any()).optional(),
});

// GET - Fetch notification settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;

    // Get user's notification settings
    const settings = await prisma.notificationSetting.findMany({
      where: { userId },
      orderBy: { notificationType: 'asc' },
    });

    // Define default notification types
    const defaultTypes = [
      { notificationType: 'production_alert', isEnabled: true, emailEnabled: true },
      { notificationType: 'system_alert', isEnabled: true, emailEnabled: true },
      { notificationType: 'scheduled_report', isEnabled: true, emailEnabled: true },
    ];

    // Merge with defaults for any missing types
    const mergedSettings = defaultTypes.map((def: any) => {
      const existing = settings.find((s: any) => s.notificationType === def.notificationType);
      return existing || { ...def, userId, id: null };
    });

    return NextResponse.json(mergedSettings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST - Update notification setting
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const userEmail = session.user?.email;

    const body = await request.json();
    const data = updateSettingSchema.parse(body);

    // Upsert the setting
    const setting = await prisma.notificationSetting.upsert({
      where: {
        userId_notificationType: {
          userId: userId || '',
          notificationType: data.notificationType,
        },
      },
      create: {
        userId,
        userEmail,
        notificationType: data.notificationType,
        isEnabled: data.isEnabled ?? true,
        emailEnabled: data.emailEnabled ?? true,
        thresholds: data.thresholds ? JSON.stringify(data.thresholds) : null,
      },
      update: {
        isEnabled: data.isEnabled,
        emailEnabled: data.emailEnabled,
        thresholds: data.thresholds ? JSON.stringify(data.thresholds) : undefined,
      },
    });

    return NextResponse.json(setting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error updating notification setting:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
