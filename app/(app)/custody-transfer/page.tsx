'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { format } from 'date-fns';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  FileCheck, Plus, Edit, Trash2, MapPin, DollarSign,
  FileText, CheckCircle, AlertTriangle, Clock
} from 'lucide-react';

const fiscalPointTypes = [
  { value: 'export', label: 'Export' },
  { value: 'import', label: 'Import' },
  { value: 'sales', label: 'Sales' },
  { value: 'custody_transfer', label: 'Custody Transfer' },
  { value: 'allocation', label: 'Allocation' },
];

const transferStatuses = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'disputed', label: 'Disputed', color: 'bg-red-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-500' },
];

export default function CustodyTransferPage() {
  const { canEdit, isAdmin, userRole } = useUserRole();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('transfers');
  const [showPointDialog, setShowPointDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [editingPoint, setEditingPoint] = useState<any>(null);
  const [pointForm, setPointForm] = useState<any>({});
  const [transferForm, setTransferForm] = useState<any>({});

  // Fetch data
  const { data: fiscalPointsData, isLoading: loadingPoints } = useQuery({
    queryKey: ['fiscal-points'],
    queryFn: async () => {
      const res = await fetch('/api/fiscal-points');
      const result = await res.json();
      return result.data || [];
    },
  });

  const { data: transfersData, isLoading: loadingTransfers } = useQuery({
    queryKey: ['custody-transfers'],
    queryFn: async () => {
      const res = await fetch('/api/custody-transfers');
      const result = await res.json();
      return result.data || [];
    },
  });

  const { data: metersData } = useQuery({
    queryKey: ['meters'],
    queryFn: async () => {
      const res = await fetch('/api/meters');
      const result = await res.json();
      return result.data || [];
    },
  });

  // Mutations
  const createPoint = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/fiscal-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create fiscal point');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-points'] });
      toast.success('Fiscal point created successfully');
      setShowPointDialog(false);
      setPointForm({});
    },
    onError: () => toast.error('Failed to create fiscal point'),
  });

  const updatePoint = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/fiscal-points/${editingPoint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update fiscal point');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-points'] });
      toast.success('Fiscal point updated successfully');
      setShowPointDialog(false);
      setEditingPoint(null);
      setPointForm({});
    },
    onError: () => toast.error('Failed to update fiscal point'),
  });

  const deletePoint = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/fiscal-points/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete fiscal point');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-points'] });
      toast.success('Fiscal point deleted successfully');
    },
    onError: () => toast.error('Failed to delete fiscal point'),
  });

  const createTransfer = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/custody-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create transfer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody-transfers'] });
      toast.success('Custody transfer recorded successfully');
      setShowTransferDialog(false);
      setTransferForm({});
    },
    onError: () => toast.error('Failed to record transfer'),
  });

  const updateTransfer = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/custody-transfers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update transfer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody-transfers'] });
      toast.success('Transfer updated successfully');
    },
    onError: () => toast.error('Failed to update transfer'),
  });

  const fiscalPoints = fiscalPointsData || [];
  const transfers = transfersData || [];
  const meters = metersData || [];

  // Stats
  const activePoints = fiscalPoints.filter((p: any) => p.isActive).length;
  const completedTransfers = transfers.filter((t: any) => t.status === 'completed').length;
  const pendingTransfers = transfers.filter((t: any) => t.status === 'pending').length;
  const totalVolume = transfers.filter((t: any) => t.status === 'completed').reduce((sum: number, t: any) => sum + (t.netStandardVolume || 0), 0);

  const handlePointSubmit = () => {
    if (editingPoint) {
      updatePoint.mutate(pointForm);
    } else {
      createPoint.mutate(pointForm);
    }
  };

  const openEditPoint = (point: any) => {
    setEditingPoint(point);
    setPointForm({
      pointTag: point.pointTag,
      pointName: point.pointName,
      pointType: point.pointType,
      meterId: point.meterId,
      location: point.location,
      buyer: point.buyer,
      seller: point.seller,
      contractReference: point.contractReference,
      tolerancePercent: point.tolerancePercent,
      pricePerUnit: point.pricePerUnit,
      currency: point.currency,
      isActive: point.isActive,
      effectiveDate: point.effectiveDate ? format(new Date(point.effectiveDate), 'yyyy-MM-dd') : '',
      expiryDate: point.expiryDate ? format(new Date(point.expiryDate), 'yyyy-MM-dd') : '',
      comments: point.comments,
    });
    setShowPointDialog(true);
  };

  // Table columns
  const pointColumns = [
    { key: 'pointTag', header: 'Point Tag', sortable: true },
    { key: 'pointName', header: 'Name', sortable: true },
    {
      key: 'pointType',
      header: 'Type',
      render: (row: any) => <span className="capitalize">{row.pointType?.replace('_', ' ')}</span>,
    },
    { key: 'buyer', header: 'Buyer' },
    { key: 'seller', header: 'Seller' },
    { key: 'meter', header: 'Meter', render: (row: any) => row.meter?.meterName || '-' },
    {
      key: 'isActive',
      header: 'Status',
      render: (row: any) => (
        <Badge className={row.isActive ? 'bg-green-500' : 'bg-gray-500'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={() => openEditPoint(row)}>
                <Edit className="h-4 w-4" />
              </Button>
              {userRole === 'admin' && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => { if (confirm('Delete this fiscal point?')) deletePoint.mutate(row.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  const transferColumns = [
    {
      key: 'transferDate',
      header: 'Date',
      sortable: true,
      render: (row: any) => format(new Date(row.transferDate), 'MMM dd, yyyy'),
    },
    { key: 'ticketNumber', header: 'Ticket #', sortable: true },
    { key: 'fiscalPoint', header: 'Fiscal Point', render: (row: any) => row.fiscalPoint?.pointName || '-' },
    { key: 'product', header: 'Product' },
    { key: 'grossObservedVolume', header: 'GOV', render: (row: any) => row.grossObservedVolume?.toLocaleString() || '0' },
    { key: 'netStandardVolume', header: 'NSV', render: (row: any) => row.netStandardVolume?.toLocaleString() || '0' },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => {
        const status = transferStatuses.find(s => s.value === row.status);
        return <Badge className={`${status?.color} text-white`}>{status?.label}</Badge>;
      },
    },
    { key: 'buyer', header: 'Buyer' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          {canEdit && row.status === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateTransfer.mutate({ id: row.id, data: { status: 'completed' } })}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fiscal & Custody Transfer"
        description="Manage fiscal metering points and custody transfer transactions"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Fiscal Points" value={fiscalPoints.length} subtitle={`${activePoints} active`} icon={MapPin} colorClass="text-blue-600" iconBgClass="bg-blue-100" />
        <KPICard title="Completed Transfers" value={completedTransfers} icon={CheckCircle} colorClass="text-green-600" iconBgClass="bg-green-100" />
        <KPICard title="Pending Transfers" value={pendingTransfers} icon={Clock} colorClass="text-yellow-600" iconBgClass="bg-yellow-100" />
        <KPICard title="Total Volume (NSV)" value={Math.round(totalVolume / 1000)} subtitle="bbls" icon={FileCheck} colorClass="text-purple-600" iconBgClass="bg-purple-100" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transfers" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Custody Transfers
          </TabsTrigger>
          <TabsTrigger value="points" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Fiscal Points
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transfers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Custody Transfers</CardTitle>
              {canEdit && (
                <Button onClick={() => { setTransferForm({ transferDate: format(new Date(), 'yyyy-MM-dd'), status: 'pending' }); setShowTransferDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Record Transfer
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={transfers} columns={transferColumns} searchable searchKeys={['ticketNumber', 'product']} searchPlaceholder="Search transfers..." loading={loadingTransfers} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fiscal Metering Points</CardTitle>
              {canEdit && (
                <Button onClick={() => { setEditingPoint(null); setPointForm({}); setShowPointDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Fiscal Point
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={fiscalPoints} columns={pointColumns} searchable searchKeys={['pointTag', 'pointName']} searchPlaceholder="Search fiscal points..." loading={loadingPoints} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fiscal Point Dialog */}
      <Dialog open={showPointDialog} onOpenChange={setShowPointDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPoint ? 'Edit Fiscal Point' : 'Add Fiscal Point'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Point Tag *</Label>
              <Input value={pointForm.pointTag || ''} onChange={(e) => setPointForm({ ...pointForm, pointTag: e.target.value })} placeholder="e.g., FMP-001" disabled={!!editingPoint} />
            </div>
            <div>
              <Label>Point Name *</Label>
              <Input value={pointForm.pointName || ''} onChange={(e) => setPointForm({ ...pointForm, pointName: e.target.value })} placeholder="e.g., Export Terminal" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={pointForm.pointType || 'custody_transfer'} onValueChange={(v) => setPointForm({ ...pointForm, pointType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fiscalPointTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Linked Meter</Label>
              <Select value={pointForm.meterId || ''} onValueChange={(v) => setPointForm({ ...pointForm, meterId: v })}>
                <SelectTrigger><SelectValue placeholder="Select meter" /></SelectTrigger>
                <SelectContent>
                  {meters.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.meterName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Buyer</Label>
              <Input value={pointForm.buyer || ''} onChange={(e) => setPointForm({ ...pointForm, buyer: e.target.value })} />
            </div>
            <div>
              <Label>Seller</Label>
              <Input value={pointForm.seller || ''} onChange={(e) => setPointForm({ ...pointForm, seller: e.target.value })} />
            </div>
            <div>
              <Label>Contract Reference</Label>
              <Input value={pointForm.contractReference || ''} onChange={(e) => setPointForm({ ...pointForm, contractReference: e.target.value })} />
            </div>
            <div>
              <Label>Tolerance (%)</Label>
              <Input type="number" step="0.1" value={pointForm.tolerancePercent || '0.5'} onChange={(e) => setPointForm({ ...pointForm, tolerancePercent: e.target.value })} />
            </div>
            <div>
              <Label>Price Per Unit</Label>
              <Input type="number" step="0.01" value={pointForm.pricePerUnit || ''} onChange={(e) => setPointForm({ ...pointForm, pricePerUnit: e.target.value })} />
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={pointForm.currency || 'USD'} onChange={(e) => setPointForm({ ...pointForm, currency: e.target.value })} />
            </div>
            <div>
              <Label>Effective Date</Label>
              <Input type="date" value={pointForm.effectiveDate || ''} onChange={(e) => setPointForm({ ...pointForm, effectiveDate: e.target.value })} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={pointForm.expiryDate || ''} onChange={(e) => setPointForm({ ...pointForm, expiryDate: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Location</Label>
              <Input value={pointForm.location || ''} onChange={(e) => setPointForm({ ...pointForm, location: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Comments</Label>
              <Textarea value={pointForm.comments || ''} onChange={(e) => setPointForm({ ...pointForm, comments: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPointDialog(false)}>Cancel</Button>
            <Button onClick={handlePointSubmit} disabled={!pointForm.pointTag || !pointForm.pointName}>{editingPoint ? 'Update' : 'Create'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Custody Transfer</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Fiscal Point *</Label>
              <Select value={transferForm.fiscalPointId || ''} onValueChange={(v) => setTransferForm({ ...transferForm, fiscalPointId: v })}>
                <SelectTrigger><SelectValue placeholder="Select fiscal point" /></SelectTrigger>
                <SelectContent>
                  {fiscalPoints.filter((p: any) => p.isActive).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.pointName} ({p.pointTag})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transfer Date *</Label>
              <Input type="date" value={transferForm.transferDate || ''} onChange={(e) => setTransferForm({ ...transferForm, transferDate: e.target.value })} />
            </div>
            <div>
              <Label>Ticket Number</Label>
              <Input value={transferForm.ticketNumber || ''} onChange={(e) => setTransferForm({ ...transferForm, ticketNumber: e.target.value })} placeholder="e.g., TKT-2026-001" />
            </div>
            <div>
              <Label>Product</Label>
              <Input value={transferForm.product || ''} onChange={(e) => setTransferForm({ ...transferForm, product: e.target.value })} placeholder="e.g., Crude Oil" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={transferForm.status || 'pending'} onValueChange={(v) => setTransferForm({ ...transferForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {transferStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gross Observed Volume</Label>
              <Input type="number" value={transferForm.grossObservedVolume || ''} onChange={(e) => setTransferForm({ ...transferForm, grossObservedVolume: e.target.value })} />
            </div>
            <div>
              <Label>Gross Standard Volume</Label>
              <Input type="number" value={transferForm.grossStandardVolume || ''} onChange={(e) => setTransferForm({ ...transferForm, grossStandardVolume: e.target.value })} />
            </div>
            <div>
              <Label>Net Standard Volume</Label>
              <Input type="number" value={transferForm.netStandardVolume || ''} onChange={(e) => setTransferForm({ ...transferForm, netStandardVolume: e.target.value })} />
            </div>
            <div>
              <Label>Temperature (°F)</Label>
              <Input type="number" step="0.1" value={transferForm.temperature || ''} onChange={(e) => setTransferForm({ ...transferForm, temperature: e.target.value })} />
            </div>
            <div>
              <Label>API Gravity</Label>
              <Input type="number" step="0.1" value={transferForm.apiGravity || ''} onChange={(e) => setTransferForm({ ...transferForm, apiGravity: e.target.value })} />
            </div>
            <div>
              <Label>BS&W (%)</Label>
              <Input type="number" step="0.01" value={transferForm.bsw || ''} onChange={(e) => setTransferForm({ ...transferForm, bsw: e.target.value })} />
            </div>
            <div>
              <Label>VCF</Label>
              <Input type="number" step="0.0001" value={transferForm.vcf || '1.0'} onChange={(e) => setTransferForm({ ...transferForm, vcf: e.target.value })} />
            </div>
            <div>
              <Label>Meter Factor</Label>
              <Input type="number" step="0.0001" value={transferForm.meterFactor || '1.0'} onChange={(e) => setTransferForm({ ...transferForm, meterFactor: e.target.value })} />
            </div>
            <div>
              <Label>Buyer</Label>
              <Input value={transferForm.buyer || ''} onChange={(e) => setTransferForm({ ...transferForm, buyer: e.target.value })} />
            </div>
            <div>
              <Label>Seller</Label>
              <Input value={transferForm.seller || ''} onChange={(e) => setTransferForm({ ...transferForm, seller: e.target.value })} />
            </div>
            <div>
              <Label>BOL Number</Label>
              <Input value={transferForm.bolNumber || ''} onChange={(e) => setTransferForm({ ...transferForm, bolNumber: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Comments</Label>
              <Textarea value={transferForm.comments || ''} onChange={(e) => setTransferForm({ ...transferForm, comments: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
            <Button onClick={() => createTransfer.mutate(transferForm)} disabled={!transferForm.fiscalPointId || !transferForm.transferDate}>Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
