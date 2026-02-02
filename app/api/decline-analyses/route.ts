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
    const declineType = searchParams.get('declineType');

    const where: any = {};
    if (wellId && wellId !== 'all') where.wellId = wellId;
    if (declineType && declineType !== 'all') where.declineType = declineType;

    const analyses = await prisma.declineAnalysis.findMany({
      where,
      orderBy: { analysisDate: 'desc' },
    });

    return NextResponse.json({ data: analyses });
  } catch (error) {
    console.error('Error fetching decline analyses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    
    // Calculate remaining reserves
    const remainingReserves = (body.estimatedUltimateRecovery || 0) - (body.cumulativeToDate || 0);

    const analysis = await prisma.declineAnalysis.create({
      data: {
        ...body,
        analysisDate: new Date(),
        dataStartDate: body.dataStartDate ? new Date(body.dataStartDate) : null,
        dataEndDate: body.dataEndDate ? new Date(body.dataEndDate) : null,
        forecastEndDate: body.forecastEndDate ? new Date(body.forecastEndDate) : null,
        remainingReserves,
        performedBy: (session.user as any)?.email,
      },
    });

    return NextResponse.json({ data: analysis }, { status: 201 });
  } catch (error) {
    console.error('Error creating decline analysis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
