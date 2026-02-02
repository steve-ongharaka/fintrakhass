"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Plus, Edit2, Trash2, Calculator, Droplet, Bell, Clock, Mail } from "lucide-react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";

interface CorrectionFactor {
  id: string;
  productCode: string;
  shrinkageFactor?: number;
  vcfFactor?: number;
  densityAt15C?: number;
  thermalExpansion?: number;
  description?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session } = useSession() || {};
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<CorrectionFactor | null>(null);
  const [activeTab, setActiveTab] = useState("correction-factors");

  const [formData, setFormData] = useState({
    productCode: "",
    shrinkageFactor: "0.98",
    vcfFactor: "1.0",
    densityAt15C: "",
    thermalExpansion: "0.0007",
    description: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    isActive: true,
  });

  const userRole = (session?.user as any)?.role;
  const canEdit = userRole === "admin" || userRole === "operator";

  // Fetch correction factors
  const { data: factors = [], isLoading } = useQuery<CorrectionFactor[]>({
    queryKey: ["correctionFactors"],
    queryFn: async () => {
      const response = await fetch("/api/correction-factors");
      if (!response.ok) throw new Error("Failed to fetch correction factors");
      return response.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/correction-factors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create correction factor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["correctionFactors"] });
      toast.success("Correction factor created successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to create correction factor");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/correction-factors/${editingFactor?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update correction factor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["correctionFactors"] });
      toast.success("Correction factor updated successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to update correction factor");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/correction-factors/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete correction factor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["correctionFactors"] });
      toast.success("Correction factor deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete correction factor");
    },
  });

  const resetForm = () => {
    setFormData({
      productCode: "",
      shrinkageFactor: "0.98",
      vcfFactor: "1.0",
      densityAt15C: "",
      thermalExpansion: "0.0007",
      description: "",
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "",
      isActive: true,
    });
    setEditingFactor(null);
  };

  const handleEdit = (factor: CorrectionFactor) => {
    setEditingFactor(factor);
    setFormData({
      productCode: factor.productCode,
      shrinkageFactor: factor.shrinkageFactor?.toString() || "0.98",
      vcfFactor: factor.vcfFactor?.toString() || "1.0",
      densityAt15C: factor.densityAt15C?.toString() || "",
      thermalExpansion: factor.thermalExpansion?.toString() || "0.0007",
      description: factor.description || "",
      effectiveFrom: factor.effectiveFrom.split("T")[0],
      effectiveTo: factor.effectiveTo ? factor.effectiveTo.split("T")[0] : "",
      isActive: factor.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      productCode: formData.productCode,
      shrinkageFactor: formData.shrinkageFactor ? parseFloat(formData.shrinkageFactor) : null,
      vcfFactor: formData.vcfFactor ? parseFloat(formData.vcfFactor) : null,
      densityAt15C: formData.densityAt15C ? parseFloat(formData.densityAt15C) : null,
      thermalExpansion: formData.thermalExpansion ? parseFloat(formData.thermalExpansion) : null,
      description: formData.description || null,
      effectiveFrom: formData.effectiveFrom,
      effectiveTo: formData.effectiveTo || null,
      isActive: formData.isActive,
    };

    if (editingFactor) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      key: "productCode",
      header: "Product Code",
      sortable: true,
    },
    {
      key: "shrinkageFactor",
      header: "Shrinkage Factor",
      render: (row: CorrectionFactor) => row.shrinkageFactor?.toFixed(4) || "N/A",
    },
    {
      key: "vcfFactor",
      header: "VCF Factor",
      render: (row: CorrectionFactor) => row.vcfFactor?.toFixed(4) || "N/A",
    },
    {
      key: "thermalExpansion",
      header: "Thermal Expansion",
      render: (row: CorrectionFactor) => row.thermalExpansion?.toFixed(6) || "N/A",
    },
    {
      key: "effectiveFrom",
      header: "Effective From",
      render: (row: CorrectionFactor) => format(new Date(row.effectiveFrom), "MMM dd, yyyy"),
      sortable: true,
    },
    {
      key: "isActive",
      header: "Status",
      render: (row: CorrectionFactor) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure correction factors and calculation parameters"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="correction-factors">
            <Calculator className="h-4 w-4 mr-2" />
            Correction Factors
          </TabsTrigger>
          <TabsTrigger value="calculations">
            <Droplet className="h-4 w-4 mr-2" />
            Calculations
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="scheduled-reports">
            <Clock className="h-4 w-4 mr-2" />
            Scheduled Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="correction-factors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Volume Correction Factors</CardTitle>
                  <CardDescription>
                    Manage product-specific correction factors for volume calculations
                  </CardDescription>
                </div>
                {canEdit && (
                  <Button onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Factor
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={factors}
                columns={columns}
                searchable
                searchPlaceholder="Search by product code..."
                searchKeys={["productCode"]}
                loading={isLoading}
                emptyMessage="No correction factors configured"
                actions={canEdit ? (factor: CorrectionFactor) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(factor)}
                      className="hover:bg-blue-50"
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this correction factor?")) {
                          deleteMutation.mutate(factor.id);
                        }
                      }}
                      className="hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calculation Settings</CardTitle>
              <CardDescription>
                Configure automatic calculation parameters and rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-apply BSW Correction</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically calculate net oil from gross oil and BSW percentage
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-apply Shrinkage Factor</Label>
                      <p className="text-sm text-muted-foreground">
                        Apply shrinkage correction to calculate standard volumes
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-calculate GOR</Label>
                      <p className="text-sm text-muted-foreground">
                        Calculate Gas-Oil Ratio from production volumes
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-calculate Water Cut</Label>
                      <p className="text-sm text-muted-foreground">
                        Calculate water cut percentage from oil and water volumes
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Default Values</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Standard Temperature (°F)</Label>
                      <Input type="number" defaultValue="60" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label>Standard Pressure (PSI)</Label>
                      <Input type="number" defaultValue="14.7" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label>Default Shrinkage Factor</Label>
                      <Input type="number" step="0.01" defaultValue="0.98" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label>Default Thermal Expansion</Label>
                      <Input type="number" step="0.0001" defaultValue="0.0007" disabled={!canEdit} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notification Settings
              </CardTitle>
              <CardDescription>
                Configure which email notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Bell className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Production Alerts</h4>
                      <p className="text-sm text-muted-foreground">
                        Critical alerts for low production, equipment failures, threshold breaches
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <SettingsIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">System Alerts</h4>
                      <p className="text-sm text-muted-foreground">
                        Data anomalies, reconciliation issues, regulatory deadlines
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Mail className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Scheduled Report Delivery</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive automated reports via email on schedule
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Alert Thresholds</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lowProdThreshold">Low Production Threshold (%)</Label>
                    <Input 
                      id="lowProdThreshold" 
                      type="number" 
                      defaultValue="20" 
                      className="mt-1"
                      disabled={!canEdit}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Alert when production drops below this % of normal</p>
                  </div>
                  <div>
                    <Label htmlFor="highWaterCut">High Water Cut Threshold (%)</Label>
                    <Input 
                      id="highWaterCut" 
                      type="number" 
                      defaultValue="50" 
                      className="mt-1"
                      disabled={!canEdit}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Alert when water cut exceeds this value</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="scheduled-reports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Scheduled Reports
                  </CardTitle>
                  <CardDescription>
                    Configure automatic report generation and email delivery
                  </CardDescription>
                </div>
                {canEdit && (
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Schedule
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Example scheduled report cards */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Daily Production Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        Every day at 8:00 AM • PDF Format
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Last run: Today at 8:00 AM • Next run: Tomorrow at 8:00 AM
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Weekly Performance Report</h4>
                      <p className="text-sm text-muted-foreground">
                        Every Monday at 9:00 AM • Excel Format
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Last run: Monday at 9:00 AM • Next run: Next Monday at 9:00 AM
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Monthly Regulatory Report</h4>
                      <p className="text-sm text-muted-foreground">
                        1st of every month at 6:00 AM • PDF Format
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Paused</Badge>
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Last run: Jan 1, 2026 at 6:00 AM • Next run: Feb 1, 2026 at 6:00 AM
                  </p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">How Scheduled Reports Work</h4>
                <p className="text-sm text-blue-700">
                  Scheduled reports are automatically generated and sent to configured recipients via email.
                  Configure the frequency, time, and format. Reports include the latest data from your system.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFactor ? "Edit Correction Factor" : "Add Correction Factor"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="productCode">Product Code *</Label>
                <Input
                  id="productCode"
                  value={formData.productCode}
                  onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                  placeholder="e.g., OIL-001"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="shrinkageFactor">Shrinkage Factor</Label>
                  <Input
                    id="shrinkageFactor"
                    type="number"
                    step="0.0001"
                    value={formData.shrinkageFactor}
                    onChange={(e) => setFormData({ ...formData, shrinkageFactor: e.target.value })}
                    placeholder="0.98"
                  />
                  <p className="text-xs text-muted-foreground">Typical range: 0.95 - 1.00</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="vcfFactor">VCF Factor</Label>
                  <Input
                    id="vcfFactor"
                    type="number"
                    step="0.0001"
                    value={formData.vcfFactor}
                    onChange={(e) => setFormData({ ...formData, vcfFactor: e.target.value })}
                    placeholder="1.0"
                  />
                  <p className="text-xs text-muted-foreground">Volume Correction Factor</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="densityAt15C">Density at 15°C (kg/m³)</Label>
                  <Input
                    id="densityAt15C"
                    type="number"
                    step="0.1"
                    value={formData.densityAt15C}
                    onChange={(e) => setFormData({ ...formData, densityAt15C: e.target.value })}
                    placeholder="850.0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="thermalExpansion">Thermal Expansion</Label>
                  <Input
                    id="thermalExpansion"
                    type="number"
                    step="0.00001"
                    value={formData.thermalExpansion}
                    onChange={(e) => setFormData({ ...formData, thermalExpansion: e.target.value })}
                    placeholder="0.0007"
                  />
                  <p className="text-xs text-muted-foreground">Per °F</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="effectiveFrom">Effective From *</Label>
                  <Input
                    id="effectiveFrom"
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="effectiveTo">Effective To</Label>
                  <Input
                    id="effectiveTo"
                    type="date"
                    value={formData.effectiveTo}
                    onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional notes about this correction factor..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingFactor ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
