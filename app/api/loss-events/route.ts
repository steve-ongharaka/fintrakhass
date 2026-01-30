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
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');

    const where: any = {};
    if (category && category !== 'all') where.category = category;
    if (status && status !== 'all') where.status = status;
    if (severity && severity !== 'all') where.severity = severity;

    const events = await prisma.lossEvent.findMany({
      where,
      orderBy: { eventDate: 'desc' },
    });

    return NextResponse.json({ data: events });
  } catch (error) {
    console.error('Error fetching loss events:', error);
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
    const eventNumber = `LOSS-${Date.now()}`;

    const event = await prisma.lossEvent.create({
      data: {
        ...body,
        eventNumber,
        eventDate: new Date(body.eventDate),
        reportedBy: (session.user as any)?.email,
      },
    });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    console.error('Error creating loss event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
