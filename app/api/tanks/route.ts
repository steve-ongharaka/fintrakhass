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

    const tanks = await prisma.tank.findMany({
      where,
      include: {
        facility: true,
        _count: {
          select: {
            gaugings: true,
            stockMovements: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: tanks });
  } catch (error) {
    console.error('Get tanks error:', error);
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
    const tank = await prisma.tank.create({
      data: {
        tankTag: body.tankTag,
        tankName: body.tankName,
        tankType: body.tankType || 'fixed_roof',
        facilityId: body.facilityId || null,
        location: body.location,
        product: body.product,
        nominalCapacity: body.nominalCapacity ? parseFloat(body.nominalCapacity) : null,
        workingCapacity: body.workingCapacity ? parseFloat(body.workingCapacity) : null,
        deadStock: body.deadStock ? parseFloat(body.deadStock) : null,
        shellHeight: body.shellHeight ? parseFloat(body.shellHeight) : null,
        diameter: body.diameter ? parseFloat(body.diameter) : null,
        roofType: body.roofType,
        heatingSystem: body.heatingSystem || false,
        status: body.status || 'in_service',
        lastInspectionDate: body.lastInspectionDate ? new Date(body.lastInspectionDate) : null,
        nextInspectionDate: body.nextInspectionDate ? new Date(body.nextInspectionDate) : null,
        calibrationTableId: body.calibrationTableId,
        comments: body.comments,
      },
      include: { facility: true },
    });

    return NextResponse.json({ data: tank }, { status: 201 });
  } catch (error) {
    console.error('Create tank error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
