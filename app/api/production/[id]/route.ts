export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { productionFdcSchema } from '@/lib/validations';
import { calculateStandardizedProduction } from '@/lib/calculations';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const production = await prisma.productionFdc.findUnique({
      where: { id: params.id },
      include: {
        well: { include: { facility: true } },
        productionStd: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!production) {
      return NextResponse.json({ success: false, error: 'Production entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: production });
  } catch (error) {
    console.error('Get production error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch production entry' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role === 'viewer') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = productionFdcSchema.parse(body);

    // Check for duplicate entry (excluding current)
    const existing = await prisma.productionFdc.findFirst({
      where: {
        wellId: validatedData.wellId,
        productionDate: validatedData.productionDate,
        NOT: { id: params.id },
      },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Production entry already exists for this well and date' },
        { status: 400 }
      );
    }

    // Calculate standardized values
    const stdValues = calculateStandardizedProduction(validatedData);

    // Update production entry
    const production = await prisma.productionFdc.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        productionStd: {
          update: {
            productionDate: validatedData.productionDate,
            wellId: validatedData.wellId,
            ...stdValues,
          },
        },
      },
      include: {
        well: { include: { facility: true } },
        productionStd: true,
      },
    });

    return NextResponse.json({ success: true, data: production });
  } catch (error: any) {
    console.error('Update production error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Production entry not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update production entry' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role === 'viewer') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.productionFdc.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Production entry deleted successfully' });
  } catch (error: any) {
    console.error('Delete production error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Production entry not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to delete production entry' }, { status: 500 });
  }
}
