import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await prisma.regulatoryReport.findUnique({
      where: { id: params.id },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error('Error fetching regulatory report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
    
    const updateData: any = { ...body };
    if (body.periodStart) updateData.periodStart = new Date(body.periodStart);
    if (body.periodEnd) updateData.periodEnd = new Date(body.periodEnd);
    if (body.status === 'submitted') {
      updateData.submittedDate = new Date();
    }
    if (body.status === 'approved') {
      updateData.approvedBy = (session.user as any)?.email;
      updateData.approvedAt = new Date();
    }

    const report = await prisma.regulatoryReport.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error('Error updating regulatory report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await prisma.regulatoryReport.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Regulatory report deleted' });
  } catch (error) {
    console.error('Error deleting regulatory report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
