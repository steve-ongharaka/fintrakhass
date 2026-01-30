import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const month = searchParams.get('month');

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (month) where.nominationMonth = new Date(month);

    const nominations = await prisma.nomination.findMany({
      where,
      include: { liftings: true },
      orderBy: { nominationDate: 'desc' },
    });

    return NextResponse.json({ data: nominations });
  } catch (error) {
    console.error('Error fetching nominations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const nominationNumber = `NOM-${Date.now()}`;

    const nomination = await prisma.nomination.create({
      data: {
        ...body,
        nominationNumber,
        nominationDate: new Date(body.nominationDate),
        nominationMonth: new Date(body.nominationMonth),
        submittedAt: body.status === 'submitted' ? new Date() : null,
        submittedBy: body.status === 'submitted' ? (session.user as any)?.email : null,
      },
      include: { liftings: true },
    });

    return NextResponse.json({ data: nomination }, { status: 201 });
  } catch (error) {
    console.error('Error creating nomination:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
