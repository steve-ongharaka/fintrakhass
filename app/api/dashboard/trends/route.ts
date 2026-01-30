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
    const days = parseInt(searchParams.get('days') ?? '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily production trend
    const dailyProduction = await prisma.productionStd.groupBy({
      by: ['productionDate'],
      where: {
        productionDate: { gte: startDate },
      },
      _sum: {
        netOilVolume: true,
        stdGasVolume: true,
        stdWaterVolume: true,
      },
      orderBy: {
        productionDate: 'asc',
      },
    });

    const dailyTrend = dailyProduction.map((d: any) => ({
      date: d.productionDate.toISOString().split('T')[0],
      oil: Math.round((d._sum?.netOilVolume ?? 0) * 100) / 100,
      gas: Math.round((d._sum?.stdGasVolume ?? 0) * 100) / 100,
      water: Math.round((d._sum?.stdWaterVolume ?? 0) * 100) / 100,
    }));

    // Get top 10 producing wells
    const wellProduction = await prisma.productionStd.groupBy({
      by: ['wellId'],
      where: {
        productionDate: { gte: startDate },
      },
      _sum: {
        netOilVolume: true,
        stdGasVolume: true,
        stdWaterVolume: true,
      },
      orderBy: {
        _sum: {
          netOilVolume: 'desc',
        },
      },
      take: 10,
    });

    const wellIds = wellProduction.map((w: any) => w.wellId);
    const wells = await prisma.well.findMany({
      where: { id: { in: wellIds } },
      select: { id: true, wellName: true },
    });
    const wellMap = Object.fromEntries(wells.map((w: any) => [w.id, w.wellName]));

    const topWells = wellProduction.map((w: any) => ({
      wellName: wellMap[w.wellId] ?? 'Unknown',
      oil: Math.round((w._sum?.netOilVolume ?? 0) * 100) / 100,
      gas: Math.round((w._sum?.stdGasVolume ?? 0) * 100) / 100,
      water: Math.round((w._sum?.stdWaterVolume ?? 0) * 100) / 100,
    }));

    // Get production by field
    const fieldProduction = await prisma.$queryRaw<
      { field: string | null; total_oil: number | null }[]
    >`
      SELECT w.field, SUM(ps."netOilVolume") as total_oil
      FROM production_std ps
      JOIN wells w ON ps."wellId" = w.id
      WHERE ps."productionDate" >= ${startDate}
      GROUP BY w.field
      ORDER BY total_oil DESC
    `;

    const byField = (fieldProduction ?? []).map((f: any) => ({
      field: f?.field ?? 'Unknown',
      value: Math.round(Number(f?.total_oil ?? 0) * 100) / 100,
    }));

    // Get well status distribution
    const statusDistribution = await prisma.well.groupBy({
      by: ['status'],
      _count: true,
    });

    const wellStatus = statusDistribution.map((s: any) => ({
      status: s.status,
      count: s._count,
    }));

    // Get GOR and Water Cut trends
    const gorWaterCutTrend = await prisma.productionStd.groupBy({
      by: ['productionDate'],
      where: {
        productionDate: { gte: startDate },
      },
      _avg: {
        gor: true,
        waterCut: true,
      },
      orderBy: {
        productionDate: 'asc',
      },
    });

    const gorTrend = gorWaterCutTrend.map((d: any) => ({
      date: d.productionDate.toISOString().split('T')[0],
      gor: Math.round((d._avg?.gor ?? 0) * 100) / 100,
      waterCut: Math.round((d._avg?.waterCut ?? 0) * 100) / 100,
    }));

    return NextResponse.json({
      success: true,
      data: {
        dailyTrend,
        topWells,
        byField,
        wellStatus,
        gorTrend,
      },
    });
  } catch (error) {
    console.error('Get trends error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch trends' }, { status: 500 });
  }
}
