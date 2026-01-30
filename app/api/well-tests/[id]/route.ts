import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { z } from "zod";

const wellTestSchema = z.object({
  testDate: z.string().transform((val) => new Date(val)).optional(),
  wellId: z.string().optional(),
  testType: z.enum(["production_test", "flow_test", "pressure_buildup", "interference_test", "drill_stem_test"]).optional(),
  duration: z.coerce.number().optional().nullable(),
  oilRate: z.coerce.number().optional().nullable(),
  gasRate: z.coerce.number().optional().nullable(),
  waterRate: z.coerce.number().optional().nullable(),
  gor: z.coerce.number().optional().nullable(),
  waterCut: z.coerce.number().optional().nullable(),
  flowingTubingPressure: z.coerce.number().optional().nullable(),
  flowingCasingPressure: z.coerce.number().optional().nullable(),
  temperature: z.coerce.number().optional().nullable(),
  chokeSize: z.coerce.number().optional().nullable(),
  staticPressure: z.coerce.number().optional().nullable(),
  comments: z.string().optional().nullable(),
});

// GET /api/well-tests/[id] - Get a specific well test
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wellTest = await prisma.wellTest.findUnique({
      where: { id: params.id },
      include: {
        well: {
          select: {
            wellName: true,
            wellId: true,
            field: true,
            facility: {
              select: {
                facilityName: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!wellTest) {
      return NextResponse.json(
        { error: "Well test not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(wellTest);
  } catch (error) {
    console.error("Error fetching well test:", error);
    return NextResponse.json(
      { error: "Failed to fetch well test" },
      { status: 500 }
    );
  }
}

// PUT /api/well-tests/[id] - Update a well test
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only admin and operator can update well tests
    if ((session.user as any)?.role === "viewer") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = wellTestSchema.parse(body);

    // Check if well test exists
    const existingTest = await prisma.wellTest.findUnique({
      where: { id: params.id },
    });

    if (!existingTest) {
      return NextResponse.json(
        { error: "Well test not found" },
        { status: 404 }
      );
    }

    // Recalculate GOR and Water Cut if rates are provided
    const updateData: any = { ...validatedData };

    if (updateData.oilRate !== undefined && updateData.gasRate !== undefined && !updateData.gor) {
      updateData.gor = updateData.oilRate > 0 ? updateData.gasRate / updateData.oilRate : 0;
    }

    if (updateData.waterRate !== undefined && updateData.oilRate !== undefined && !updateData.waterCut) {
      const totalLiquid = updateData.waterRate + updateData.oilRate;
      updateData.waterCut = totalLiquid > 0 ? (updateData.waterRate / totalLiquid) * 100 : 0;
    }

    const wellTest = await prisma.wellTest.update({
      where: { id: params.id },
      data: updateData,
      include: {
        well: {
          select: {
            wellName: true,
            wellId: true,
            field: true,
          },
        },
      },
    });

    return NextResponse.json(wellTest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating well test:", error);
    return NextResponse.json(
      { error: "Failed to update well test" },
      { status: 500 }
    );
  }
}

// DELETE /api/well-tests/[id] - Delete a well test
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only admin can delete well tests
    if ((session.user as any)?.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await prisma.wellTest.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Well test deleted successfully" });
  } catch (error) {
    console.error("Error deleting well test:", error);
    return NextResponse.json(
      { error: "Failed to delete well test" },
      { status: 500 }
    );
  }
}