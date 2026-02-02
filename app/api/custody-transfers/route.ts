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
    const fiscalPointId = searchParams.get('fiscalPointId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (fiscalPointId && fiscalPointId !== 'all') where.fiscalPointId = fiscalPointId;
    if (status && status !== 'all') where.status = status;
    if (startDate) where.transferDate = { ...where.transferDate, gte: new Date(startDate) };
    if (endDate) where.transferDate = { ...where.transferDate, lte: new Date(endDate) };

    const transfers = await prisma.custodyTransfer.findMany({
      where,
      include: { fiscalPoint: true },
      orderBy: { transferDate: 'desc' },
      take: 500,
    });

    return NextResponse.json({ data: transfers });
  } catch (error) {
    console.error('Get custody transfers error:', error);
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
    const transfer = await prisma.custodyTransfer.create({
      data: {
        fiscalPointId: body.fiscalPointId,
        transferDate: new Date(body.transferDate),
        ticketNumber: body.ticketNumber,
        status: body.status || 'pending',
        product: body.product,
        grossObservedVolume: body.grossObservedVolume ? parseFloat(body.grossObservedVolume) : 0,
        grossStandardVolume: body.grossStandardVolume ? parseFloat(body.grossStandardVolume) : 0,
        netStandardVolume: body.netStandardVolume ? parseFloat(body.netStandardVolume) : 0,
        temperature: body.temperature ? parseFloat(body.temperature) : null,
        pressure: body.pressure ? parseFloat(body.pressure) : null,
        density: body.density ? parseFloat(body.density) : null,
        apiGravity: body.apiGravity ? parseFloat(body.apiGravity) : null,
        bsw: body.bsw ? parseFloat(body.bsw) : 0,
        vcf: body.vcf ? parseFloat(body.vcf) : 1.0,
        cpf: body.cpf ? parseFloat(body.cpf) : 1.0,
        shrinkageFactor: body.shrinkageFactor ? parseFloat(body.shrinkageFactor) : 1.0,
        meterFactor: body.meterFactor ? parseFloat(body.meterFactor) : 1.0,
        openingMeterReading: body.openingMeterReading ? parseFloat(body.openingMeterReading) : null,
        closingMeterReading: body.closingMeterReading ? parseFloat(body.closingMeterReading) : null,
        massKg: body.massKg ? parseFloat(body.massKg) : null,
        energyMmbtu: body.energyMmbtu ? parseFloat(body.energyMmbtu) : null,
        buyer: body.buyer,
        seller: body.seller,
        witnessedByBuyer: body.witnessedByBuyer,
        witnessedBySeller: body.witnessedBySeller,
        bolNumber: body.bolNumber,
        invoiceNumber: body.invoiceNumber,
        invoiceAmount: body.invoiceAmount ? parseFloat(body.invoiceAmount) : null,
        paymentStatus: body.paymentStatus || 'pending',
        disputeNotes: body.disputeNotes,
        comments: body.comments,
      },
      include: { fiscalPoint: true },
    });

    return NextResponse.json({ data: transfer }, { status: 201 });
  } catch (error) {
    console.error('Create custody transfer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
