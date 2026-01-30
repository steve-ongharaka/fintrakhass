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
    const tankId = searchParams.get('tankId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (tankId && tankId !== 'all') where.tankId = tankId;
    if (startDate) where.gaugingDate = { ...where.gaugingDate, gte: new Date(startDate) };
    if (endDate) where.gaugingDate = { ...where.gaugingDate, lte: new Date(endDate) };

    const gaugings = await prisma.tankGauging.findMany({
      where,
      include: { tank: true },
      orderBy: { gaugingDate: 'desc' },
      take: 500,
    });

    return NextResponse.json({ data: gaugings });
  } catch (error) {
    console.error('Get tank gaugings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (!['admin', 'operator'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const gauging = await prisma.tankGauging.create({
      data: {
        tankId: body.tankId,
        gaugingDate: new Date(body.gaugingDate),
        gaugingTime: body.gaugingTime,
        gaugeType: body.gaugeType,
        liquidLevel: body.liquidLevel ? parseFloat(body.liquidLevel) : null,
        freeWaterLevel: body.freeWaterLevel ? parseFloat(body.freeWaterLevel) : null,
        temperature: body.temperature ? parseFloat(body.temperature) : null,
        observedGravity: body.observedGravity ? parseFloat(body.observedGravity) : null,
        grossObservedVolume: body.grossObservedVolume ? parseFloat(body.grossObservedVolume) : null,
        grossStandardVolume: body.grossStandardVolume ? parseFloat(body.grossStandardVolume) : null,
        netStandardVolume: body.netStandardVolume ? parseFloat(body.netStandardVolume) : null,
        freeWaterVolume: body.freeWaterVolume ? parseFloat(body.freeWaterVolume) : null,
        vcf: body.vcf ? parseFloat(body.vcf) : 1.0,
        bsw: body.bsw ? parseFloat(body.bsw) : 0,
        gaugedBy: body.gaugedBy || (session.user as any)?.email,
        comments: body.comments,
      },
      include: { tank: true },
    });

    return NextResponse.json({ data: gauging }, { status: 201 });
  } catch (error) {
    console.error('Create tank gauging error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
