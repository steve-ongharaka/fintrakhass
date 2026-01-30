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
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;

    const agreements = await prisma.liftingAgreement.findMany({
      where,
      orderBy: { effectiveDate: 'desc' },
    });

    return NextResponse.json({ data: agreements });
  } catch (error) {
    console.error('Error fetching lifting agreements:', error);
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
    const agreementNumber = `AGR-${Date.now()}`;

    const agreement = await prisma.liftingAgreement.create({
      data: {
        ...body,
        agreementNumber,
        effectiveDate: new Date(body.effectiveDate),
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      },
    });

    return NextResponse.json({ data: agreement }, { status: 201 });
  } catch (error) {
    console.error('Error creating lifting agreement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
