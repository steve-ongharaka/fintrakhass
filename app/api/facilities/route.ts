export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { facilitySchema } from '@/lib/validations';
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
    const facilityType = searchParams.get('facilityType');
    const all = searchParams.get('all');

    const where: any = {};
    
    if (search) {
      where.OR = [
        { facilityName: { contains: search, mode: 'insensitive' } },
        { facilityId: { contains: search, mode: 'insensitive' } },
        { field: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (status) where.status = status;
    if (facilityType) where.facilityType = facilityType;

    if (all === 'true') {
      const facilities = await prisma.facility.findMany({
        where,
        orderBy: { facilityName: 'asc' },
      });
      return NextResponse.json({ success: true, data: facilities });
    }

    const [facilities, total] = await Promise.all([
      prisma.facility.findMany({
        where,
        include: { wells: { select: { id: true, wellName: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.facility.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: facilities,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Get facilities error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch facilities' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role === 'viewer') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = facilitySchema.parse(body);

    const existing = await prisma.facility.findUnique({
      where: { facilityId: validatedData.facilityId },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Facility ID already exists' }, { status: 400 });
    }

    const facility = await prisma.facility.create({
      data: validatedData,
    });

    // Create audit log for facility creation
    const userInfo = getUserInfoFromSession(session);
    await createAuditLog({
      ...userInfo,
      action: 'create',
      entityType: 'Facility',
      entityId: facility.id,
      entityName: facility.facilityName,
      description: `Created new facility: ${facility.facilityName} (${facility.facilityId})`,
      newValues: validatedData,
      requestPath: '/api/facilities',
    });

    return NextResponse.json({ success: true, data: facility }, { status: 201 });
  } catch (error: any) {
    console.error('Create facility error:', error);
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: error?.errors?.[0]?.message ?? 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to create facility' }, { status: 500 });
  }
}
