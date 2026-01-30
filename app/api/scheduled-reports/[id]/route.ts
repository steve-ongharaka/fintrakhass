import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateScheduledReportSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  dayOfWeek: z.number().min(0).max(6).optional().nullable(),
  dayOfMonth: z.number().min(1).max(31).optional().nullable(),
  time: z.string().optional(),
  recipients: z.array(z.string().email()).optional(),
  format: z.enum(['pdf', 'excel', 'csv']).optional(),
  isActive: z.boolean().optional(),
});

// GET - Fetch single scheduled report
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduledReport = await prisma.scheduledReport.findUnique({
      where: { id: params.id },
      include: {
        template: true,
        createdBy: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!scheduledReport) {
      return NextResponse.json({ error: 'Scheduled report not found' }, { status: 404 });
    }

    return NextResponse.json(scheduledReport);
  } catch (error) {
    console.error('Error fetching scheduled report:', error);
    return NextResponse.json({ error: 'Failed to fetch scheduled report' }, { status: 500 });
  }
}

// PUT - Update scheduled report
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const data = updateScheduledReportSchema.parse(body);

    const updateData: any = { ...data };
    if (data.recipients) {
      updateData.recipients = JSON.stringify(data.recipients);
    }

    // Recalculate next run time if frequency changed
    if (data.frequency || data.dayOfWeek !== undefined || data.dayOfMonth !== undefined || data.time) {
      const current = await prisma.scheduledReport.findUnique({ where: { id: params.id } });
      if (current) {
        updateData.nextRunAt = calculateNextRunTime(
          data.frequency || current.frequency,
          data.dayOfWeek ?? current.dayOfWeek ?? undefined,
          data.dayOfMonth ?? current.dayOfMonth ?? undefined,
          data.time || current.time || undefined
        );
      }
    }

    const scheduledReport = await prisma.scheduledReport.update({
      where: { id: params.id },
      data: updateData,
      include: {
        template: { select: { name: true, reportType: true } },
      },
    });

    return NextResponse.json(scheduledReport);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error updating scheduled report:', error);
    return NextResponse.json({ error: 'Failed to update scheduled report' }, { status: 500 });
  }
}

// DELETE - Delete scheduled report
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await prisma.scheduledReport.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    return NextResponse.json({ error: 'Failed to delete scheduled report' }, { status: 500 });
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
      const targetDay = dayOfWeek ?? 1;
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
