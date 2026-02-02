import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// GET /api/allocations/[id] - Get a specific allocation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allocation = await prisma.allocation.findUnique({
      where: { id: params.id },
      include: {
        productionAllocations: {
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

    if (!allocation) {
      return NextResponse.json(
        { error: "Allocation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(allocation);
  } catch (error) {
    console.error("Error fetching allocation:", error);
    return NextResponse.json(
      { error: "Failed to fetch allocation" },
      { status: 500 }
    );
  }
}

// DELETE /api/allocations/[id] - Delete an allocation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only admin can delete allocations
    if ((session.user as any)?.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await prisma.allocation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Allocation deleted successfully" });
  } catch (error) {
    console.error("Error deleting allocation:", error);
    return NextResponse.json(
      { error: "Failed to delete allocation" },
      { status: 500 }
    );
  }
}