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
    const scenario = searchParams.get('scenario');

    const where: any = {};
    if (wellId && wellId !== 'all') where.wellId = wellId;
    if (scenario && scenario !== 'all') where.scenario = scenario;

    const forecasts = await prisma.productionForecast.findMany({
      where,
      orderBy: { forecastDate: 'desc' },
    });

    return NextResponse.json({ data: forecasts });
  } catch (error) {
    console.error('Error fetching production forecasts:', error);
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
    const forecast = await prisma.productionForecast.create({
      data: {
        ...body,
        forecastDate: new Date(),
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        createdBy: (session.user as any)?.email,
      },
    });

    return NextResponse.json({ data: forecast }, { status: 201 });
  } catch (error) {
    console.error('Error creating production forecast:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
