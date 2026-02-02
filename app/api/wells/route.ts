export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { wellSchema } from '@/lib/validations';
import { createAuditLog, getUserInfoFromSession } from '@/lib/audit-logger';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const pageSize = parseInt(searchParams.get('pageSize') ?? '50');
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status');
    const wellType = searchParams.get('wellType');
    const field = searchParams.get('field');
    const facilityId = searchParams.get('facilityId');

    const where: any = {};
    
    if (search) {
      where.OR = [
        { wellName: { contains: search, mode: 'insensitive' } },
        { wellId: { contains: search, mode: 'insensitive' } },
        { field: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (status) where.status = status;
    if (wellType) where.wellType = wellType;
    if (field) where.field = field;
    if (facilityId) where.facilityId = facilityId;

    const [wells, total] = await Promise.all([
      prisma.well.findMany({
        where,
        include: { facility: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.well.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: wells,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Get wells error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch wells' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role === 'viewer') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = wellSchema.parse(body);

    // Check for duplicate wellId
    const existing = await prisma.well.findUnique({
      where: { wellId: validatedData.wellId },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Well ID already exists' }, { status: 400 });
    }

    const well = await prisma.well.create({
      data: validatedData,
      include: { facility: true },
    });

    // Create audit log for well creation
    const userInfo = getUserInfoFromSession(session);
    await createAuditLog({
      ...userInfo,
      action: 'create',
      entityType: 'Well',
      entityId: well.id,
      entityName: well.wellName,
      description: `Created new well: ${well.wellName} (${well.wellId})`,
      newValues: validatedData,
      requestPath: '/api/wells',
    });

    return NextResponse.json({ success: true, data: well }, { status: 201 });
  } catch (error: any) {
    console.error('Create well error:', error);
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: error?.errors?.[0]?.message ?? 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to create well' }, { status: 500 });
  }
}
