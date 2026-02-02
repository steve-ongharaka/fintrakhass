export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { signupSchema } from '@/lib/validations';
import { authOptions } from '@/lib/auth-options';
import { createAuditLog, getUserInfoFromSession } from '@/lib/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const validatedData = signupSchema.parse(body);

    // Check if user already exists by email (email must be unique)
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user - allow role to be specified (for admin user creation), default to viewer
    const allowedRoles = ['admin', 'operator', 'viewer'] as const;
    type UserRole = typeof allowedRoles[number];
    const role: UserRole = (validatedData.role && allowedRoles.includes(validatedData.role as UserRole)) 
      ? (validatedData.role as UserRole)
      : 'viewer';

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    // Create audit log for user creation
    const userInfo = session ? getUserInfoFromSession(session) : {};
    await createAuditLog({
      ...userInfo,
      action: 'create',
      entityType: 'User',
      entityId: user.id,
      entityName: user.email,
      description: `Created new user: ${user.email} with role: ${user.role}`,
      newValues: { email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      requestPath: '/api/signup',
    });

    return NextResponse.json(
      { success: true, data: user, message: 'Registration successful' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: error?.errors?.[0]?.message ?? 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
