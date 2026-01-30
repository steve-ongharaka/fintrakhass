import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Schema for allocation creation
const allocationSchema = z.object({
  allocationDate: z.string().transform((val) => new Date(val)),
  facilityId: z.string().optional().nullable(),
  method: z.enum(["manual", "test_based", "pro_rata", "potential_based"]),
  totalOilVolume: z.coerce.number().optional().nullable(),
  totalGasVolume: z.coerce.number().optional().nullable(),
  totalWaterVolume: z.coerce.number().optional().nullable(),
  comments: z.string().optional().nullable(),
  wellAllocations: z.array(
    z.object({
      wellId: z.string(),
      allocatedOilVolume: z.coerce.number().optional().nullable(),
      allocatedGasVolume: z.coerce.number().optional().nullable(),
      allocatedWaterVolume: z.coerce.number().optional().nullable(),
      allocationFactor: z.coerce.number().optional().nullable(),
      testOilRate: z.coerce.number().optional().nullable(),
      testGasRate: z.coerce.number().optional().nullable(),
      testWaterRate: z.coerce.number().optional().nullable(),
      comments: z.string().optional().nullable(),
    })
  ),
});

// GET /api/allocations - Get all allocations with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const facilityId = searchParams.get("facilityId");
    const method = searchParams.get("method");

    const where: any = {};

    if (startDate || endDate) {
      where.allocationDate = {};
      if (startDate) {
        where.allocationDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.allocationDate.lte = new Date(endDate);
      }
    }

    if (facilityId) {
      where.facilityId = facilityId;
    }

    if (method) {
      where.method = method;
    }

    const allocations = await prisma.allocation.findMany({
      where,
      include: {
        productionAllocations: {
          include: {
            well: {
              select: {
                wellName: true,
                wellId: true,
                field: true,
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
        allocationDate: "desc",
      },
    });

    return NextResponse.json(allocations);
  } catch (error) {
    console.error("Error fetching allocations:", error);
    return NextResponse.json(
      { error: "Failed to fetch allocations" },
      { status: 500 }
    );
  }
}

// POST /api/allocations - Create a new allocation with allocation logic
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only admin and operator can create allocations
    if ((session.user as any)?.role === "viewer") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = allocationSchema.parse(body);

    // Apply allocation logic based on method
    let processedAllocations = validatedData.wellAllocations;

    if (validatedData.method === "test_based") {
      // Get latest test data for wells
      processedAllocations = await applyTestBasedAllocation(
        validatedData.wellAllocations,
        validatedData.totalOilVolume || 0,
        validatedData.totalGasVolume || 0,
        validatedData.totalWaterVolume || 0,
        validatedData.allocationDate
      );
    } else if (validatedData.method === "pro_rata") {
      // Pro-rata allocation based on factors
      processedAllocations = applyProRataAllocation(
        validatedData.wellAllocations,
        validatedData.totalOilVolume || 0,
        validatedData.totalGasVolume || 0,
        validatedData.totalWaterVolume || 0
      );
    }
    // For manual and potential_based, use the provided allocations as-is

    // Create allocation with production allocations
    const allocation = await prisma.allocation.create({
      data: {
        allocationDate: validatedData.allocationDate,
        facilityId: validatedData.facilityId,
        method: validatedData.method,
        totalOilVolume: validatedData.totalOilVolume,
        totalGasVolume: validatedData.totalGasVolume,
        totalWaterVolume: validatedData.totalWaterVolume,
        comments: validatedData.comments,
        createdById: (session.user as any)?.id,
        productionAllocations: {
          create: processedAllocations.map((wa: any) => ({
            wellId: wa.wellId,
            allocatedOilVolume: wa.allocatedOilVolume || 0,
            allocatedGasVolume: wa.allocatedGasVolume || 0,
            allocatedWaterVolume: wa.allocatedWaterVolume || 0,
            allocationFactor: wa.allocationFactor || 0,
            testOilRate: wa.testOilRate || 0,
            testGasRate: wa.testGasRate || 0,
            testWaterRate: wa.testWaterRate || 0,
            comments: wa.comments,
          })),
        },
      },
      include: {
        productionAllocations: {
          include: {
            well: {
              select: {
                wellName: true,
                wellId: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(allocation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating allocation:", error);
    return NextResponse.json(
      { error: "Failed to create allocation" },
      { status: 500 }
    );
  }
}

// Helper: Test-based allocation
async function applyTestBasedAllocation(
  wellAllocations: any[],
  totalOil: number,
  totalGas: number,
  totalWater: number,
  allocationDate: Date
) {
  const processedAllocations = [];

  // Get test rates for all wells
  let totalOilRate = 0;
  let totalGasRate = 0;
  let totalWaterRate = 0;

  const wellTestData = await Promise.all(
    wellAllocations.map(async (wa: any) => {
      // Get the most recent test before or on allocation date
      const latestTest = await prisma.wellTest.findFirst({
        where: {
          wellId: wa.wellId,
          testDate: { lte: allocationDate },
        },
        orderBy: { testDate: "desc" },
      });

      const oilRate = latestTest?.oilRate || wa.testOilRate || 0;
      const gasRate = latestTest?.gasRate || wa.testGasRate || 0;
      const waterRate = latestTest?.waterRate || wa.testWaterRate || 0;

      totalOilRate += oilRate;
      totalGasRate += gasRate;
      totalWaterRate += waterRate;

      return {
        ...wa,
        testOilRate: oilRate,
        testGasRate: gasRate,
        testWaterRate: waterRate,
      };
    })
  );

  // Allocate based on test rates
  for (const testData of wellTestData) {
    const oilFactor = totalOilRate > 0 ? (testData.testOilRate / totalOilRate) * 100 : 0;
    const gasFactor = totalGasRate > 0 ? (testData.testGasRate / totalGasRate) * 100 : 0;
    const waterFactor = totalWaterRate > 0 ? (testData.testWaterRate / totalWaterRate) * 100 : 0;

    processedAllocations.push({
      ...testData,
      allocatedOilVolume: (oilFactor / 100) * totalOil,
      allocatedGasVolume: (gasFactor / 100) * totalGas,
      allocatedWaterVolume: (waterFactor / 100) * totalWater,
      allocationFactor: oilFactor, // Use oil factor as primary
    });
  }

  return processedAllocations;
}

// Helper: Pro-rata allocation
function applyProRataAllocation(
  wellAllocations: any[],
  totalOil: number,
  totalGas: number,
  totalWater: number
) {
  const totalFactor = wellAllocations.reduce(
    (sum, wa) => sum + (wa.allocationFactor || 0),
    0
  );

  return wellAllocations.map((wa: any) => {
    const factor = (wa.allocationFactor || 0) / totalFactor;
    return {
      ...wa,
      allocatedOilVolume: factor * totalOil,
      allocatedGasVolume: factor * totalGas,
      allocatedWaterVolume: factor * totalWater,
    };
  });
}