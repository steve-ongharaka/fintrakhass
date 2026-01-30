import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Schema for well test creation/update
const wellTestSchema = z.object({
  testDate: z.string().transform((val) => new Date(val)),
  wellId: z.string(),
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

// GET /api/well-tests - Get all well tests with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const wellId = searchParams.get("wellId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const testType = searchParams.get("testType");

    const where: any = {};

    if (wellId && wellId !== "all") {
      where.wellId = wellId;
    }

    if (startDate || endDate) {
      where.testDate = {};
      if (startDate) {
        where.testDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.testDate.lte = new Date(endDate);
      }
    }

    if (testType && testType !== "all") {
      where.testType = testType;
    }

    const wellTests = await prisma.wellTest.findMany({
      where,
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
      orderBy: {
        testDate: "desc",
      },
    });

    return NextResponse.json(wellTests);
  } catch (error) {
    console.error("Error fetching well tests:", error);
    return NextResponse.json(
      { error: "Failed to fetch well tests" },
      { status: 500 }
    );
  }
}

// POST /api/well-tests - Create a new well test
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only admin and operator can create well tests
    if ((session.user as any)?.role === "viewer") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = wellTestSchema.parse(body);

    // Check if well exists
    const well = await prisma.well.findUnique({
      where: { id: validatedData.wellId },
    });

    if (!well) {
      return NextResponse.json({ error: "Well not found" }, { status: 404 });
    }

    // Calculate GOR and Water Cut if rates are provided
    let calculatedGor = validatedData.gor;
    let calculatedWaterCut = validatedData.waterCut;

    if (validatedData.oilRate && validatedData.gasRate && !calculatedGor) {
      calculatedGor = validatedData.oilRate > 0 ? validatedData.gasRate / validatedData.oilRate : 0;
    }

    if (validatedData.waterRate && validatedData.oilRate && !calculatedWaterCut) {
      const totalLiquid = validatedData.waterRate + validatedData.oilRate;
      calculatedWaterCut = totalLiquid > 0 ? (validatedData.waterRate / totalLiquid) * 100 : 0;
    }

    const wellTest = await prisma.wellTest.create({
      data: {
        ...validatedData,
        gor: calculatedGor,
        waterCut: calculatedWaterCut,
        createdById: (session.user as any)?.id,
      },
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

    return NextResponse.json(wellTest, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating well test:", error);
    return NextResponse.json(
      { error: "Failed to create well test" },
      { status: 500 }
    );
  }
}