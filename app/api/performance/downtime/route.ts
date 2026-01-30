import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const downtimeSchema = z.object({
  wellId: z.string(),
  startTime: z.string().transform(str => new Date(str)),
  endTime: z.string().transform(str => new Date(str)).optional(),
  reason: z.enum([
    'scheduled_maintenance',
    'unscheduled_maintenance',
    'equipment_failure',
    'weather',
    'regulatory',
    'other'
  ]),
  description: z.string().optional(),
  impact: z.string().optional(),
  reportedBy: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const wellId = searchParams.get('wellId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: any = {};

    if (wellId) {
      whereClause.wellId = wellId;
    }

    if (startDate || endDate) {
      whereClause.startTime = {};
      if (startDate) {
        whereClause.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.startTime.lte = new Date(endDate);
      }
    }

    const downtime = await prisma.downtime.findMany({
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
        startTime: 'desc',
      },
    });

    return NextResponse.json(downtime);
  } catch (error) {
    console.error('Error fetching downtime:', error);
    return NextResponse.json(
      { error: 'Failed to fetch downtime' },
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
    const validatedData = downtimeSchema.parse(body);

    // Calculate duration if endTime is provided
    const data: any = { ...validatedData };
    if (data.endTime && data.startTime) {
      const durationMs = data.endTime.getTime() - data.startTime.getTime();
      data.duration = durationMs / (1000 * 60 * 60); // Convert to hours
    }

    const downtime = await prisma.downtime.create({
      data,
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

    return NextResponse.json(downtime, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating downtime:', error);
    return NextResponse.json(
      { error: 'Failed to create downtime' },
      { status: 500 }
    );
  }
}
