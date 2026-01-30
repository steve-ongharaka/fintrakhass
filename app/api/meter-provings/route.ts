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
    const meterId = searchParams.get('meterId');

    const where: any = {};
    if (meterId && meterId !== 'all') where.meterId = meterId;

    const provings = await prisma.meterProving.findMany({
      where,
      include: { meter: true },
      orderBy: { provingDate: 'desc' },
    });

    return NextResponse.json({ data: provings });
  } catch (error) {
    console.error('Get provings error:', error);
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
    const proving = await prisma.meterProving.create({
      data: {
        meterId: body.meterId,
        provingDate: new Date(body.provingDate),
        proverType: body.proverType,
        proverVolume: body.proverVolume ? parseFloat(body.proverVolume) : null,
        runs: body.runs ? parseInt(body.runs) : 5,
        avgMeterFactor: body.avgMeterFactor ? parseFloat(body.avgMeterFactor) : null,
        repeatability: body.repeatability ? parseFloat(body.repeatability) : null,
        temperature: body.temperature ? parseFloat(body.temperature) : null,
        pressure: body.pressure ? parseFloat(body.pressure) : null,
        flowRate: body.flowRate ? parseFloat(body.flowRate) : null,
        passOrFail: body.passOrFail || 'pass',
        performedBy: body.performedBy,
        witnessedBy: body.witnessedBy,
        comments: body.comments,
      },
      include: { meter: true },
    });

    return NextResponse.json({ data: proving }, { status: 201 });
  } catch (error) {
    console.error('Create proving error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
