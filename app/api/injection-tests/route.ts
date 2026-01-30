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
    const injectionWellId = searchParams.get('injectionWellId');

    const where: any = {};
    if (injectionWellId && injectionWellId !== 'all') where.injectionWellId = injectionWellId;

    const tests = await prisma.injectionTest.findMany({
      where,
      include: { injectionWell: true },
      orderBy: { testDate: 'desc' },
    });

    return NextResponse.json({ data: tests });
  } catch (error) {
    console.error('Error fetching injection tests:', error);
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
    const test = await prisma.injectionTest.create({
      data: {
        ...body,
        testDate: new Date(body.testDate),
        performedBy: (session.user as any)?.email,
      },
      include: { injectionWell: true },
    });

    // Update last test date on well
    await prisma.injectionWell.update({
      where: { id: body.injectionWellId },
      data: { lastTestDate: new Date(body.testDate) },
    });

    return NextResponse.json({ data: test }, { status: 201 });
  } catch (error) {
    console.error('Error creating injection test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
