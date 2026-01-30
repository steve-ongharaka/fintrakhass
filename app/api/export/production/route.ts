import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const wellId = searchParams.get('wellId');

    const where: any = {};

    if (startDate || endDate) {
      where.productionDate = {};
      if (startDate) where.productionDate.gte = new Date(startDate);
      if (endDate) where.productionDate.lte = new Date(endDate);
    }

    if (wellId) where.wellId = wellId;

    const productions = await prisma.productionFdc.findMany({
      where,
      include: {
        well: {
          select: {
            wellName: true,
            wellId: true,
            field: true,
          },
        },
      },
      orderBy: { productionDate: 'desc' },
    });

    // Transform data for Excel
    const data = productions.map((p: any) => ({
      'Production Date': p.productionDate.toISOString().split('T')[0],
      'Well Name': p.well.wellName,
      'Well ID': p.well.wellId,
      'Field': p.well.field,
      'Gross Oil (bbl)': p.grossOilVolume || 0,
      'Gross Gas (mscf)': p.grossGasVolume || 0,
      'Gross Water (bbl)': p.grossWaterVolume || 0,
      'Operating Hours': p.operatingHours || 0,
      'BSW (%)': p.sandWaterPercentage || 0,
      'Temperature (°F)': p.temperature || '',
      'Comments': p.comments || '',
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Production Date
      { wch: 20 }, // Well Name
      { wch: 15 }, // Well ID
      { wch: 15 }, // Field
      { wch: 15 }, // Gross Oil
      { wch: 15 }, // Gross Gas
      { wch: 15 }, // Gross Water
      { wch: 15 }, // Operating Hours
      { wch: 10 }, // BSW
      { wch: 15 }, // Temperature
      { wch: 30 }, // Comments
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Production Data');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return file
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="production_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export production data error:', error);
    return NextResponse.json(
      { error: 'Failed to export production data' },
      { status: 500 }
    );
  }
}
