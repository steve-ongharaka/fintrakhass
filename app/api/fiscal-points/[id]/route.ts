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

    const fiscalPoint = await prisma.fiscalMeteringPoint.findUnique({
      where: { id: params.id },
      include: {
        meter: true,
        custodyTransfers: { take: 10, orderBy: { transferDate: 'desc' } },
      },
    });

    if (!fiscalPoint) {
      return NextResponse.json({ error: 'Fiscal point not found' }, { status: 404 });
    }

    return NextResponse.json({ data: fiscalPoint });
  } catch (error) {
    console.error('Get fiscal point error:', error);
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
    const fiscalPoint = await prisma.fiscalMeteringPoint.update({
      where: { id: params.id },
      data: {
        pointName: body.pointName,
        pointType: body.pointType,
        meterId: body.meterId || null,
        facilityId: body.facilityId,
        location: body.location,
        buyer: body.buyer,
        seller: body.seller,
        contractReference: body.contractReference,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        tolerancePercent: body.tolerancePercent ? parseFloat(body.tolerancePercent) : 0.5,
        pricePerUnit: body.pricePerUnit ? parseFloat(body.pricePerUnit) : null,
        currency: body.currency,
        isActive: body.isActive,
        comments: body.comments,
      },
      include: { meter: true },
    });

    return NextResponse.json({ data: fiscalPoint });
  } catch (error) {
    console.error('Update fiscal point error:', error);
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

    await prisma.fiscalMeteringPoint.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Fiscal point deleted successfully' });
  } catch (error) {
    console.error('Delete fiscal point error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
