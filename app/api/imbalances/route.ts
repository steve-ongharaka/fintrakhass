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
    const reconciliationId = searchParams.get('reconciliationId');
    const isResolved = searchParams.get('isResolved');

    const where: any = {};
    if (reconciliationId && reconciliationId !== 'all') where.reconciliationId = reconciliationId;
    if (isResolved !== null && isResolved !== 'all') where.isResolved = isResolved === 'true';

    const imbalances = await prisma.imbalance.findMany({
      where,
      include: { reconciliation: true },
      orderBy: { imbalanceDate: 'desc' },
    });

    return NextResponse.json({ data: imbalances });
  } catch (error) {
    console.error('Get imbalances error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (!['admin', 'operator'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    
    const expectedVolume = parseFloat(body.expectedVolume || 0);
    const actualVolume = parseFloat(body.actualVolume || 0);
    const varianceVolume = actualVolume - expectedVolume;
    const variancePercent = expectedVolume > 0 ? (varianceVolume / expectedVolume) * 100 : 0;

    const imbalance = await prisma.imbalance.create({
      data: {
        reconciliationId: body.reconciliationId,
        imbalanceDate: new Date(body.imbalanceDate),
        product: body.product,
        expectedVolume,
        actualVolume,
        varianceVolume,
        variancePercent,
        category: body.category,
        rootCause: body.rootCause,
        correctiveAction: body.correctiveAction,
        actionTakenBy: body.actionTakenBy,
        actionDate: body.actionDate ? new Date(body.actionDate) : null,
        isResolved: body.isResolved || false,
        resolutionNotes: body.resolutionNotes,
        comments: body.comments,
      },
      include: { reconciliation: true },
    });

    return NextResponse.json({ data: imbalance }, { status: 201 });
  } catch (error) {
    console.error('Create imbalance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
