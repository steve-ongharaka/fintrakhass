import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

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
    const transfer = await prisma.custodyTransfer.update({
      where: { id: params.id },
      data: {
        status: body.status,
        netStandardVolume: body.netStandardVolume ? parseFloat(body.netStandardVolume) : undefined,
        invoiceNumber: body.invoiceNumber,
        invoiceAmount: body.invoiceAmount ? parseFloat(body.invoiceAmount) : undefined,
        paymentStatus: body.paymentStatus,
        disputeNotes: body.disputeNotes,
        comments: body.comments,
      },
      include: { fiscalPoint: true },
    });

    return NextResponse.json({ data: transfer });
  } catch (error) {
    console.error('Update custody transfer error:', error);
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

    await prisma.custodyTransfer.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Custody transfer deleted successfully' });
  } catch (error) {
    console.error('Delete custody transfer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
