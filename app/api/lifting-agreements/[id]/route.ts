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
    const agreement = await prisma.liftingAgreement.update({
      where: { id: params.id },
      data: {
        ...body,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      },
    });

    return NextResponse.json({ data: agreement });
  } catch (error) {
    console.error('Error updating lifting agreement:', error);
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

    await prisma.liftingAgreement.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Lifting agreement deleted' });
  } catch (error) {
    console.error('Error deleting lifting agreement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
