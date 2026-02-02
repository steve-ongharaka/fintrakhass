import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const alertConfigSchema = z.object({
  alertType: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  threshold: z.number().optional(),
  thresholdUnit: z.string().optional(),
  comparisonOperator: z.enum(['lt', 'gt', 'lte', 'gte', 'eq']).optional(),
  isActive: z.boolean().default(true),
  notifyOnBreach: z.boolean().default(true),
  cooldownMinutes: z.number().default(60),
});

// GET - Fetch alert configurations
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alertType = searchParams.get('alertType');
    const entityType = searchParams.get('entityType');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (alertType && alertType !== 'all') where.alertType = alertType;
    if (entityType && entityType !== 'all') where.entityType = entityType;
    if (isActive !== null && isActive !== 'all') where.isActive = isActive === 'true';

    const configurations = await prisma.alertConfiguration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(configurations);
  } catch (error) {
    console.error('Error fetching alert configurations:', error);
    return NextResponse.json({ error: 'Failed to fetch configurations' }, { status: 500 });
  }
}

// POST - Create alert configuration
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
    const data = alertConfigSchema.parse(body);

    const configuration = await prisma.alertConfiguration.create({
      data: {
        ...data,
        createdById: (session.user as any)?.id,
      },
    });

    return NextResponse.json(configuration, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error creating alert configuration:', error);
    return NextResponse.json({ error: 'Failed to create configuration' }, { status: 500 });
  }
}
