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

    const tank = await prisma.tank.findUnique({
      where: { id: params.id },
      include: {
        facility: true,
        gaugings: { take: 10, orderBy: { gaugingDate: 'desc' } },
        stockMovements: { take: 10, orderBy: { movementDate: 'desc' } },
      },
    });

    if (!tank) {
      return NextResponse.json({ error: 'Tank not found' }, { status: 404 });
    }

    return NextResponse.json({ data: tank });
  } catch (error) {
    console.error('Get tank error:', error);
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
    const tank = await prisma.tank.update({
      where: { id: params.id },
      data: {
        tankName: body.tankName,
        tankType: body.tankType,
        facilityId: body.facilityId || null,
        location: body.location,
        product: body.product,
        nominalCapacity: body.nominalCapacity ? parseFloat(body.nominalCapacity) : null,
        workingCapacity: body.workingCapacity ? parseFloat(body.workingCapacity) : null,
        deadStock: body.deadStock ? parseFloat(body.deadStock) : null,
        shellHeight: body.shellHeight ? parseFloat(body.shellHeight) : null,
        diameter: body.diameter ? parseFloat(body.diameter) : null,
        roofType: body.roofType,
        heatingSystem: body.heatingSystem,
        status: body.status,
        lastInspectionDate: body.lastInspectionDate ? new Date(body.lastInspectionDate) : null,
        nextInspectionDate: body.nextInspectionDate ? new Date(body.nextInspectionDate) : null,
        calibrationTableId: body.calibrationTableId,
        comments: body.comments,
      },
      include: { facility: true },
    });

    return NextResponse.json({ data: tank });
  } catch (error) {
    console.error('Update tank error:', error);
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

    await prisma.tank.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Tank deleted successfully' });
  } catch (error) {
    console.error('Delete tank error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
