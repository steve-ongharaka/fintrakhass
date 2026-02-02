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
    const reconciliationType = searchParams.get('reconciliationType');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (reconciliationType && reconciliationType !== 'all') where.reconciliationType = reconciliationType;
    if (status && status !== 'all') where.status = status;
    if (startDate) where.periodStart = { ...where.periodStart, gte: new Date(startDate) };
    if (endDate) where.periodEnd = { ...where.periodEnd, lte: new Date(endDate) };

    const reconciliations = await prisma.balanceReconciliation.findMany({
      where,
      include: {
        _count: {
          select: { imbalances: true },
        },
      },
      orderBy: { reconciliationDate: 'desc' },
    });

    return NextResponse.json({ data: reconciliations });
  } catch (error) {
    console.error('Get reconciliations error:', error);
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
    
    // Calculate imbalance
    const totalProduction = parseFloat(body.totalProduction || 0);
    const openingStock = parseFloat(body.openingStock || 0);
    const closingStock = parseFloat(body.closingStock || 0);
    const totalSales = parseFloat(body.totalSales || 0);
    const totalTransfersIn = parseFloat(body.totalTransfersIn || 0);
    const totalTransfersOut = parseFloat(body.totalTransfersOut || 0);
    const flaring = parseFloat(body.flaring || 0);
    const venting = parseFloat(body.venting || 0);
    const fuelAndLoss = parseFloat(body.fuelAndLoss || 0);
    const spillage = parseFloat(body.spillage || 0);
    const shrinkage = parseFloat(body.shrinkage || 0);
    const otherLosses = parseFloat(body.otherLosses || 0);
    const adjustments = parseFloat(body.adjustments || 0);
    
    const stockChange = closingStock - openingStock;
    const totalLosses = flaring + venting + fuelAndLoss + spillage + shrinkage + otherLosses;
    
    // Expected balance: Production + TransfersIn = Sales + TransfersOut + Losses + StockChange
    const calculatedBalance = totalProduction + totalTransfersIn + openingStock + adjustments;
    const actualBalance = totalSales + totalTransfersOut + totalLosses + closingStock;
    const imbalance = calculatedBalance - actualBalance;
    const imbalancePercent = calculatedBalance > 0 ? (imbalance / calculatedBalance) * 100 : 0;
    const tolerancePercent = parseFloat(body.tolerancePercent || 0.5);
    const withinTolerance = Math.abs(imbalancePercent) <= tolerancePercent;

    const reconciliation = await prisma.balanceReconciliation.create({
      data: {
        reconciliationDate: new Date(body.reconciliationDate),
        periodStart: new Date(body.periodStart),
        periodEnd: new Date(body.periodEnd),
        reconciliationType: body.reconciliationType || 'monthly',
        status: body.status || 'draft',
        facilityId: body.facilityId,
        field: body.field,
        product: body.product,
        totalProduction,
        meterProduction: body.meterProduction ? parseFloat(body.meterProduction) : 0,
        allocatedProduction: body.allocatedProduction ? parseFloat(body.allocatedProduction) : 0,
        openingStock,
        closingStock,
        stockChange,
        totalSales,
        totalTransfersIn,
        totalTransfersOut,
        flaring,
        venting,
        fuelAndLoss,
        spillage,
        shrinkage,
        otherLosses,
        adjustments,
        calculatedBalance,
        actualBalance,
        imbalance,
        imbalancePercent,
        tolerancePercent,
        withinTolerance,
        preparedBy: (session.user as any)?.email,
        comments: body.comments,
      },
    });

    return NextResponse.json({ data: reconciliation }, { status: 201 });
  } catch (error) {
    console.error('Create reconciliation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
