"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import {
  Plus,
  Trash2,
  Share2,
  Calculator,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Allocation {
  id: string;
  allocationDate: string;
  facilityId?: string;
  method: string;
  totalOilVolume?: number;
  totalGasVolume?: number;
  totalWaterVolume?: number;
  comments?: string;
  productionAllocations: ProductionAllocation[];
  createdAt: string;
}

interface ProductionAllocation {
  id: string;
  wellId: string;
  well: {
    wellName: string;
    wellId: string;
    field: string;
  };
  allocatedOilVolume?: number;
  allocatedGasVolume?: number;
  allocatedWaterVolume?: number;
  allocationFactor?: number;
  testOilRate?: number;
  testGasRate?: number;
  testWaterRate?: number;
}

interface Well {
  id: string;
  wellName: string;
  wellId: string;
  field: string;
  status: string;
}

interface WellAllocation {
  wellId: string;
  wellName: string;
  allocatedOilVolume: number;
  allocatedGasVolume: number;
  allocatedWaterVolume: number;
  allocationFactor: number;
  testOilRate: number;
  testGasRate: number;
  testWaterRate: number;
  comments: string;
}

const allocationMethodLabels: Record<string, string> = {
  manual: "Manual",
  test_based: "Test-Based",
  pro_rata: "Pro-Rata",
  potential_based: "Potential-Based",
};

export default function AllocationsPage() {
  const { data: session } = useSession() || {};
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    allocationDate: "",
    method: "test_based",
    totalOilVolume: "",
    totalGasVolume: "",
    totalWaterVolume: "",
    comments: "",
  });

  const [wellAllocations, setWellAllocations] = useState<WellAllocation[]>([]);
  const [selectedWells, setSelectedWells] = useState<string[]>([]);

  // Fetch allocations
  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ["allocations"],
    queryFn: async () => {
      const response = await fetch("/api/allocations");
      if (!response.ok) throw new Error("Failed to fetch allocations");
      return response.json();
    },
  });

  // Fetch wells
  const { data: wells = [] } = useQuery<Well[]>({
    queryKey: ["wells"],
    queryFn: async () => {
      const response = await fetch("/api/wells?status=active");
      if (!response.ok) throw new Error("Failed to fetch wells");
      const result = await response.json();
      return result.data || [];
    },
  });

  // Fetch latest well tests for each well
  const { data: wellTests = [] } = useQuery({
    queryKey: ["wellTests"],
    queryFn: async () => {
      const response = await fetch("/api/well-tests");
      if (!response.ok) throw new Error("Failed to fetch well tests");
      return response.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create allocation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      toast.success("Allocation created successfully");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Failed to create allocation");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/allocations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete allocation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      toast.success("Allocation deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete allocation");
    },
  });

  const handleOpenDialog = () => {
    setFormData({
      allocationDate: format(new Date(), "yyyy-MM-dd"),
      method: "test_based",
      totalOilVolume: "",
      totalGasVolume: "",
      totalWaterVolume: "",
      comments: "",
    });
    setWellAllocations([]);
    setSelectedWells([]);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleViewAllocation = (allocation: Allocation) => {
    setSelectedAllocation(allocation);
    setIsViewDialogOpen(true);
  };

  const handleAddWell = (wellId: string) => {
    if (selectedWells.includes(wellId)) return;

    const well = wells.find((w) => w.id === wellId);
    if (!well) return;

    // Get latest test data for this well
    const latestTest = wellTests
      .filter((t: any) => t.wellId === wellId)
      .sort((a: any, b: any) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())[0];

    setWellAllocations([
      ...wellAllocations,
      {
        wellId: well.id,
        wellName: well.wellName,
        allocatedOilVolume: 0,
        allocatedGasVolume: 0,
        allocatedWaterVolume: 0,
        allocationFactor: 100 / (selectedWells.length + 1),
        testOilRate: latestTest?.oilRate || 0,
        testGasRate: latestTest?.gasRate || 0,
        testWaterRate: latestTest?.waterRate || 0,
        comments: "",
      },
    ]);
    setSelectedWells([...selectedWells, wellId]);
  };

  const handleRemoveWell = (wellId: string) => {
    setWellAllocations(wellAllocations.filter((wa) => wa.wellId !== wellId));
    setSelectedWells(selectedWells.filter((id) => id !== wellId));
  };

  const handleWellAllocationChange = (
    wellId: string,
    field: keyof WellAllocation,
    value: any
  ) => {
    setWellAllocations(
      wellAllocations.map((wa) =>
        wa.wellId === wellId ? { ...wa, [field]: value } : wa
      )
    );
  };

  const calculateAllocation = () => {
    const totalOil = parseFloat(formData.totalOilVolume) || 0;
    const totalGas = parseFloat(formData.totalGasVolume) || 0;
    const totalWater = parseFloat(formData.totalWaterVolume) || 0;

    if (formData.method === "test_based") {
      // Calculate based on test rates
      const totalOilRate = wellAllocations.reduce(
        (sum, wa) => sum + wa.testOilRate,
        0
      );
      const totalGasRate = wellAllocations.reduce(
        (sum, wa) => sum + wa.testGasRate,
        0
      );
      const totalWaterRate = wellAllocations.reduce(
        (sum, wa) => sum + wa.testWaterRate,
        0
      );

      setWellAllocations(
        wellAllocations.map((wa) => ({
          ...wa,
          allocatedOilVolume:
            totalOilRate > 0 ? (wa.testOilRate / totalOilRate) * totalOil : 0,
          allocatedGasVolume:
            totalGasRate > 0 ? (wa.testGasRate / totalGasRate) * totalGas : 0,
          allocatedWaterVolume:
            totalWaterRate > 0 ? (wa.testWaterRate / totalWaterRate) * totalWater : 0,
          allocationFactor:
            totalOilRate > 0 ? (wa.testOilRate / totalOilRate) * 100 : 0,
        }))
      );
    } else if (formData.method === "pro_rata") {
      // Calculate based on allocation factors
      const totalFactor = wellAllocations.reduce(
        (sum, wa) => sum + wa.allocationFactor,
        0
      );

      setWellAllocations(
        wellAllocations.map((wa) => ({
          ...wa,
          allocatedOilVolume: (wa.allocationFactor / totalFactor) * totalOil,
          allocatedGasVolume: (wa.allocationFactor / totalFactor) * totalGas,
          allocatedWaterVolume: (wa.allocationFactor / totalFactor) * totalWater,
        }))
      );
    }

    toast.success("Allocation calculated successfully");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (wellAllocations.length === 0) {
      toast.error("Please add at least one well to the allocation");
      return;
    }

    const submitData = {
      allocationDate: formData.allocationDate,
      method: formData.method,
      totalOilVolume: parseFloat(formData.totalOilVolume) || 0,
      totalGasVolume: parseFloat(formData.totalGasVolume) || 0,
      totalWaterVolume: parseFloat(formData.totalWaterVolume) || 0,
      comments: formData.comments,
      wellAllocations: wellAllocations.map((wa) => ({
        wellId: wa.wellId,
        allocatedOilVolume: wa.allocatedOilVolume,
        allocatedGasVolume: wa.allocatedGasVolume,
        allocatedWaterVolume: wa.allocatedWaterVolume,
        allocationFactor: wa.allocationFactor,
        testOilRate: wa.testOilRate,
        testGasRate: wa.testGasRate,
        testWaterRate: wa.testWaterRate,
        comments: wa.comments,
      })),
    };

    createMutation.mutate(submitData);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this allocation?")) {
      deleteMutation.mutate(id);
    }
  };

  const canEdit = (session?.user as any)?.role === "admin" || (session?.user as any)?.role === "operator";
  const canDelete = (session?.user as any)?.role === "admin";

  // Calculate statistics
  const totalAllocations = allocations.length;
  const totalOilAllocated = allocations.reduce(
    (sum: number, a: Allocation) => sum + (a.totalOilVolume || 0),
    0
  );
  const totalGasAllocated = allocations.reduce(
    (sum: number, a: Allocation) => sum + (a.totalGasVolume || 0),
    0
  );
  const testBasedAllocations = allocations.filter(
    (a: Allocation) => a.method === "test_based"
  ).length;

  // Table columns
  const columns = [
    {
      key: "allocationDate",
      header: "Allocation Date",
      sortable: true,
      render: (allocation: Allocation) =>
        format(new Date(allocation.allocationDate), "MMM dd, yyyy"),
    },
    {
      key: "method",
      header: "Method",
      render: (allocation: Allocation) => (
        <Badge variant="outline">
          {allocationMethodLabels[allocation.method]}
        </Badge>
      ),
    },
    {
      key: "wells",
      header: "Wells",
      render: (allocation: Allocation) => (
        <span>{allocation.productionAllocations.length} wells</span>
      ),
    },
    {
      key: "totalOil",
      header: "Total Oil (bbl)",
      sortable: true,
      render: (allocation: Allocation) =>
        allocation.totalOilVolume?.toFixed(2) || "0",
    },
    {
      key: "totalGas",
      header: "Total Gas (scf)",
      sortable: true,
      render: (allocation: Allocation) =>
        allocation.totalGasVolume?.toFixed(0) || "0",
    },
    {
      key: "totalWater",
      header: "Total Water (bbl)",
      render: (allocation: Allocation) =>
        allocation.totalWaterVolume?.toFixed(2) || "0",
    },
    {
      key: "actions",
      header: "Actions",
      render: (allocation: Allocation) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewAllocation(allocation)}
          >
            View Details
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(allocation.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Allocation"
        description="Allocate commingled production to individual wells using test data"
        action={
          canEdit ? (
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Allocation
            </Button>
          ) : undefined
        }
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Allocations
            </CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAllocations}</div>
            <p className="text-xs text-muted-foreground">
              {testBasedAllocations} test-based
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Oil Allocated
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalOilAllocated.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">bbl</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Gas Allocated
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalGasAllocated.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">scf</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Allocation</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allocations.length > 0
                ? format(new Date(allocations[0].allocationDate), "MMM dd")
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {allocations.length > 0
                ? `${allocations[0].productionAllocations.length} wells`
                : "No allocations yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Allocation Records</CardTitle>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 && !isLoading ? (
            <EmptyState
              icon={Share2}
              title="No allocations recorded"
              description="Create your first production allocation to distribute commingled production to individual wells."
            />
          ) : (
            <DataTable
              data={allocations}
              columns={columns}
              searchable
              searchPlaceholder="Search allocations..."
              loading={isLoading}
              pageSize={10}
              emptyMessage="No allocations found"
            />
          )}
        </CardContent>
      </Card>

      {/* Create Allocation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Production Allocation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="allocationDate">Allocation Date *</Label>
                  <Input
                    id="allocationDate"
                    type="date"
                    value={formData.allocationDate}
                    onChange={(e) =>
                      setFormData({ ...formData, allocationDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="method">Allocation Method *</Label>
                  <Select
                    value={formData.method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(allocationMethodLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Total Volumes */}
              <div className="space-y-2">
                <h4 className="font-medium">Total Volumes to Allocate</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="totalOilVolume">Total Oil (bbl) *</Label>
                    <Input
                      id="totalOilVolume"
                      type="number"
                      step="0.01"
                      value={formData.totalOilVolume}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalOilVolume: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="totalGasVolume">Total Gas (scf) *</Label>
                    <Input
                      id="totalGasVolume"
                      type="number"
                      step="0.01"
                      value={formData.totalGasVolume}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalGasVolume: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="totalWaterVolume">Total Water (bbl)</Label>
                    <Input
                      id="totalWaterVolume"
                      type="number"
                      step="0.01"
                      value={formData.totalWaterVolume}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalWaterVolume: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Method Description */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {formData.method === "test_based" &&
                    "Allocation will be calculated based on the latest well test rates for each well."}
                  {formData.method === "pro_rata" &&
                    "Allocation will be distributed based on the allocation factors you specify for each well."}
                  {formData.method === "manual" &&
                    "You can manually enter the allocated volumes for each well."}
                  {formData.method === "potential_based" &&
                    "Allocation will be based on well potential (requires manual input)."}
                </AlertDescription>
              </Alert>

              {/* Well Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Wells</h4>
                  <div className="flex gap-2">
                    <Select
                      onValueChange={handleAddWell}
                      value=""
                    >
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Add well..." />
                      </SelectTrigger>
                      <SelectContent>
                        {wells
                          .filter((well) => !selectedWells.includes(well.id))
                          .map((well) => (
                            <SelectItem key={well.id} value={well.id}>
                              {well.wellName} - {well.wellId}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {wellAllocations.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={calculateAllocation}
                      >
                        <Calculator className="mr-2 h-4 w-4" />
                        Calculate
                      </Button>
                    )}
                  </div>
                </div>

                {/* Wells Table */}
                {wellAllocations.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Well</TableHead>
                          {formData.method === "test_based" && (
                            <>
                              <TableHead>Test Oil Rate</TableHead>
                              <TableHead>Test Gas Rate</TableHead>
                            </>
                          )}
                          {formData.method === "pro_rata" && (
                            <TableHead>Factor (%)</TableHead>
                          )}
                          <TableHead>Allocated Oil</TableHead>
                          <TableHead>Allocated Gas</TableHead>
                          <TableHead>Allocated Water</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wellAllocations.map((wa) => (
                          <TableRow key={wa.wellId}>
                            <TableCell className="font-medium">
                              {wa.wellName}
                            </TableCell>
                            {formData.method === "test_based" && (
                              <>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={wa.testOilRate}
                                    onChange={(e) =>
                                      handleWellAllocationChange(
                                        wa.wellId,
                                        "testOilRate",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-24"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={wa.testGasRate}
                                    onChange={(e) =>
                                      handleWellAllocationChange(
                                        wa.wellId,
                                        "testGasRate",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-24"
                                  />
                                </TableCell>
                              </>
                            )}
                            {formData.method === "pro_rata" && (
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={wa.allocationFactor}
                                  onChange={(e) =>
                                    handleWellAllocationChange(
                                      wa.wellId,
                                      "allocationFactor",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-24"
                                />
                              </TableCell>
                            )}
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={wa.allocatedOilVolume}
                                onChange={(e) =>
                                  handleWellAllocationChange(
                                    wa.wellId,
                                    "allocatedOilVolume",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-28"
                                disabled={formData.method !== "manual"}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={wa.allocatedGasVolume}
                                onChange={(e) =>
                                  handleWellAllocationChange(
                                    wa.wellId,
                                    "allocatedGasVolume",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-28"
                                disabled={formData.method !== "manual"}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={wa.allocatedWaterVolume}
                                onChange={(e) =>
                                  handleWellAllocationChange(
                                    wa.wellId,
                                    "allocatedWaterVolume",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-28"
                                disabled={formData.method !== "manual"}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveWell(wa.wellId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Add wells to the allocation using the dropdown above.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Comments */}
              <div>
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) =>
                    setFormData({ ...formData, comments: e.target.value })
                  }
                  rows={2}
                  placeholder="Add any notes about this allocation..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">Create Allocation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Allocation Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Allocation Details</DialogTitle>
          </DialogHeader>
          {selectedAllocation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <p className="text-lg font-medium">
                    {format(
                      new Date(selectedAllocation.allocationDate),
                      "MMM dd, yyyy"
                    )}
                  </p>
                </div>
                <div>
                  <Label>Method</Label>
                  <p className="text-lg font-medium">
                    {allocationMethodLabels[selectedAllocation.method]}
                  </p>
                </div>
                <div>
                  <Label>Total Oil Volume</Label>
                  <p className="text-lg font-medium">
                    {selectedAllocation.totalOilVolume?.toFixed(2) || "0"} bbl
                  </p>
                </div>
                <div>
                  <Label>Total Gas Volume</Label>
                  <p className="text-lg font-medium">
                    {selectedAllocation.totalGasVolume?.toFixed(0) || "0"} scf
                  </p>
                </div>
              </div>

              <div>
                <Label>Well Allocations</Label>
                <div className="border rounded-lg mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Well</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Factor (%)</TableHead>
                        <TableHead>Allocated Oil</TableHead>
                        <TableHead>Allocated Gas</TableHead>
                        <TableHead>Allocated Water</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAllocation.productionAllocations.map((pa) => (
                        <TableRow key={pa.id}>
                          <TableCell className="font-medium">
                            {pa.well.wellName}
                          </TableCell>
                          <TableCell>{pa.well.field || "N/A"}</TableCell>
                          <TableCell>
                            {pa.allocationFactor?.toFixed(2) || "0"}%
                          </TableCell>
                          <TableCell>
                            {pa.allocatedOilVolume?.toFixed(2) || "0"} bbl
                          </TableCell>
                          <TableCell>
                            {pa.allocatedGasVolume?.toFixed(0) || "0"} scf
                          </TableCell>
                          <TableCell>
                            {pa.allocatedWaterVolume?.toFixed(2) || "0"} bbl
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedAllocation.comments && (
                <div>
                  <Label>Comments</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedAllocation.comments}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}