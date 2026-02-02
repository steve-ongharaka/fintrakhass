export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { productSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const pageSize = parseInt(searchParams.get('pageSize') ?? '50');
    const search = searchParams.get('search') ?? '';
    const all = searchParams.get('all');

    const where: any = {};
    
    if (search) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { productCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (all === 'true') {
      const products = await prisma.product.findMany({
        where,
        orderBy: { productName: 'asc' },
      });
      return NextResponse.json({ success: true, data: products });
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: products,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = productSchema.parse(body);

    const existing = await prisma.product.findUnique({
      where: { productCode: validatedData.productCode },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Product code already exists' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: validatedData,
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    console.error('Create product error:', error);
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: error?.errors?.[0]?.message ?? 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
}
