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

    const where: any = {};
    if (facilityId && facilityId !== 'all') where.facilityId = facilityId;

    const records = await prisma.shrinkageRecord.findMany({
      where,
      orderBy: { recordDate: 'desc' },
    });

    return NextResponse.json({ data: records });
  } catch (error) {
    console.error('Error fetching shrinkage records:', error);
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
    const shrinkageVolume = (body.inletVolume || 0) - (body.outletVolume || 0);
    const shrinkagePercent = body.inletVolume > 0 ? (shrinkageVolume / body.inletVolume) * 100 : 0;

    const record = await prisma.shrinkageRecord.create({
      data: {
        ...body,
        recordDate: new Date(body.recordDate),
        shrinkageVolume,
        shrinkagePercent,
        recordedBy: (session.user as any)?.email,
      },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    console.error('Error creating shrinkage record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
