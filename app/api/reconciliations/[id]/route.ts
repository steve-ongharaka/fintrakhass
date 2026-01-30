import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reconciliation = await prisma.balanceReconciliation.findUnique({
      where: { id: params.id },
      include: {
        imbalances: { orderBy: { imbalanceDate: 'desc' } },
      },
    });

    if (!reconciliation) {
      return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 });
    }

    return NextResponse.json({ data: reconciliation });
  } catch (error) {
    console.error('Get reconciliation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (!['admin', 'operator'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    // Handle status updates
    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'approved') {
        updateData.approvedBy = (session.user as any)?.email;
        updateData.approvedAt = new Date();
      } else if (body.status === 'pending_review') {
        updateData.reviewedBy = (session.user as any)?.email;
      }
    }

    if (body.comments !== undefined) updateData.comments = body.comments;

    const reconciliation = await prisma.balanceReconciliation.update({
      where: { id: params.id },
      data: updateData,
      include: { imbalances: true },
    });

    return NextResponse.json({ data: reconciliation });
  } catch (error) {
    console.error('Update reconciliation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await prisma.balanceReconciliation.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Reconciliation deleted successfully' });
  } catch (error) {
    console.error('Delete reconciliation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
