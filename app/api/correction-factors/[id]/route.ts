import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const correctionFactorSchema = z.object({
  productCode: z.string().min(1).optional(),
  shrinkageFactor: z.coerce.number().min(0).max(1).optional().nullable(),
  vcfFactor: z.coerce.number().min(0).max(2).optional().nullable(),
  densityAt15C: z.coerce.number().min(0).optional().nullable(),
  thermalExpansion: z.coerce.number().min(0).max(0.01).optional().nullable(),
  description: z.string().optional().nullable(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin' && userRole !== 'operator') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = correctionFactorSchema.parse(body);

    const factor = await prisma.correctionFactor.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        effectiveFrom: validatedData.effectiveFrom
          ? new Date(validatedData.effectiveFrom)
          : undefined,
        effectiveTo: validatedData.effectiveTo
          ? new Date(validatedData.effectiveTo)
          : null,
      },
    });

    return NextResponse.json(factor);
  } catch (error) {
    console.error('Update correction factor error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update correction factor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await prisma.correctionFactor.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete correction factor error:', error);
    return NextResponse.json(
      { error: 'Failed to delete correction factor' },
      { status: 500 }
    );
  }
}
