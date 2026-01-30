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
    const nominationId = searchParams.get('nominationId');

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (nominationId && nominationId !== 'all') where.nominationId = nominationId;

    const liftings = await prisma.lifting.findMany({
      where,
      include: { nomination: true },
      orderBy: { scheduledDate: 'desc' },
    });

    return NextResponse.json({ data: liftings });
  } catch (error) {
    console.error('Error fetching liftings:', error);
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
    const liftingNumber = `LFT-${Date.now()}`;

    const lifting = await prisma.lifting.create({
      data: {
        ...body,
        liftingNumber,
        scheduledDate: new Date(body.scheduledDate),
        laycanStart: body.laycanStart ? new Date(body.laycanStart) : null,
        laycanEnd: body.laycanEnd ? new Date(body.laycanEnd) : null,
      },
      include: { nomination: true },
    });

    return NextResponse.json({ data: lifting }, { status: 201 });
  } catch (error) {
    console.error('Error creating lifting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
