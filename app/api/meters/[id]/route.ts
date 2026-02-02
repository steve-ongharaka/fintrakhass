import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meter = await prisma.meter.findUnique({
      where: { id: params.id },
      include: {
        facility: true,
        readings: { take: 10, orderBy: { readingDate: 'desc' } },
        calibrations: { take: 5, orderBy: { calibrationDate: 'desc' } },
        provings: { take: 5, orderBy: { provingDate: 'desc' } },
      },
    });

    if (!meter) {
      return NextResponse.json({ error: 'Meter not found' }, { status: 404 });
    }

    return NextResponse.json({ data: meter });
  } catch (error) {
    console.error('Get meter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
    const meter = await prisma.meter.update({
      where: { id: params.id },
      data: {
        meterName: body.meterName,
        meterType: body.meterType,
        manufacturer: body.manufacturer,
        model: body.model,
        serialNumber: body.serialNumber,
        facilityId: body.facilityId || null,
        location: body.location,
        installationDate: body.installationDate ? new Date(body.installationDate) : null,
        status: body.status,
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

    return NextResponse.json({ data: meter });
  } catch (error) {
    console.error('Update meter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await prisma.meter.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Meter deleted successfully' });
  } catch (error) {
    console.error('Delete meter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
