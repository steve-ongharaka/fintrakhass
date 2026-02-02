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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get MTD production totals
    const mtdProduction = await prisma.productionStd.aggregate({
      where: {
        productionDate: { gte: startOfMonth },
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

    // Get YTD production totals
    const ytdProduction = await prisma.productionStd.aggregate({
      where: {
        productionDate: { gte: startOfYear },
      },
      _sum: {
        netOilVolume: true,
        stdGasVolume: true,
        stdWaterVolume: true,
      },
    });

    // Get active wells count
    const activeWellsCount = await prisma.well.count({
      where: { status: 'active' },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalOilMTD: mtdProduction._sum?.netOilVolume ?? 0,
        totalOilYTD: ytdProduction._sum?.netOilVolume ?? 0,
        totalGasMTD: mtdProduction._sum?.stdGasVolume ?? 0,
        totalGasYTD: ytdProduction._sum?.stdGasVolume ?? 0,
        totalWaterMTD: mtdProduction._sum?.stdWaterVolume ?? 0,
        totalWaterYTD: ytdProduction._sum?.stdWaterVolume ?? 0,
        activeWellsCount,
        avgGOR: Math.round((mtdProduction._avg?.gor ?? 0) * 100) / 100,
        avgWaterCut: Math.round((mtdProduction._avg?.waterCut ?? 0) * 100) / 100,
        avgEfficiency: Math.round((mtdProduction._avg?.productionEfficiency ?? 0) * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Get KPIs error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch KPIs' }, { status: 500 });
  }
}
