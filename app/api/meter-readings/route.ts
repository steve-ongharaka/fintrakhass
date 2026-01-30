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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (meterId && meterId !== 'all') where.meterId = meterId;
    if (startDate) where.readingDate = { ...where.readingDate, gte: new Date(startDate) };
    if (endDate) where.readingDate = { ...where.readingDate, lte: new Date(endDate) };

    const readings = await prisma.meterReading.findMany({
      where,
      include: { meter: true },
      orderBy: { readingDate: 'desc' },
      take: 500,
    });

    return NextResponse.json({ data: readings });
  } catch (error) {
    console.error('Get meter readings error:', error);
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
    const reading = await prisma.meterReading.create({
      data: {
        meterId: body.meterId,
        readingDate: new Date(body.readingDate),
        grossVolume: body.grossVolume ? parseFloat(body.grossVolume) : 0,
        netVolume: body.netVolume ? parseFloat(body.netVolume) : 0,
        flowRate: body.flowRate ? parseFloat(body.flowRate) : 0,
        temperature: body.temperature ? parseFloat(body.temperature) : null,
        pressure: body.pressure ? parseFloat(body.pressure) : null,
        density: body.density ? parseFloat(body.density) : null,
        bsw: body.bsw ? parseFloat(body.bsw) : 0,
        meterFactor: body.meterFactor ? parseFloat(body.meterFactor) : 1.0,
        vcf: body.vcf ? parseFloat(body.vcf) : 1.0,
        ctpl: body.ctpl ? parseFloat(body.ctpl) : 1.0,
        comments: body.comments,
        recordedBy: (session.user as any)?.email,
      },
      include: { meter: true },
    });

    return NextResponse.json({ data: reading }, { status: 201 });
  } catch (error) {
    console.error('Create meter reading error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
