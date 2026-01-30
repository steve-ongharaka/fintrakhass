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
    const status = searchParams.get('status');

    const where: any = {};
    if (reportType && reportType !== 'all') where.reportType = reportType;
    if (status && status !== 'all') where.status = status;

    const reports = await prisma.regulatoryReport.findMany({
      where,
      orderBy: { periodStart: 'desc' },
    });

    return NextResponse.json({ data: reports });
  } catch (error) {
    console.error('Error fetching regulatory reports:', error);
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
    const reportNumber = `REG-${body.reportType?.toUpperCase() || 'RPT'}-${Date.now()}`;

    const report = await prisma.regulatoryReport.create({
      data: {
        ...body,
        reportNumber,
        periodStart: new Date(body.periodStart),
        periodEnd: new Date(body.periodEnd),
        submissionDeadline: body.submissionDeadline ? new Date(body.submissionDeadline) : null,
        preparedBy: (session.user as any)?.email,
      },
    });

    return NextResponse.json({ data: report }, { status: 201 });
  } catch (error) {
    console.error('Error creating regulatory report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
