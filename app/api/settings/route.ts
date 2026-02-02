import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const where: any = { isActive: true };
    if (category) where.category = category;

    const settings = await prisma.calculationSettings.findMany({
      where,
      orderBy: { category: 'asc' },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
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
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { settingKey, settingValue, description, category, dataType, isActive } = body;

    const setting = await prisma.calculationSettings.upsert({
      where: { settingKey },
      update: { settingValue, description, category, dataType, isActive },
      create: { settingKey, settingValue, description, category, dataType, isActive },
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Save setting error:', error);
    return NextResponse.json(
      { error: 'Failed to save setting' },
      { status: 500 }
    );
  }
}
