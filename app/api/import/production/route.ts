import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { parse } from 'csv-parse/sync';

interface ProductionRow {
  productionDate: string;
  wellId: string;
  grossOilVolume?: string;
  grossGasVolume?: string;
  grossWaterVolume?: string;
  operatingHours?: string;
  sandWaterPercentage?: string;
  temperature?: string;
  comments?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin' && userRole !== 'operator') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileContent = await file.text();
    const records: ProductionRow[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Create import record
    const importRecord = await prisma.dataImport.create({
      data: {
        importType: 'production',
        fileName: file.name,
        status: 'processing',
        recordsTotal: records.length,
        importedById: (session.user as any)?.id,
      },
    });

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const [index, record] of records.entries()) {
      try {
        // Validate required fields
        if (!record.productionDate || !record.wellId) {
          throw new Error('Missing required fields: productionDate and wellId');
        }

        // Check if well exists
        const well = await prisma.well.findFirst({
          where: { wellId: record.wellId },
        });

        if (!well) {
          throw new Error(`Well ${record.wellId} not found`);
        }

        // Create or update production record
        await prisma.productionFdc.upsert({
          where: {
            wellId_productionDate: {
              wellId: well.id,
              productionDate: new Date(record.productionDate),
            },
          },
          update: {
            grossOilVolume: record.grossOilVolume ? parseFloat(record.grossOilVolume) : 0,
            grossGasVolume: record.grossGasVolume ? parseFloat(record.grossGasVolume) : 0,
            grossWaterVolume: record.grossWaterVolume ? parseFloat(record.grossWaterVolume) : 0,
            operatingHours: record.operatingHours ? parseFloat(record.operatingHours) : 0,
            sandWaterPercentage: record.sandWaterPercentage ? parseFloat(record.sandWaterPercentage) : 0,
            temperature: record.temperature ? parseFloat(record.temperature) : null,
            comments: record.comments || null,
            createdById: (session.user as any)?.id,
          },
          create: {
            productionDate: new Date(record.productionDate),
            wellId: well.id,
            grossOilVolume: record.grossOilVolume ? parseFloat(record.grossOilVolume) : 0,
            grossGasVolume: record.grossGasVolume ? parseFloat(record.grossGasVolume) : 0,
            grossWaterVolume: record.grossWaterVolume ? parseFloat(record.grossWaterVolume) : 0,
            operatingHours: record.operatingHours ? parseFloat(record.operatingHours) : 0,
            sandWaterPercentage: record.sandWaterPercentage ? parseFloat(record.sandWaterPercentage) : 0,
            temperature: record.temperature ? parseFloat(record.temperature) : null,
            comments: record.comments || null,
            createdById: (session.user as any)?.id,
          },
        });

        successCount++;
      } catch (error: any) {
        failedCount++;
        errors.push(`Row ${index + 2}: ${error.message}`);
      }
    }

    // Update import record
    await prisma.dataImport.update({
      where: { id: importRecord.id },
      data: {
        status: failedCount === records.length ? 'failed' : 'completed',
        recordsSuccessful: successCount,
        recordsFailed: failedCount,
        errorLog: errors.length > 0 ? errors.join('\n') : null,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      importId: importRecord.id,
      recordsTotal: records.length,
      recordsSuccessful: successCount,
      recordsFailed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import production data error:', error);
    return NextResponse.json(
      { error: 'Failed to import production data' },
      { status: 500 }
    );
  }
}
