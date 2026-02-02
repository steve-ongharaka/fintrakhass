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
    const injectionType = searchParams.get('injectionType');

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (injectionType && injectionType !== 'all') where.injectionType = injectionType;

    const wells = await prisma.injectionWell.findMany({
      where,
      include: {
        injectionData: { orderBy: { injectionDate: 'desc' }, take: 1 },
        injectionTests: { orderBy: { testDate: 'desc' }, take: 1 },
      },
      orderBy: { wellName: 'asc' },
    });

    return NextResponse.json({ data: wells });
  } catch (error) {
    console.error('Error fetching injection wells:', error);
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
    const well = await prisma.injectionWell.create({
      data: {
        ...body,
        completionDate: body.completionDate ? new Date(body.completionDate) : null,
        conversionDate: body.conversionDate ? new Date(body.conversionDate) : null,
        lastTestDate: body.lastTestDate ? new Date(body.lastTestDate) : null,
        nextTestDate: body.nextTestDate ? new Date(body.nextTestDate) : null,
      },
    });

    return NextResponse.json({ data: well }, { status: 201 });
  } catch (error) {
    console.error('Error creating injection well:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
