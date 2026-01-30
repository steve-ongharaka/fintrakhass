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
    const tankId = searchParams.get('tankId');
    const movementType = searchParams.get('movementType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (tankId && tankId !== 'all') where.tankId = tankId;
    if (movementType && movementType !== 'all') where.movementType = movementType;
    if (startDate) where.movementDate = { ...where.movementDate, gte: new Date(startDate) };
    if (endDate) where.movementDate = { ...where.movementDate, lte: new Date(endDate) };

    const movements = await prisma.stockMovement.findMany({
      where,
      include: { tank: true },
      orderBy: { movementDate: 'desc' },
      take: 500,
    });

    return NextResponse.json({ data: movements });
  } catch (error) {
    console.error('Get stock movements error:', error);
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
    const movement = await prisma.stockMovement.create({
      data: {
        movementDate: new Date(body.movementDate),
        movementType: body.movementType,
        tankId: body.tankId || null,
        destinationTankId: body.destinationTankId,
        sourceDocument: body.sourceDocument,
        grossVolume: body.grossVolume ? parseFloat(body.grossVolume) : 0,
        netVolume: body.netVolume ? parseFloat(body.netVolume) : 0,
        temperature: body.temperature ? parseFloat(body.temperature) : null,
        density: body.density ? parseFloat(body.density) : null,
        apiGravity: body.apiGravity ? parseFloat(body.apiGravity) : null,
        bsw: body.bsw ? parseFloat(body.bsw) : 0,
        vcf: body.vcf ? parseFloat(body.vcf) : 1.0,
        product: body.product,
        carrier: body.carrier,
        vehicleId: body.vehicleId,
        sealNumbers: body.sealNumbers,
        comments: body.comments,
        recordedBy: (session.user as any)?.email,
      },
      include: { tank: true },
    });

    return NextResponse.json({ data: movement }, { status: 201 });
  } catch (error) {
    console.error('Create stock movement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
