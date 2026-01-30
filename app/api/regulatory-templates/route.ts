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
    const reportType = searchParams.get('reportType');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (reportType && reportType !== 'all') where.reportType = reportType;
    if (isActive === 'true') where.isActive = true;

    const templates = await prisma.regulatoryTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error('Error fetching regulatory templates:', error);
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
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const template = await prisma.regulatoryTemplate.create({
      data: {
        ...body,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
      },
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error('Error creating regulatory template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
