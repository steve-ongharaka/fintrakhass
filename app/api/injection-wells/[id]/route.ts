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

    const well = await prisma.injectionWell.findUnique({
      where: { id: params.id },
      include: {
        injectionData: { orderBy: { injectionDate: 'desc' }, take: 30 },
        injectionTests: { orderBy: { testDate: 'desc' } },
      },
    });

    if (!well) {
      return NextResponse.json({ error: 'Injection well not found' }, { status: 404 });
    }

    return NextResponse.json({ data: well });
  } catch (error) {
    console.error('Error fetching injection well:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const well = await prisma.injectionWell.update({
      where: { id: params.id },
      data: {
        ...body,
        completionDate: body.completionDate ? new Date(body.completionDate) : undefined,
        conversionDate: body.conversionDate ? new Date(body.conversionDate) : undefined,
      },
    });

    return NextResponse.json({ data: well });
  } catch (error) {
    console.error('Error updating injection well:', error);
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

    await prisma.injectionWell.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Injection well deleted' });
  } catch (error) {
    console.error('Error deleting injection well:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
