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
    const facilityId = searchParams.get('facilityId');
    const status = searchParams.get('status');

    const where: any = {};
    if (facilityId && facilityId !== 'all') where.facilityId = facilityId;
    if (status && status !== 'all') where.status = status;

    const meters = await prisma.meter.findMany({
      where,
      include: {
        facility: true,
        _count: {
          select: {
            readings: true,
            calibrations: true,
            provings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: meters });
  } catch (error) {
    console.error('Get meters error:', error);
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
    const meter = await prisma.meter.create({
      data: {
        meterTag: body.meterTag,
        meterName: body.meterName,
        meterType: body.meterType || 'turbine',
        manufacturer: body.manufacturer,
        model: body.model,
        serialNumber: body.serialNumber,
        facilityId: body.facilityId || null,
        location: body.location,
        installationDate: body.installationDate ? new Date(body.installationDate) : null,
        status: body.status || 'active',
        minFlow: body.minFlow ? parseFloat(body.minFlow) : null,
        maxFlow: body.maxFlow ? parseFloat(body.maxFlow) : null,
        accuracy: body.accuracy ? parseFloat(body.accuracy) : null,
        kFactor: body.kFactor ? parseFloat(body.kFactor) : null,
        lastCalibrationDate: body.lastCalibrationDate ? new Date(body.lastCalibrationDate) : null,
        nextCalibrationDate: body.nextCalibrationDate ? new Date(body.nextCalibrationDate) : null,
        calibrationInterval: body.calibrationInterval ? parseInt(body.calibrationInterval) : 12,
        comments: body.comments,
      },
      include: { facility: true },
    });

    return NextResponse.json({ data: meter }, { status: 201 });
  } catch (error) {
    console.error('Create meter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
