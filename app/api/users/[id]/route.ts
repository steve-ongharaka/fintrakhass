export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { z } from 'zod';
import { createAuditLog, getUserInfoFromSession } from '@/lib/audit-logger';

const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'operator', 'viewer']).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    // Get previous values for audit log
    const previousUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { firstName: true, lastName: true, role: true, email: true },
    });

    const user = await prisma.user.update({
      where: { id: params.id },
      data: validatedData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    // Create audit log for user update
    const userInfo = getUserInfoFromSession(session);
    const changedFields = Object.keys(validatedData).filter(
      key => (validatedData as any)[key] !== (previousUser as any)?.[key]
    );
    await createAuditLog({
      ...userInfo,
      action: 'update',
      entityType: 'User',
      entityId: user.id,
      entityName: user.email,
      description: `Updated user: ${user.email}`,
      previousValues: previousUser || undefined,
      newValues: { firstName: user.firstName, lastName: user.lastName, role: user.role },
      changedFields,
      requestPath: `/api/users/${params.id}`,
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Update user error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
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

    // Prevent self-deletion
    if ((session.user as any)?.id === params.id) {
      return NextResponse.json({ success: false, error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Get user info before deletion for audit log
    const deletedUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { email: true, firstName: true, lastName: true, role: true },
    });

    await prisma.user.delete({
      where: { id: params.id },
    });

    // Create audit log for user deletion
    const userInfo = getUserInfoFromSession(session);
    await createAuditLog({
      ...userInfo,
      action: 'delete',
      entityType: 'User',
      entityId: params.id,
      entityName: deletedUser?.email || params.id,
      description: `Deleted user: ${deletedUser?.email || params.id}`,
      previousValues: deletedUser || undefined,
      requestPath: `/api/users/${params.id}`,
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
  }
}
