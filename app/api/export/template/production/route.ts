import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create sample data with instructions
    const templateData = [
      {
        productionDate: '2026-01-27',
        wellId: 'BON-001',
        grossOilVolume: 100.5,
        grossGasVolume: 500.0,
        grossWaterVolume: 25.0,
        operatingHours: 24.0,
        sandWaterPercentage: 2.5,
        temperature: 85.0,
        comments: 'Normal operations',
      },
      {
        productionDate: '2026-01-27',
        wellId: 'BON-002',
        grossOilVolume: 150.0,
        grossGasVolume: 750.0,
        grossWaterVolume: 30.0,
        operatingHours: 24.0,
        sandWaterPercentage: 3.0,
        temperature: 82.0,
        comments: '',
      },
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Add instructions in a separate sheet
    const instructions = [
      { Column: 'productionDate', Description: 'Production date in YYYY-MM-DD format', Required: 'Yes', Example: '2026-01-27' },
      { Column: 'wellId', Description: 'Well identifier (must exist in system)', Required: 'Yes', Example: 'BON-001' },
      { Column: 'grossOilVolume', Description: 'Gross oil production in barrels', Required: 'No', Example: '100.5' },
      { Column: 'grossGasVolume', Description: 'Gross gas production in mscf', Required: 'No', Example: '500.0' },
      { Column: 'grossWaterVolume', Description: 'Gross water production in barrels', Required: 'No', Example: '25.0' },
      { Column: 'operatingHours', Description: 'Total operating hours for the day', Required: 'No', Example: '24.0' },
      { Column: 'sandWaterPercentage', Description: 'BSW percentage (0-100)', Required: 'No', Example: '2.5' },
      { Column: 'temperature', Description: 'Temperature in degrees Fahrenheit', Required: 'No', Example: '85.0' },
      { Column: 'comments', Description: 'Additional comments or notes', Required: 'No', Example: 'Normal operations' },
    ];

    const wsInstructions = XLSX.utils.json_to_sheet(instructions);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 22 },
      { wch: 15 },
      { wch: 25 },
    ];

    wsInstructions['!cols'] = [
      { wch: 25 },
      { wch: 50 },
      { wch: 10 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
    XLSX.utils.book_append_sheet(wb, ws, 'Production Template');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return file
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="production_import_template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Generate template error:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}
