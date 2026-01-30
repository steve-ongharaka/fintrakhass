"use client";

import { useState } from "react";
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
  Edit2,
  Trash2,
  TestTube,
  Droplet,
  Gauge,
  Thermometer,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

interface WellTest {
  id: string;
  testDate: string;
  wellId: string;
  well: {
    wellName: string;
    wellId: string;
    field: string;
    facility?: {
      facilityName: string;
    };
  };
  testType: string;
  duration?: number;
  oilRate?: number;
  gasRate?: number;
  waterRate?: number;
  gor?: number;
  waterCut?: number;
  flowingTubingPressure?: number;
  flowingCasingPressure?: number;
  temperature?: number;
  chokeSize?: number;
  staticPressure?: number;
  comments?: string;
  createdAt: string;
}

interface Well {
  id: string;
  wellName: string;
  wellId: string;
  field: string;
  status: string;
}

const testTypeLabels: Record<string, string> = {
  production_test: "Production Test",
  flow_test: "Flow Test",
  pressure_buildup: "Pressure Buildup",
  interference_test: "Interference Test",
  drill_stem_test: "Drill Stem Test",
};

export default function WellTestsPage() {
  const { data: session } = useSession() || {};
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<WellTest | null>(null);
  const [selectedWellFilter, setSelectedWellFilter] = useState<string>("all");
  const [selectedTestType, setSelectedTestType] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    testDate: "",
    wellId: "",
    testType: "production_test",
    duration: "",
    oilRate: "",
    gasRate: "",
    waterRate: "",
    gor: "",
    waterCut: "",
    flowingTubingPressure: "",
    flowingCasingPressure: "",
    temperature: "",
    chokeSize: "",
    staticPressure: "",
    comments: "",
  });

  // Fetch well tests
  const { data: wellTests = [], isLoading } = useQuery({
    queryKey: ["wellTests", selectedWellFilter, selectedTestType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedWellFilter) params.append("wellId", selectedWellFilter);
      if (selectedTestType) params.append("testType", selectedTestType);

      const response = await fetch(`/api/well-tests?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch well tests");
      return response.json();
    },
  });

  // Fetch wells for dropdown
  const { data: wells = [] } = useQuery<Well[]>({
    queryKey: ["wells"],
    queryFn: async () => {
      const response = await fetch("/api/wells");
      if (!response.ok) throw new Error("Failed to fetch wells");
      const result = await response.json();
      return result.data || [];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/well-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create well test");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wellTests"] });
      toast.success("Well test created successfully");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Failed to create well test");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/well-tests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update well test");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wellTests"] });
      toast.success("Well test updated successfully");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Failed to update well test");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/well-tests/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete well test");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wellTests"] });
      toast.success("Well test deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete well test");
    },
  });

  const handleOpenDialog = (test?: WellTest) => {
    if (test) {
      setEditingTest(test);
      setFormData({
        testDate: format(new Date(test.testDate), "yyyy-MM-dd"),
        wellId: test.wellId,
        testType: test.testType,
        duration: test.duration?.toString() || "",
        oilRate: test.oilRate?.toString() || "",
        gasRate: test.gasRate?.toString() || "",
        waterRate: test.waterRate?.toString() || "",
        gor: test.gor?.toString() || "",
        waterCut: test.waterCut?.toString() || "",
        flowingTubingPressure: test.flowingTubingPressure?.toString() || "",
        flowingCasingPressure: test.flowingCasingPressure?.toString() || "",
        temperature: test.temperature?.toString() || "",
        chokeSize: test.chokeSize?.toString() || "",
        staticPressure: test.staticPressure?.toString() || "",
        comments: test.comments || "",
      });
    } else {
      setEditingTest(null);
      setFormData({
        testDate: format(new Date(), "yyyy-MM-dd"),
        wellId: "",
        testType: "production_test",
        duration: "",
        oilRate: "",
        gasRate: "",
        waterRate: "",
        gor: "",
        waterCut: "",
        flowingTubingPressure: "",
        flowingCasingPressure: "",
        temperature: "",
        chokeSize: "",
        staticPressure: "",
        comments: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTest(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      duration: formData.duration ? parseFloat(formData.duration) : null,
      oilRate: formData.oilRate ? parseFloat(formData.oilRate) : null,
      gasRate: formData.gasRate ? parseFloat(formData.gasRate) : null,
      waterRate: formData.waterRate ? parseFloat(formData.waterRate) : null,
      gor: formData.gor ? parseFloat(formData.gor) : null,
      waterCut: formData.waterCut ? parseFloat(formData.waterCut) : null,
      flowingTubingPressure: formData.flowingTubingPressure
        ? parseFloat(formData.flowingTubingPressure)
        : null,
      flowingCasingPressure: formData.flowingCasingPressure
        ? parseFloat(formData.flowingCasingPressure)
        : null,
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      chokeSize: formData.chokeSize ? parseFloat(formData.chokeSize) : null,
      staticPressure: formData.staticPressure ? parseFloat(formData.staticPressure) : null,
    };

    if (editingTest) {
      updateMutation.mutate({ id: editingTest.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this well test?")) {
      deleteMutation.mutate(id);
    }
  };

  const canEdit = (session?.user as any)?.role === "admin" || (session?.user as any)?.role === "operator";
  const canDelete = (session?.user as any)?.role === "admin";

  // Calculate statistics
  const totalTests = wellTests.length;
  const productionTests = wellTests.filter((t: WellTest) => t.testType === "production_test").length;
  const avgOilRate =
    wellTests.reduce((sum: number, t: WellTest) => sum + (t.oilRate || 0), 0) / (wellTests.length || 1);
  const avgGasRate =
    wellTests.reduce((sum: number, t: WellTest) => sum + (t.gasRate || 0), 0) / (wellTests.length || 1);

  // Table columns
  const columns = [
    {
      key: "testDate",
      header: "Test Date",
      sortable: true,
      render: (test: WellTest) => format(new Date(test.testDate), "MMM dd, yyyy"),
    },
    {
      key: "well",
      header: "Well",
      render: (test: WellTest) => (
        <div>
          <div className="font-medium">{test.well.wellName}</div>
          <div className="text-xs text-muted-foreground">{test.well.wellId}</div>
        </div>
      ),
    },
    {
      key: "field",
      header: "Field",
      render: (test: WellTest) => test.well.field || "N/A",
    },
    {
      key: "testType",
      header: "Test Type",
      render: (test: WellTest) => (
        <Badge variant="outline">{testTypeLabels[test.testType]}</Badge>
      ),
    },
    {
      key: "duration",
      header: "Duration (hrs)",
      render: (test: WellTest) => test.duration?.toFixed(1) || "N/A",
    },
    {
      key: "oilRate",
      header: "Oil Rate (bbl/d)",
      sortable: true,
      render: (test: WellTest) => test.oilRate?.toFixed(1) || "0",
    },
    {
      key: "gasRate",
      header: "Gas Rate (scf/d)",
      sortable: true,
      render: (test: WellTest) => test.gasRate?.toFixed(0) || "0",
    },
    {
      key: "waterRate",
      header: "Water Rate (bbl/d)",
      render: (test: WellTest) => test.waterRate?.toFixed(1) || "0",
    },
    {
      key: "gor",
      header: "GOR (scf/bbl)",
      render: (test: WellTest) => test.gor?.toFixed(0) || "0",
    },
    {
      key: "waterCut",
      header: "Water Cut (%)",
      render: (test: WellTest) => test.waterCut?.toFixed(1) || "0",
    },
    {
      key: "actions",
      header: "Actions",
      render: (test: WellTest) => (
        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDialog(test)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(test.id)}
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
        title="Well Test Management"
        description="Record and analyze well test data for production optimization"
        action={
          canEdit ? (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Record Well Test
            </Button>
          ) : undefined
        }
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTests}</div>
            <p className="text-xs text-muted-foreground">
              {productionTests} production tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Oil Rate</CardTitle>
            <Droplet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOilRate.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">bbl/day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Gas Rate</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgGasRate.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">scf/day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Test</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wellTests.length > 0
                ? format(new Date(wellTests[0].testDate), "MMM dd")
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {wellTests.length > 0 ? wellTests[0].well.wellName : "No tests yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Well</Label>
              <Select
                value={selectedWellFilter}
                onValueChange={setSelectedWellFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Wells" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wells</SelectItem>
                  {wells.map((well) => (
                    <SelectItem key={well.id} value={well.id}>
                      {well.wellName} - {well.wellId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Test Type</Label>
              <Select
                value={selectedTestType}
                onValueChange={setSelectedTestType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Test Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Test Types</SelectItem>
                  {Object.entries(testTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Well Test Records</CardTitle>
        </CardHeader>
        <CardContent>
          {wellTests.length === 0 && !isLoading ? (
            <EmptyState
              icon={TestTube}
              title="No well tests recorded"
              description="Start by recording your first well test to track production performance."
            />
          ) : (
            <DataTable
              data={wellTests}
              columns={columns}
              searchable
              searchPlaceholder="Search by well name or ID..."
              searchKeys={["well.wellName", "well.wellId"]}
              loading={isLoading}
              pageSize={10}
              emptyMessage="No well tests found"
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTest ? "Edit Well Test" : "Record New Well Test"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="testDate">Test Date *</Label>
                  <Input
                    id="testDate"
                    type="date"
                    value={formData.testDate}
                    onChange={(e) =>
                      setFormData({ ...formData, testDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="wellId">Well *</Label>
                  <Select
                    value={formData.wellId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, wellId: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select well" />
                    </SelectTrigger>
                    <SelectContent>
                      {wells.map((well) => (
                        <SelectItem key={well.id} value={well.id}>
                          {well.wellName} - {well.wellId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="testType">Test Type *</Label>
                  <Select
                    value={formData.testType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, testType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(testTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    step="0.1"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Production Rates */}
              <div className="space-y-2">
                <h4 className="font-medium">Production Rates</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="oilRate">Oil Rate (bbl/day)</Label>
                    <Input
                      id="oilRate"
                      type="number"
                      step="0.01"
                      value={formData.oilRate}
                      onChange={(e) =>
                        setFormData({ ...formData, oilRate: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="gasRate">Gas Rate (scf/day)</Label>
                    <Input
                      id="gasRate"
                      type="number"
                      step="0.01"
                      value={formData.gasRate}
                      onChange={(e) =>
                        setFormData({ ...formData, gasRate: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="waterRate">Water Rate (bbl/day)</Label>
                    <Input
                      id="waterRate"
                      type="number"
                      step="0.01"
                      value={formData.waterRate}
                      onChange={(e) =>
                        setFormData({ ...formData, waterRate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Values */}
              <div className="space-y-2">
                <h4 className="font-medium">Calculated Values (optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gor">GOR (scf/bbl)</Label>
                    <Input
                      id="gor"
                      type="number"
                      step="0.01"
                      value={formData.gor}
                      onChange={(e) =>
                        setFormData({ ...formData, gor: e.target.value })
                      }
                      placeholder="Auto-calculated from rates"
                    />
                  </div>

                  <div>
                    <Label htmlFor="waterCut">Water Cut (%)</Label>
                    <Input
                      id="waterCut"
                      type="number"
                      step="0.01"
                      value={formData.waterCut}
                      onChange={(e) =>
                        setFormData({ ...formData, waterCut: e.target.value })
                      }
                      placeholder="Auto-calculated from rates"
                    />
                  </div>
                </div>
              </div>

              {/* Pressure & Temperature */}
              <div className="space-y-2">
                <h4 className="font-medium">Pressure & Temperature</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="flowingTubingPressure">
                      Flowing Tubing Pressure (psi)
                    </Label>
                    <Input
                      id="flowingTubingPressure"
                      type="number"
                      step="0.01"
                      value={formData.flowingTubingPressure}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          flowingTubingPressure: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="flowingCasingPressure">
                      Flowing Casing Pressure (psi)
                    </Label>
                    <Input
                      id="flowingCasingPressure"
                      type="number"
                      step="0.01"
                      value={formData.flowingCasingPressure}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          flowingCasingPressure: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="staticPressure">
                      Static Pressure (psi)
                    </Label>
                    <Input
                      id="staticPressure"
                      type="number"
                      step="0.01"
                      value={formData.staticPressure}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          staticPressure: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="temperature">Temperature (°F)</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.01"
                      value={formData.temperature}
                      onChange={(e) =>
                        setFormData({ ...formData, temperature: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Other Parameters */}
              <div>
                <Label htmlFor="chokeSize">Choke Size (1/64")</Label>
                <Input
                  id="chokeSize"
                  type="number"
                  step="0.01"
                  value={formData.chokeSize}
                  onChange={(e) =>
                    setFormData({ ...formData, chokeSize: e.target.value })
                  }
                />
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
                  rows={3}
                  placeholder="Add any additional notes or observations..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTest ? "Update Test" : "Save Test"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}