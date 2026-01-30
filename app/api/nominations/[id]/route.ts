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

    const userRole = (session.user as any)?.role;
    if (!['admin', 'operator'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const nomination = await prisma.nomination.update({
      where: { id: params.id },
      data: {
        ...body,
        nominationDate: body.nominationDate ? new Date(body.nominationDate) : undefined,
        nominationMonth: body.nominationMonth ? new Date(body.nominationMonth) : undefined,
        confirmedAt: body.status === 'confirmed' ? new Date() : undefined,
        confirmedBy: body.status === 'confirmed' ? (session.user as any)?.email : undefined,
      },
      include: { liftings: true },
    });

    return NextResponse.json({ data: nomination });
  } catch (error) {
    console.error('Error updating nomination:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await prisma.nomination.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Nomination deleted' });
  } catch (error) {
    console.error('Error deleting nomination:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
