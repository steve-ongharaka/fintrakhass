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
    const facilityId = searchParams.get('facilityId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (facilityId && facilityId !== 'all') where.facilityId = facilityId;
    if (startDate) where.recordDate = { ...where.recordDate, gte: new Date(startDate) };
    if (endDate) where.recordDate = { ...where.recordDate, lte: new Date(endDate) };

    const records = await prisma.flaringRecord.findMany({
      where,
      orderBy: { recordDate: 'desc' },
    });

    return NextResponse.json({ data: records });
  } catch (error) {
    console.error('Error fetching flaring records:', error);
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
    const record = await prisma.flaringRecord.create({
      data: {
        ...body,
        recordDate: new Date(body.recordDate),
        recordedBy: (session.user as any)?.email,
      },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    console.error('Error creating flaring record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
