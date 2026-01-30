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
    const status = searchParams.get('status');

    const where: any = {};
    if (meterId && meterId !== 'all') where.meterId = meterId;
    if (status && status !== 'all') where.status = status;

    const calibrations = await prisma.meterCalibration.findMany({
      where,
      include: { meter: true },
      orderBy: { calibrationDate: 'desc' },
    });

    return NextResponse.json({ data: calibrations });
  } catch (error) {
    console.error('Get calibrations error:', error);
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
    const calibration = await prisma.meterCalibration.create({
      data: {
        meterId: body.meterId,
        calibrationDate: new Date(body.calibrationDate),
        status: body.status || 'scheduled',
        calibrationType: body.calibrationType,
        performedBy: body.performedBy,
        certificationNumber: body.certificationNumber,
        preCalibrationError: body.preCalibrationError ? parseFloat(body.preCalibrationError) : null,
        postCalibrationError: body.postCalibrationError ? parseFloat(body.postCalibrationError) : null,
        oldKFactor: body.oldKFactor ? parseFloat(body.oldKFactor) : null,
        newKFactor: body.newKFactor ? parseFloat(body.newKFactor) : null,
        oldMeterFactor: body.oldMeterFactor ? parseFloat(body.oldMeterFactor) : null,
        newMeterFactor: body.newMeterFactor ? parseFloat(body.newMeterFactor) : null,
        adjustments: body.adjustments,
        certificateUrl: body.certificateUrl,
        nextCalibrationDate: body.nextCalibrationDate ? new Date(body.nextCalibrationDate) : null,
        comments: body.comments,
      },
      include: { meter: true },
    });

    // Update meter's last/next calibration dates
    if (body.status === 'completed') {
      await prisma.meter.update({
        where: { id: body.meterId },
        data: {
          lastCalibrationDate: new Date(body.calibrationDate),
          nextCalibrationDate: body.nextCalibrationDate ? new Date(body.nextCalibrationDate) : null,
          kFactor: body.newKFactor ? parseFloat(body.newKFactor) : undefined,
        },
      });
    }

    return NextResponse.json({ data: calibration }, { status: 201 });
  } catch (error) {
    console.error('Create calibration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
