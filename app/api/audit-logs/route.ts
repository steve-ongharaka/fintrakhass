import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');

    const where: any = {};
    if (action && action !== 'all') where.action = action;
    if (entityType && entityType !== 'all') where.entityType = entityType;
    if (userId && userId !== 'all') where.userId = userId;
    if (startDate) where.timestamp = { ...where.timestamp, gte: new Date(startDate) };
    if (endDate) where.timestamp = { ...where.timestamp, lte: new Date(endDate) };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit ? parseInt(limit) : 100,
    });

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    // Allow logging even without session for login/logout events
    
    const body = await request.json();
    const log = await prisma.auditLog.create({
      data: {
        ...body,
        timestamp: new Date(),
        userId: (session?.user as any)?.id || body.userId,
        userEmail: (session?.user as any)?.email || body.userEmail,
        userName: (session?.user as any)?.name || body.userName,
        userRole: (session?.user as any)?.role || body.userRole,
      },
    });

    return NextResponse.json({ data: log }, { status: 201 });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
