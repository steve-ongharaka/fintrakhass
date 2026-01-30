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
    const injectionWellId = searchParams.get('injectionWellId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (injectionWellId && injectionWellId !== 'all') where.injectionWellId = injectionWellId;
    if (startDate) where.injectionDate = { ...where.injectionDate, gte: new Date(startDate) };
    if (endDate) where.injectionDate = { ...where.injectionDate, lte: new Date(endDate) };

    const data = await prisma.injectionData.findMany({
      where,
      include: { injectionWell: true },
      orderBy: { injectionDate: 'desc' },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching injection data:', error);
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
    const data = await prisma.injectionData.create({
      data: {
        ...body,
        injectionDate: new Date(body.injectionDate),
        recordedBy: (session.user as any)?.email,
      },
      include: { injectionWell: true },
    });

    // Update cumulative injection on the well
    await prisma.injectionWell.update({
      where: { id: body.injectionWellId },
      data: {
        cumulativeInjection: { increment: body.injectionVolume || 0 },
        currentInjectionRate: body.injectionRate,
        currentPressure: body.injectionPressure,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating injection data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
