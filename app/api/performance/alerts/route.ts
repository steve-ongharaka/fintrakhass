import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const alertSchema = z.object({
  wellId: z.string(),
  alertType: z.enum([
    'low_production',
    'high_water_cut',
    'high_gor',
    'pressure_drop',
    'equipment_failure',
    'downtime'
  ]),
  severity: z.enum(['info', 'warning', 'critical']).default('warning'),
  message: z.string(),
  thresholdValue: z.number().optional(),
  actualValue: z.number().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const wellId = searchParams.get('wellId');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');

    const whereClause: any = {};

    if (wellId) {
      whereClause.wellId = wellId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (severity) {
      whereClause.severity = severity;
    }

    const alerts = await prisma.wellAlert.findMany({
      where: whereClause,
      include: {
        well: {
          select: {
            wellName: true,
            wellId: true,
            field: true,
          },
        },
      },
      orderBy: {
        detectedAt: 'desc',
      },
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin' && userRole !== 'operator') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = alertSchema.parse(body);

    const alert = await prisma.wellAlert.create({
      data: validatedData,
      include: {
        well: {
          select: {
            wellName: true,
            wellId: true,
            field: true,
          },
        },
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}
