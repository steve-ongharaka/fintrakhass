import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const scheduledReportSchema = z.object({
  templateId: z.string(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  time: z.string().optional(),
  recipients: z.array(z.string().email()).optional(),
  format: z.enum(['pdf', 'excel', 'csv']).default('pdf'),
  isActive: z.boolean().default(true),
});

// GET - Fetch scheduled reports
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (templateId) where.templateId = templateId;
    if (isActive !== null && isActive !== 'all') where.isActive = isActive === 'true';

    const scheduledReports = await prisma.scheduledReport.findMany({
      where,
      include: {
        template: {
          select: { name: true, reportType: true },
        },
        createdBy: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(scheduledReports);
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    return NextResponse.json({ error: 'Failed to fetch scheduled reports' }, { status: 500 });
  }
}

// POST - Create scheduled report
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (!['admin', 'operator'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const data = scheduledReportSchema.parse(body);

    // Calculate next run time
    const nextRunAt = calculateNextRunTime(data.frequency, data.dayOfWeek, data.dayOfMonth, data.time);

    const scheduledReport = await prisma.scheduledReport.create({
      data: {
        templateId: data.templateId,
        frequency: data.frequency as any,
        dayOfWeek: data.dayOfWeek,
        dayOfMonth: data.dayOfMonth,
        time: data.time,
        recipients: data.recipients ? JSON.stringify(data.recipients) : null,
        format: data.format as any,
        isActive: data.isActive,
        nextRunAt,
        createdById: (session.user as any)?.id,
      },
      include: {
        template: { select: { name: true, reportType: true } },
      },
    });

    return NextResponse.json(scheduledReport, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error creating scheduled report:', error);
    return NextResponse.json({ error: 'Failed to create scheduled report' }, { status: 500 });
  }
}

function calculateNextRunTime(
  frequency: string,
  dayOfWeek?: number,
  dayOfMonth?: number,
  time?: string
): Date {
  const now = new Date();
  const [hours, minutes] = (time || '08:00').split(':').map(Number);
  
  const nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
    case 'weekly':
      const targetDay = dayOfWeek ?? 1; // Default Monday
      const currentDay = nextRun.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0 || (daysToAdd === 0 && nextRun <= now)) {
        daysToAdd += 7;
      }
      nextRun.setDate(nextRun.getDate() + daysToAdd);
      break;
    case 'monthly':
      const targetDayOfMonth = dayOfMonth ?? 1;
      nextRun.setDate(targetDayOfMonth);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
  }

  return nextRun;
}
