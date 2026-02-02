export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { facilitySchema } from '@/lib/validations';
import { createAuditLog, getUserInfoFromSession } from '@/lib/audit-logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const facility = await prisma.facility.findUnique({
      where: { id: params.id },
      include: { wells: true },
    });

    if (!facility) {
      return NextResponse.json({ success: false, error: 'Facility not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: facility });
  } catch (error) {
    console.error('Get facility error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch facility' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role === 'viewer') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = facilitySchema.parse(body);

    // Get previous values for audit log
    const previousFacility = await prisma.facility.findUnique({
      where: { id: params.id },
    });

    const existing = await prisma.facility.findFirst({
      where: {
        facilityId: validatedData.facilityId,
        NOT: { id: params.id },
      },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Facility ID already exists' }, { status: 400 });
    }

    const facility = await prisma.facility.update({
      where: { id: params.id },
      data: validatedData,
    });

    // Create audit log for facility update
    const userInfo = getUserInfoFromSession(session);
    await createAuditLog({
      ...userInfo,
      action: 'update',
      entityType: 'Facility',
      entityId: facility.id,
      entityName: facility.facilityName,
      description: `Updated facility: ${facility.facilityName} (${facility.facilityId})`,
      previousValues: previousFacility || undefined,
      newValues: validatedData,
      requestPath: `/api/facilities/${params.id}`,
    });

    return NextResponse.json({ success: true, data: facility });
  } catch (error: any) {
    console.error('Update facility error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Facility not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update facility' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get facility info before deletion for audit log
    const deletedFacility = await prisma.facility.findUnique({
      where: { id: params.id },
    });

    await prisma.facility.delete({
      where: { id: params.id },
    });

    // Create audit log for facility deletion
    const userInfo = getUserInfoFromSession(session);
    await createAuditLog({
      ...userInfo,
      action: 'delete',
      entityType: 'Facility',
      entityId: params.id,
      entityName: deletedFacility?.facilityName || params.id,
      description: `Deleted facility: ${deletedFacility?.facilityName || params.id} (${deletedFacility?.facilityId || 'unknown'})`,
      previousValues: deletedFacility || undefined,
      requestPath: `/api/facilities/${params.id}`,
    });

    return NextResponse.json({ success: true, message: 'Facility deleted successfully' });
  } catch (error: any) {
    console.error('Delete facility error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Facility not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to delete facility' }, { status: 500 });
  }
}
