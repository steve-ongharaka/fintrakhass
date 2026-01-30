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
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') ?? (new Date().getMonth() + 1).toString());
    const wellId = searchParams.get('wellId');
    const field = searchParams.get('field');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const where: any = {
      productionDate: { gte: startDate, lte: endDate },
    };

    if (wellId) where.wellId = wellId;
    if (field) where.well = { field };

    // Get production by well
    const wellProduction = await prisma.productionStd.groupBy({
      by: ['wellId'],
      where,
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
      _count: true,
    });

    const wellIds = wellProduction.map((w: any) => w.wellId);
    const wells = await prisma.well.findMany({
      where: { id: { in: wellIds } },
      include: { facility: true },
    });
    const wellMap = Object.fromEntries(wells.map((w: any) => [w.id, w]));

    const byWell = wellProduction.map((w: any) => {
      const well = wellMap[w.wellId];
      return {
        wellId: w.wellId,
        wellName: well?.wellName ?? 'Unknown',
        field: well?.field ?? 'Unknown',
        facility: well?.facility?.facilityName ?? 'Unknown',
        totalOil: Math.round((w._sum?.netOilVolume ?? 0) * 100) / 100,
        totalGas: Math.round((w._sum?.stdGasVolume ?? 0) * 100) / 100,
        totalWater: Math.round((w._sum?.stdWaterVolume ?? 0) * 100) / 100,
        avgGOR: Math.round((w._avg?.gor ?? 0) * 100) / 100,
        avgWaterCut: Math.round((w._avg?.waterCut ?? 0) * 100) / 100,
        avgEfficiency: Math.round((w._avg?.productionEfficiency ?? 0) * 100) / 100,
        daysProduced: w._count,
      };
    });

    // Get totals
    const totals = await prisma.productionStd.aggregate({
      where,
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

    // Get production by field
    const fieldProductionRaw = await prisma.$queryRaw<
      { field: string | null; total_oil: number | null; total_gas: number | null; total_water: number | null }[]
    >`
      SELECT w.field, 
             SUM(ps."netOilVolume") as total_oil,
             SUM(ps."stdGasVolume") as total_gas,
             SUM(ps."stdWaterVolume") as total_water
      FROM production_std ps
      JOIN wells w ON ps."wellId" = w.id
      WHERE ps."productionDate" >= ${startDate} AND ps."productionDate" <= ${endDate}
      GROUP BY w.field
      ORDER BY total_oil DESC
    `;

    const byField = (fieldProductionRaw ?? []).map((f: any) => ({
      field: f?.field ?? 'Unknown',
      totalOil: Math.round(Number(f?.total_oil ?? 0) * 100) / 100,
      totalGas: Math.round(Number(f?.total_gas ?? 0) * 100) / 100,
      totalWater: Math.round(Number(f?.total_water ?? 0) * 100) / 100,
    }));

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        byWell,
        byField,
        totals: {
          totalOil: Math.round((totals._sum?.netOilVolume ?? 0) * 100) / 100,
          totalGas: Math.round((totals._sum?.stdGasVolume ?? 0) * 100) / 100,
          totalWater: Math.round((totals._sum?.stdWaterVolume ?? 0) * 100) / 100,
          avgGOR: Math.round((totals._avg?.gor ?? 0) * 100) / 100,
          avgWaterCut: Math.round((totals._avg?.waterCut ?? 0) * 100) / 100,
          avgEfficiency: Math.round((totals._avg?.productionEfficiency ?? 0) * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch monthly report' }, { status: 500 });
  }
}
