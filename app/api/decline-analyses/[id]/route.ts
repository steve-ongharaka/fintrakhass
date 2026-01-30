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
    const analysis = await prisma.declineAnalysis.update({
      where: { id: params.id },
      data: {
        ...body,
        dataStartDate: body.dataStartDate ? new Date(body.dataStartDate) : undefined,
        dataEndDate: body.dataEndDate ? new Date(body.dataEndDate) : undefined,
        forecastEndDate: body.forecastEndDate ? new Date(body.forecastEndDate) : undefined,
        approvedAt: body.approvedBy ? new Date() : undefined,
      },
    });

    return NextResponse.json({ data: analysis });
  } catch (error) {
    console.error('Error updating decline analysis:', error);
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

    await prisma.declineAnalysis.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Decline analysis deleted' });
  } catch (error) {
    console.error('Error deleting decline analysis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
