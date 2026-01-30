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
    const pointType = searchParams.get('pointType');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (pointType && pointType !== 'all') where.pointType = pointType;
    if (isActive !== null && isActive !== 'all') where.isActive = isActive === 'true';

    const fiscalPoints = await prisma.fiscalMeteringPoint.findMany({
      where,
      include: {
        meter: true,
        _count: {
          select: { custodyTransfers: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: fiscalPoints });
  } catch (error) {
    console.error('Get fiscal points error:', error);
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
    const fiscalPoint = await prisma.fiscalMeteringPoint.create({
      data: {
        pointTag: body.pointTag,
        pointName: body.pointName,
        pointType: body.pointType || 'custody_transfer',
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
        currency: body.currency || 'USD',
        isActive: body.isActive !== false,
        comments: body.comments,
      },
      include: { meter: true },
    });

    return NextResponse.json({ data: fiscalPoint }, { status: 201 });
  } catch (error) {
    console.error('Create fiscal point error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
