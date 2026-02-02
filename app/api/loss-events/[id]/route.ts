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
    const event = await prisma.lossEvent.update({
      where: { id: params.id },
      data: {
        ...body,
        eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
        investigationDate: body.investigationDate ? new Date(body.investigationDate) : undefined,
        recoveryDate: body.recoveryDate ? new Date(body.recoveryDate) : undefined,
      },
    });

    return NextResponse.json({ data: event });
  } catch (error) {
    console.error('Error updating loss event:', error);
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

    await prisma.lossEvent.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Loss event deleted' });
  } catch (error) {
    console.error('Error deleting loss event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
