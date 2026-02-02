export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0];
    const wellId = searchParams.get('wellId');
    const field = searchParams.get('field');
    const facilityId = searchParams.get('facilityId');

    const where: any = {
      productionDate: new Date(date),
    };

    if (wellId) where.wellId = wellId;
    if (field) where.well = { field };
    if (facilityId) where.well = { ...where.well, facilityId };

    const productions = await prisma.productionFdc.findMany({
      where,
      include: {
        well: { include: { facility: true } },
        productionStd: true,
      },
      orderBy: { well: { wellName: 'asc' } },
    });

    const totals = await prisma.productionStd.aggregate({
      where: {
        productionDate: new Date(date),
        ...(wellId ? { wellId } : {}),
      },
      _sum: {
        netOilVolume: true,
        stdGasVolume: true,
        stdWaterVolume: true,
      },
      _avg: {
        gor: true,
        waterCut: true,
        productionEfficiency: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        date,
        productions,
        totals: {
          totalOil: totals._sum?.netOilVolume ?? 0,
          totalGas: totals._sum?.stdGasVolume ?? 0,
          totalWater: totals._sum?.stdWaterVolume ?? 0,
          avgGOR: Math.round((totals._avg?.gor ?? 0) * 100) / 100,
          avgWaterCut: Math.round((totals._avg?.waterCut ?? 0) * 100) / 100,
          avgEfficiency: Math.round((totals._avg?.productionEfficiency ?? 0) * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error('Get daily report error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch daily report' }, { status: 500 });
  }
}
