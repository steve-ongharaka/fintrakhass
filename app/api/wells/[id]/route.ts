export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { wellSchema } from '@/lib/validations';
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

    const well = await prisma.well.findUnique({
      where: { id: params.id },
      include: { facility: true },
    });

    if (!well) {
      return NextResponse.json({ success: false, error: 'Well not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: well });
  } catch (error) {
    console.error('Get well error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch well' }, { status: 500 });
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
    const validatedData = wellSchema.parse(body);

    // Get previous values for audit log
    const previousWell = await prisma.well.findUnique({
      where: { id: params.id },
    });

    // Check if wellId conflicts with another well
    const existing = await prisma.well.findFirst({
      where: {
        wellId: validatedData.wellId,
        NOT: { id: params.id },
      },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Well ID already exists' }, { status: 400 });
    }

    const well = await prisma.well.update({
      where: { id: params.id },
      data: validatedData,
      include: { facility: true },
    });

    // Create audit log for well update
    const userInfo = getUserInfoFromSession(session);
    await createAuditLog({
      ...userInfo,
      action: 'update',
      entityType: 'Well',
      entityId: well.id,
      entityName: well.wellName,
      description: `Updated well: ${well.wellName} (${well.wellId})`,
      previousValues: previousWell || undefined,
      newValues: validatedData,
      requestPath: `/api/wells/${params.id}`,
    });

    return NextResponse.json({ success: true, data: well });
  } catch (error: any) {
    console.error('Update well error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Well not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update well' }, { status: 500 });
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

    // Get well info before deletion for audit log
    const deletedWell = await prisma.well.findUnique({
      where: { id: params.id },
    });

    await prisma.well.delete({
      where: { id: params.id },
    });

    // Create audit log for well deletion
    const userInfo = getUserInfoFromSession(session);
    await createAuditLog({
      ...userInfo,
      action: 'delete',
      entityType: 'Well',
      entityId: params.id,
      entityName: deletedWell?.wellName || params.id,
      description: `Deleted well: ${deletedWell?.wellName || params.id} (${deletedWell?.wellId || 'unknown'})`,
      previousValues: deletedWell || undefined,
      requestPath: `/api/wells/${params.id}`,
    });

    return NextResponse.json({ success: true, message: 'Well deleted successfully' });
  } catch (error: any) {
    console.error('Delete well error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Well not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to delete well' }, { status: 500 });
  }
}
