'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { format } from 'date-fns';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { KPICard } from '@/components/kpi-card';
import {
  Scale, Plus, Eye, CheckCircle, XCircle, AlertTriangle,
  FileText, TrendingUp, TrendingDown, BarChart3
} from 'lucide-react';

const reconciliationTypes = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

const reconciliationStatuses = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'pending_review', label: 'Pending Review', color: 'bg-yellow-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
];

const imbalanceCategories = [
  'Measurement error',
  'Meter drift',
  'Tank gauging error',
  'Evaporation loss',
  'Shrinkage',
  'Theft/pilferage',
  'Pipeline leak',
  'Temperature variation',
  'Unknown',
  'Other',
];

export default function ReconciliationPage() {
  const { canEdit, isAdmin, userRole } = useUserRole();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('reconciliations');
  const [showReconciliationDialog, setShowReconciliationDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showImbalanceDialog, setShowImbalanceDialog] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState<any>(null);
  const [reconciliationForm, setReconciliationForm] = useState<any>({});
  const [imbalanceForm, setImbalanceForm] = useState<any>({});

  // Fetch data
  const { data: reconciliationsData, isLoading: loadingReconciliations } = useQuery({
    queryKey: ['reconciliations'],
    queryFn: async () => {
      const res = await fetch('/api/reconciliations');
      const result = await res.json();
      return result.data || [];
    },
  });

  const { data: imbalancesData } = useQuery({
    queryKey: ['imbalances'],
    queryFn: async () => {
      const res = await fetch('/api/imbalances');
      const result = await res.json();
      return result.data || [];
    },
  });

  // Mutations
  const createReconciliation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/reconciliations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create reconciliation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      toast.success('Reconciliation created successfully');
      setShowReconciliationDialog(false);
      setReconciliationForm({});
    },
    onError: () => toast.error('Failed to create reconciliation'),
  });

  const updateReconciliation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/reconciliations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update reconciliation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      toast.success('Reconciliation updated successfully');
    },
    onError: () => toast.error('Failed to update reconciliation'),
  });

  const createImbalance = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/imbalances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create imbalance');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imbalances'] });
      toast.success('Imbalance recorded successfully');
      setShowImbalanceDialog(false);
      setImbalanceForm({});
    },
    onError: () => toast.error('Failed to record imbalance'),
  });

  const reconciliations = reconciliationsData || [];
  const imbalances = imbalancesData || [];

  // Stats
  const approvedCount = reconciliations.filter((r: any) => r.status === 'approved').length;
  const pendingCount = reconciliations.filter((r: any) => r.status === 'pending_review' || r.status === 'draft').length;
  const withinToleranceCount = reconciliations.filter((r: any) => r.withinTolerance).length;
  const unresolvedImbalances = imbalances.filter((i: any) => !i.isResolved).length;

  const openViewReconciliation = async (rec: any) => {
    try {
      const res = await fetch(`/api/reconciliations/${rec.id}`);
      const result = await res.json();
      setSelectedReconciliation(result.data);
      setShowViewDialog(true);
    } catch {
      toast.error('Failed to load reconciliation details');
    }
  };

  // Table columns
  const reconciliationColumns = [
    {
      key: 'reconciliationDate',
      header: 'Date',
      sortable: true,
      render: (row: any) => format(new Date(row.reconciliationDate), 'MMM dd, yyyy'),
    },
    {
      key: 'period',
      header: 'Period',
      render: (row: any) => `${format(new Date(row.periodStart), 'MMM dd')} - ${format(new Date(row.periodEnd), 'MMM dd, yyyy')}`,
    },
    {
      key: 'reconciliationType',
      header: 'Type',
      render: (row: any) => <span className="capitalize">{row.reconciliationType}</span>,
    },
    { key: 'product', header: 'Product' },
    {
      key: 'totalProduction',
      header: 'Production',
      render: (row: any) => row.totalProduction?.toLocaleString() || '0',
    },
    {
      key: 'imbalance',
      header: 'Imbalance',
      render: (row: any) => (
        <span className={row.imbalance > 0 ? 'text-green-600' : row.imbalance < 0 ? 'text-red-600' : ''}>
          {row.imbalance?.toLocaleString() || '0'}
        </span>
      ),
    },
    {
      key: 'imbalancePercent',
      header: 'Imbal %',
      render: (row: any) => (
        <span className={Math.abs(row.imbalancePercent || 0) > (row.tolerancePercent || 0.5) ? 'text-red-600 font-semibold' : 'text-green-600'}>
          {row.imbalancePercent?.toFixed(2) || '0.00'}%
        </span>
      ),
    },
    {
      key: 'withinTolerance',
      header: 'Tolerance',
      render: (row: any) => (
        <Badge className={row.withinTolerance ? 'bg-green-500' : 'bg-red-500'}>
          {row.withinTolerance ? 'Within' : 'Exceeded'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => {
        const status = reconciliationStatuses.find(s => s.value === row.status);
        return <Badge className={`${status?.color} text-white`}>{status?.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openViewReconciliation(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          {canEdit && row.status === 'draft' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateReconciliation.mutate({ id: row.id, data: { status: 'pending_review' } })}
            >
              Submit
            </Button>
          )}
          {userRole === 'admin' && row.status === 'pending_review' && (
            <>
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600"
                onClick={() => updateReconciliation.mutate({ id: row.id, data: { status: 'approved' } })}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => updateReconciliation.mutate({ id: row.id, data: { status: 'rejected' } })}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const imbalanceColumns = [
    {
      key: 'imbalanceDate',
      header: 'Date',
      sortable: true,
      render: (row: any) => format(new Date(row.imbalanceDate), 'MMM dd, yyyy'),
    },
    { key: 'product', header: 'Product' },
    { key: 'expectedVolume', header: 'Expected', render: (row: any) => row.expectedVolume?.toLocaleString() || '0' },
    { key: 'actualVolume', header: 'Actual', render: (row: any) => row.actualVolume?.toLocaleString() || '0' },
    {
      key: 'varianceVolume',
      header: 'Variance',
      render: (row: any) => (
        <span className={row.varianceVolume > 0 ? 'text-green-600' : 'text-red-600'}>
          {row.varianceVolume?.toLocaleString() || '0'}
        </span>
      ),
    },
    {
      key: 'variancePercent',
      header: 'Var %',
      render: (row: any) => `${row.variancePercent?.toFixed(2) || '0.00'}%`,
    },
    { key: 'category', header: 'Category' },
    {
      key: 'isResolved',
      header: 'Status',
      render: (row: any) => (
        <Badge className={row.isResolved ? 'bg-green-500' : 'bg-yellow-500'}>
          {row.isResolved ? 'Resolved' : 'Open'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Balance Reconciliation"
        description="Reconcile production, inventory, and sales volumes"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total Reconciliations" value={reconciliations.length} icon={Scale} colorClass="text-blue-600" iconBgClass="bg-blue-100" />
        <KPICard title="Approved" value={approvedCount} icon={CheckCircle} colorClass="text-green-600" iconBgClass="bg-green-100" />
        <KPICard title="Within Tolerance" value={withinToleranceCount} subtitle={`of ${reconciliations.length}`} icon={BarChart3} colorClass="text-purple-600" iconBgClass="bg-purple-100" />
        <KPICard title="Unresolved Imbalances" value={unresolvedImbalances} icon={AlertTriangle} colorClass="text-red-600" iconBgClass="bg-red-100" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reconciliations" className="flex items-center gap-2">
            <Scale className="h-4 w-4" /> Reconciliations
          </TabsTrigger>
          <TabsTrigger value="imbalances" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Imbalances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reconciliations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Balance Reconciliations</CardTitle>
              {canEdit && (
                <Button onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  setReconciliationForm({
                    reconciliationDate: format(today, 'yyyy-MM-dd'),
                    periodStart: format(firstDay, 'yyyy-MM-dd'),
                    periodEnd: format(today, 'yyyy-MM-dd'),
                    reconciliationType: 'monthly',
                    status: 'draft',
                    tolerancePercent: 0.5,
                  });
                  setShowReconciliationDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" /> New Reconciliation
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={reconciliations} columns={reconciliationColumns} searchable searchPlaceholder="Search reconciliations..." loading={loadingReconciliations} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imbalances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Imbalance Tracking</CardTitle>
              {canEdit && (
                <Button onClick={() => {
                  setImbalanceForm({ imbalanceDate: format(new Date(), 'yyyy-MM-dd') });
                  setShowImbalanceDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" /> Record Imbalance
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={imbalances} columns={imbalanceColumns} searchable searchPlaceholder="Search imbalances..." />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reconciliation Dialog */}
      <Dialog open={showReconciliationDialog} onOpenChange={setShowReconciliationDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Balance Reconciliation</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Period Info */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Reconciliation Date</Label>
                <Input type="date" value={reconciliationForm.reconciliationDate || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, reconciliationDate: e.target.value })} />
              </div>
              <div>
                <Label>Period Start</Label>
                <Input type="date" value={reconciliationForm.periodStart || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, periodStart: e.target.value })} />
              </div>
              <div>
                <Label>Period End</Label>
                <Input type="date" value={reconciliationForm.periodEnd || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, periodEnd: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={reconciliationForm.reconciliationType || 'monthly'} onValueChange={(v) => setReconciliationForm({ ...reconciliationForm, reconciliationType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {reconciliationTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Product</Label>
                <Input value={reconciliationForm.product || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, product: e.target.value })} placeholder="e.g., Crude Oil" />
              </div>
              <div>
                <Label>Field</Label>
                <Input value={reconciliationForm.field || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, field: e.target.value })} />
              </div>
              <div>
                <Label>Tolerance (%)</Label>
                <Input type="number" step="0.1" value={reconciliationForm.tolerancePercent || '0.5'} onChange={(e) => setReconciliationForm({ ...reconciliationForm, tolerancePercent: e.target.value })} />
              </div>
            </div>

            {/* Production */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Production</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Total Production</Label>
                  <Input type="number" value={reconciliationForm.totalProduction || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, totalProduction: e.target.value })} />
                </div>
                <div>
                  <Label>Metered Production</Label>
                  <Input type="number" value={reconciliationForm.meterProduction || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, meterProduction: e.target.value })} />
                </div>
                <div>
                  <Label>Allocated Production</Label>
                  <Input type="number" value={reconciliationForm.allocatedProduction || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, allocatedProduction: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Inventory</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Opening Stock</Label>
                  <Input type="number" value={reconciliationForm.openingStock || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, openingStock: e.target.value })} />
                </div>
                <div>
                  <Label>Closing Stock</Label>
                  <Input type="number" value={reconciliationForm.closingStock || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, closingStock: e.target.value })} />
                </div>
                <div>
                  <Label>Stock Change (calc)</Label>
                  <Input type="number" value={(parseFloat(reconciliationForm.closingStock || 0) - parseFloat(reconciliationForm.openingStock || 0)).toFixed(2)} disabled />
                </div>
              </CardContent>
            </Card>

            {/* Sales & Transfers */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Sales & Transfers</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Total Sales</Label>
                  <Input type="number" value={reconciliationForm.totalSales || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, totalSales: e.target.value })} />
                </div>
                <div>
                  <Label>Transfers In</Label>
                  <Input type="number" value={reconciliationForm.totalTransfersIn || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, totalTransfersIn: e.target.value })} />
                </div>
                <div>
                  <Label>Transfers Out</Label>
                  <Input type="number" value={reconciliationForm.totalTransfersOut || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, totalTransfersOut: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            {/* Losses */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Losses & Adjustments</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Flaring</Label>
                  <Input type="number" value={reconciliationForm.flaring || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, flaring: e.target.value })} />
                </div>
                <div>
                  <Label>Fuel & Loss</Label>
                  <Input type="number" value={reconciliationForm.fuelAndLoss || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, fuelAndLoss: e.target.value })} />
                </div>
                <div>
                  <Label>Shrinkage</Label>
                  <Input type="number" value={reconciliationForm.shrinkage || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, shrinkage: e.target.value })} />
                </div>
                <div>
                  <Label>Other Losses</Label>
                  <Input type="number" value={reconciliationForm.otherLosses || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, otherLosses: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <div>
              <Label>Comments</Label>
              <Textarea value={reconciliationForm.comments || ''} onChange={(e) => setReconciliationForm({ ...reconciliationForm, comments: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowReconciliationDialog(false)}>Cancel</Button>
            <Button onClick={() => createReconciliation.mutate(reconciliationForm)} disabled={!reconciliationForm.reconciliationDate || !reconciliationForm.periodStart || !reconciliationForm.periodEnd}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Reconciliation Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reconciliation Details</DialogTitle>
          </DialogHeader>
          {selectedReconciliation && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><strong>Date:</strong> {format(new Date(selectedReconciliation.reconciliationDate), 'MMM dd, yyyy')}</div>
                <div><strong>Period:</strong> {format(new Date(selectedReconciliation.periodStart), 'MMM dd')} - {format(new Date(selectedReconciliation.periodEnd), 'MMM dd, yyyy')}</div>
                <div><strong>Type:</strong> <span className="capitalize">{selectedReconciliation.reconciliationType}</span></div>
                <div><strong>Product:</strong> {selectedReconciliation.product || '-'}</div>
                <div><strong>Status:</strong> <Badge className={reconciliationStatuses.find(s => s.value === selectedReconciliation.status)?.color}>{reconciliationStatuses.find(s => s.value === selectedReconciliation.status)?.label}</Badge></div>
                <div><strong>Tolerance:</strong> ±{selectedReconciliation.tolerancePercent}%</div>
              </div>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Total Production:</strong> {selectedReconciliation.totalProduction?.toLocaleString()}</div>
                    <div><strong>Opening Stock:</strong> {selectedReconciliation.openingStock?.toLocaleString()}</div>
                    <div><strong>Total Sales:</strong> {selectedReconciliation.totalSales?.toLocaleString()}</div>
                    <div><strong>Closing Stock:</strong> {selectedReconciliation.closingStock?.toLocaleString()}</div>
                    <div><strong>Transfers In:</strong> {selectedReconciliation.totalTransfersIn?.toLocaleString()}</div>
                    <div><strong>Transfers Out:</strong> {selectedReconciliation.totalTransfersOut?.toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className={selectedReconciliation.withinTolerance ? 'border-green-500' : 'border-red-500'}>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      <span className={selectedReconciliation.imbalance > 0 ? 'text-green-600' : selectedReconciliation.imbalance < 0 ? 'text-red-600' : ''}>
                        {selectedReconciliation.imbalance?.toLocaleString()} bbls
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Imbalance ({selectedReconciliation.imbalancePercent?.toFixed(2)}%)
                    </div>
                    <Badge className={`mt-2 ${selectedReconciliation.withinTolerance ? 'bg-green-500' : 'bg-red-500'}`}>
                      {selectedReconciliation.withinTolerance ? 'Within Tolerance' : 'Tolerance Exceeded'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {selectedReconciliation.comments && (
                <div className="text-sm">
                  <strong>Comments:</strong> {selectedReconciliation.comments}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Imbalance Dialog */}
      <Dialog open={showImbalanceDialog} onOpenChange={setShowImbalanceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Imbalance</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={imbalanceForm.imbalanceDate || ''} onChange={(e) => setImbalanceForm({ ...imbalanceForm, imbalanceDate: e.target.value })} />
            </div>
            <div>
              <Label>Product</Label>
              <Input value={imbalanceForm.product || ''} onChange={(e) => setImbalanceForm({ ...imbalanceForm, product: e.target.value })} />
            </div>
            <div>
              <Label>Expected Volume</Label>
              <Input type="number" value={imbalanceForm.expectedVolume || ''} onChange={(e) => setImbalanceForm({ ...imbalanceForm, expectedVolume: e.target.value })} />
            </div>
            <div>
              <Label>Actual Volume</Label>
              <Input type="number" value={imbalanceForm.actualVolume || ''} onChange={(e) => setImbalanceForm({ ...imbalanceForm, actualVolume: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Category</Label>
              <Select value={imbalanceForm.category || ''} onValueChange={(v) => setImbalanceForm({ ...imbalanceForm, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {imbalanceCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Root Cause</Label>
              <Textarea value={imbalanceForm.rootCause || ''} onChange={(e) => setImbalanceForm({ ...imbalanceForm, rootCause: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Corrective Action</Label>
              <Textarea value={imbalanceForm.correctiveAction || ''} onChange={(e) => setImbalanceForm({ ...imbalanceForm, correctiveAction: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowImbalanceDialog(false)}>Cancel</Button>
            <Button onClick={() => createImbalance.mutate(imbalanceForm)} disabled={!imbalanceForm.imbalanceDate}>Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
