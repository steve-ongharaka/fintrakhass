import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateAlertConfigSchema = z.object({
  alertType: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  threshold: z.number().optional(),
  thresholdUnit: z.string().optional(),
  comparisonOperator: z.enum(['lt', 'gt', 'lte', 'gte', 'eq']).optional(),
  isActive: z.boolean().optional(),
  notifyOnBreach: z.boolean().optional(),
  cooldownMinutes: z.number().optional(),
});

// PUT - Update alert configuration
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
    const data = updateAlertConfigSchema.parse(body);

    const configuration = await prisma.alertConfiguration.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(configuration);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error updating alert configuration:', error);
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}

// DELETE - Delete alert configuration
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

    await prisma.alertConfiguration.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting alert configuration:', error);
    return NextResponse.json({ error: 'Failed to delete configuration' }, { status: 500 });
  }
}
