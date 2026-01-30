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
    const wellId = searchParams.get('wellId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    const whereClause: any = {};

    if (wellId) {
      whereClause.wellId = wellId;
    }

    if (startDate || endDate) {
      whereClause.metricDate = {};
      if (startDate) {
        whereClause.metricDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.metricDate.lte = new Date(endDate);
      }
    }

    const metrics = await prisma.performanceMetric.findMany({
      where: whereClause,
      include: {
        well: {
          select: {
            wellName: true,
            wellId: true,
            field: true,
            status: true,
            wellType: true,
          },
        },
      },
      orderBy: {
        metricDate: 'desc',
      },
      take: limit,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
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

    const metric = await prisma.performanceMetric.create({
      data: body,
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

    return NextResponse.json(metric, { status: 201 });
  } catch (error) {
    console.error('Error creating performance metric:', error);
    return NextResponse.json(
      { error: 'Failed to create performance metric' },
      { status: 500 }
    );
  }
}
