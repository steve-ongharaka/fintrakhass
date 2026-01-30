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
    const lifting = await prisma.lifting.update({
      where: { id: params.id },
      data: {
        ...body,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
        actualStartDate: body.actualStartDate ? new Date(body.actualStartDate) : undefined,
        actualEndDate: body.actualEndDate ? new Date(body.actualEndDate) : undefined,
      },
      include: { nomination: true },
    });

    return NextResponse.json({ data: lifting });
  } catch (error) {
    console.error('Error updating lifting:', error);
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

    await prisma.lifting.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Lifting deleted' });
  } catch (error) {
    console.error('Error deleting lifting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
