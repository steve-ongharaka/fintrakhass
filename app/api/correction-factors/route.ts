import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const correctionFactorSchema = z.object({
  productCode: z.string().min(1, 'Product code is required'),
  shrinkageFactor: z.coerce.number().min(0).max(1).optional().nullable(),
  vcfFactor: z.coerce.number().min(0).max(2).optional().nullable(),
  densityAt15C: z.coerce.number().min(0).optional().nullable(),
  thermalExpansion: z.coerce.number().min(0).max(0.01).optional().nullable(),
  description: z.string().optional().nullable(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productCode = searchParams.get('productCode');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (productCode) where.productCode = productCode;
    if (isActive !== null) where.isActive = isActive === 'true';

    const factors = await prisma.correctionFactor.findMany({
      where,
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(factors);
  } catch (error) {
    console.error('Get correction factors error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch correction factors' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const factor = await prisma.correctionFactor.create({
      data: {
        ...validatedData,
        effectiveFrom: validatedData.effectiveFrom
          ? new Date(validatedData.effectiveFrom)
          : new Date(),
        effectiveTo: validatedData.effectiveTo
          ? new Date(validatedData.effectiveTo)
          : null,
        createdById: (session.user as any)?.id,
      },
    });

    return NextResponse.json(factor);
  } catch (error) {
    console.error('Create correction factor error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create correction factor' },
      { status: 500 }
    );
  }
}
