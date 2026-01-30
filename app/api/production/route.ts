export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { productionFdcSchema } from '@/lib/validations';
import { calculateStandardizedProduction } from '@/lib/calculations';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const pageSize = parseInt(searchParams.get('pageSize') ?? '50');
    const wellId = searchParams.get('wellId');
    const field = searchParams.get('field');
    const facilityId = searchParams.get('facilityId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    
    if (wellId) where.wellId = wellId;
    if (field) where.well = { field };
    if (facilityId) where.well = { ...where.well, facilityId };
    if (startDate || endDate) {
      where.productionDate = {};
      if (startDate) where.productionDate.gte = new Date(startDate);
      if (endDate) where.productionDate.lte = new Date(endDate);
    }

    const [productions, total] = await Promise.all([
      prisma.productionFdc.findMany({
        where,
        include: {
          well: { include: { facility: true } },
          productionStd: true,
          createdBy: { select: { firstName: true, lastName: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ productionDate: 'desc' }, { well: { wellName: 'asc' } }],
      }),
      prisma.productionFdc.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: productions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Get production error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch production data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role === 'viewer') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = productionFdcSchema.parse(body);

    // Check for duplicate entry
    const existing = await prisma.productionFdc.findUnique({
      where: {
        wellId_productionDate: {
          wellId: validatedData.wellId,
          productionDate: validatedData.productionDate,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Production entry already exists for this well and date' },
        { status: 400 }
      );
    }

    // Calculate standardized values
    const stdValues = calculateStandardizedProduction(validatedData);

    // Create production entry with standardized values
    const production = await prisma.productionFdc.create({
      data: {
        ...validatedData,
        createdById: (session.user as any)?.id,
        productionStd: {
          create: {
            productionDate: validatedData.productionDate,
            wellId: validatedData.wellId,
            ...stdValues,
          },
        },
      },
      include: {
        well: { include: { facility: true } },
        productionStd: true,
      },
    });

    return NextResponse.json({ success: true, data: production }, { status: 201 });
  } catch (error: any) {
    console.error('Create production error:', error);
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: error?.errors?.[0]?.message ?? 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to create production entry' }, { status: 500 });
  }
}
