import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const reportTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  reportType: z.enum([
    'production_summary',
    'well_performance',
    'field_analysis',
    'allocation_report',
    'decline_curve',
    'custom'
  ]),
  filters: z.string().optional(), // JSON string
  includeCharts: z.boolean().default(true),
  includeDataTable: z.boolean().default(true),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.reportTemplate.findMany({
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            scheduledReports: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching report templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const validatedData = reportTemplateSchema.parse(body);

    const template = await prisma.reportTemplate.create({
      data: {
        ...validatedData,
        createdById: (session.user as any)?.id,
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating report template:', error);
    return NextResponse.json(
      { error: 'Failed to create report template' },
      { status: 500 }
    );
  }
}
