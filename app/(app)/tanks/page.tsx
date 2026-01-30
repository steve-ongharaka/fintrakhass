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
  Container, Plus, Edit, Trash2, ArrowUpDown, Droplets,
  TrendingUp, TrendingDown, Package
} from 'lucide-react';

const tankTypes = [
  { value: 'fixed_roof', label: 'Fixed Roof' },
  { value: 'floating_roof', label: 'Floating Roof' },
  { value: 'spherical', label: 'Spherical' },
  { value: 'bullet', label: 'Bullet' },
  { value: 'underground', label: 'Underground' },
];

const tankStatuses = [
  { value: 'in_service', label: 'In Service', color: 'bg-green-500' },
  { value: 'out_of_service', label: 'Out of Service', color: 'bg-gray-500' },
  { value: 'under_maintenance', label: 'Under Maintenance', color: 'bg-yellow-500' },
  { value: 'empty', label: 'Empty', color: 'bg-blue-500' },
];

const movementTypes = [
  { value: 'receipt', label: 'Receipt', color: 'bg-green-500', icon: TrendingUp },
  { value: 'dispatch', label: 'Dispatch', color: 'bg-red-500', icon: TrendingDown },
  { value: 'transfer_in', label: 'Transfer In', color: 'bg-blue-500', icon: TrendingUp },
  { value: 'transfer_out', label: 'Transfer Out', color: 'bg-orange-500', icon: TrendingDown },
  { value: 'adjustment', label: 'Adjustment', color: 'bg-purple-500', icon: ArrowUpDown },
  { value: 'loss', label: 'Loss', color: 'bg-gray-500', icon: TrendingDown },
];

export default function TanksPage() {
  const { canEdit, isAdmin, userRole } = useUserRole();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('tanks');
  const [showTankDialog, setShowTankDialog] = useState(false);
  const [showGaugingDialog, setShowGaugingDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [editingTank, setEditingTank] = useState<any>(null);
  const [tankForm, setTankForm] = useState<any>({});
  const [gaugingForm, setGaugingForm] = useState<any>({});
  const [movementForm, setMovementForm] = useState<any>({});

  // Fetch data with proper error handling
  const { data: tanksData, isLoading: loadingTanks } = useQuery({
    queryKey: ['tanks'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/tanks');
        if (!res.ok) return [];
        const result = await res.json();
        return result?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: facilitiesData } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/facilities');
        if (!res.ok) return [];
        const result = await res.json();
        return result?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: gaugingsData } = useQuery({
    queryKey: ['tank-gaugings'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/tank-gaugings');
        if (!res.ok) return [];
        const result = await res.json();
        return result?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: movementsData } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/stock-movements');
        if (!res.ok) return [];
        const result = await res.json();
        return result?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Mutations
  const createTank = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/tanks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create tank');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      toast.success('Tank created successfully');
      setShowTankDialog(false);
      setTankForm({});
    },
    onError: () => toast.error('Failed to create tank'),
  });

  const updateTank = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/tanks/${editingTank.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update tank');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      toast.success('Tank updated successfully');
      setShowTankDialog(false);
      setEditingTank(null);
      setTankForm({});
    },
    onError: () => toast.error('Failed to update tank'),
  });

  const deleteTank = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tanks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete tank');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      toast.success('Tank deleted successfully');
    },
    onError: () => toast.error('Failed to delete tank'),
  });

  const createGauging = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/tank-gaugings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create gauging');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tank-gaugings'] });
      toast.success('Gauging recorded successfully');
      setShowGaugingDialog(false);
      setGaugingForm({});
    },
    onError: () => toast.error('Failed to record gauging'),
  });

  const createMovement = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create movement');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Stock movement recorded successfully');
      setShowMovementDialog(false);
      setMovementForm({});
    },
    onError: () => toast.error('Failed to record movement'),
  });

  const tanks = tanksData || [];
  const gaugings = gaugingsData || [];
  const movements = movementsData || [];
  const facilities = facilitiesData || [];

  // Stats
  const inServiceTanks = tanks.filter((t: any) => t.status === 'in_service').length;
  const totalCapacity = tanks.reduce((sum: number, t: any) => sum + (t.nominalCapacity || 0), 0);
  const receiptsThisMonth = movements.filter((m: any) => m.movementType === 'receipt').length;
  const dispatchesThisMonth = movements.filter((m: any) => m.movementType === 'dispatch').length;

  const handleTankSubmit = () => {
    if (editingTank) {
      updateTank.mutate(tankForm);
    } else {
      createTank.mutate(tankForm);
    }
  };

  const openEditTank = (tank: any) => {
    setEditingTank(tank);
    setTankForm({
      tankTag: tank.tankTag,
      tankName: tank.tankName,
      tankType: tank.tankType,
      facilityId: tank.facilityId,
      location: tank.location,
      product: tank.product,
      nominalCapacity: tank.nominalCapacity,
      workingCapacity: tank.workingCapacity,
      deadStock: tank.deadStock,
      shellHeight: tank.shellHeight,
      diameter: tank.diameter,
      roofType: tank.roofType,
      heatingSystem: tank.heatingSystem,
      status: tank.status,
      comments: tank.comments,
    });
    setShowTankDialog(true);
  };

  // Table columns
  const tankColumns = [
    { key: 'tankTag', header: 'Tank Tag', sortable: true },
    { key: 'tankName', header: 'Name', sortable: true },
    {
      key: 'tankType',
      header: 'Type',
      render: (row: any) => <span className="capitalize">{row.tankType?.replace('_', ' ')}</span>,
    },
    { key: 'product', header: 'Product' },
    {
      key: 'nominalCapacity',
      header: 'Capacity (bbls)',
      render: (row: any) => row.nominalCapacity?.toLocaleString() || '-',
    },
    {
      key: 'facility',
      header: 'Facility',
      render: (row: any) => row.facility?.facilityName || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => {
        const status = tankStatuses.find(s => s.value === row.status);
        return <Badge className={`${status?.color} text-white`}>{status?.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={() => openEditTank(row)}>
                <Edit className="h-4 w-4" />
              </Button>
              {userRole === 'admin' && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => { if (confirm('Delete this tank?')) deleteTank.mutate(row.id); }}
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

  const gaugingColumns = [
    {
      key: 'gaugingDate',
      header: 'Date',
      sortable: true,
      render: (row: any) => format(new Date(row.gaugingDate), 'MMM dd, yyyy'),
    },
    { key: 'gaugingTime', header: 'Time' },
    { key: 'tank', header: 'Tank', render: (row: any) => row.tank?.tankName || '-' },
    { key: 'liquidLevel', header: 'Level (ft)', render: (row: any) => row.liquidLevel?.toFixed(2) || '-' },
    { key: 'grossObservedVolume', header: 'GOV (bbls)', render: (row: any) => row.grossObservedVolume?.toLocaleString() || '-' },
    { key: 'netStandardVolume', header: 'NSV (bbls)', render: (row: any) => row.netStandardVolume?.toLocaleString() || '-' },
    { key: 'temperature', header: 'Temp (°F)', render: (row: any) => row.temperature?.toFixed(1) || '-' },
    { key: 'bsw', header: 'BS&W %', render: (row: any) => row.bsw?.toFixed(2) || '-' },
    { key: 'gaugedBy', header: 'Gauged By' },
  ];

  const movementColumns = [
    {
      key: 'movementDate',
      header: 'Date',
      sortable: true,
      render: (row: any) => format(new Date(row.movementDate), 'MMM dd, yyyy'),
    },
    {
      key: 'movementType',
      header: 'Type',
      render: (row: any) => {
        const type = movementTypes.find(t => t.value === row.movementType);
        return <Badge className={`${type?.color} text-white`}>{type?.label}</Badge>;
      },
    },
    { key: 'tank', header: 'Tank', render: (row: any) => row.tank?.tankName || '-' },
    { key: 'product', header: 'Product' },
    { key: 'grossVolume', header: 'Gross Vol', render: (row: any) => row.grossVolume?.toLocaleString() || '0' },
    { key: 'netVolume', header: 'Net Vol', render: (row: any) => row.netVolume?.toLocaleString() || '0' },
    { key: 'carrier', header: 'Carrier' },
    { key: 'sourceDocument', header: 'Document #' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tank & Inventory Management"
        description="Manage tanks, gaugings, and stock movements"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total Tanks" value={tanks.length} icon={Container} colorClass="text-blue-600" iconBgClass="bg-blue-100" />
        <KPICard title="In Service" value={inServiceTanks} icon={Droplets} colorClass="text-green-600" iconBgClass="bg-green-100" />
        <KPICard title="Total Capacity" value={Math.round(totalCapacity / 1000)} subtitle="bbls" icon={Package} colorClass="text-purple-600" iconBgClass="bg-purple-100" />
        <KPICard title="Movements Today" value={receiptsThisMonth + dispatchesThisMonth} icon={ArrowUpDown} colorClass="text-orange-600" iconBgClass="bg-orange-100" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tanks" className="flex items-center gap-2">
            <Container className="h-4 w-4" /> Tanks
          </TabsTrigger>
          <TabsTrigger value="gaugings" className="flex items-center gap-2">
            <Droplets className="h-4 w-4" /> Gaugings
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" /> Stock Movements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tanks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tanks</CardTitle>
              {canEdit && (
                <Button onClick={() => { setEditingTank(null); setTankForm({}); setShowTankDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Tank
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={tanks} columns={tankColumns} searchable searchKeys={['tankTag', 'tankName']} searchPlaceholder="Search tanks..." loading={loadingTanks} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaugings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tank Gaugings</CardTitle>
              {canEdit && (
                <Button onClick={() => { setGaugingForm({ gaugingDate: format(new Date(), 'yyyy-MM-dd'), gaugingTime: format(new Date(), 'HH:mm') }); setShowGaugingDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Record Gauging
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={gaugings} columns={gaugingColumns} searchable searchPlaceholder="Search gaugings..." />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Stock Movements</CardTitle>
              {canEdit && (
                <Button onClick={() => { setMovementForm({ movementDate: format(new Date(), 'yyyy-MM-dd'), movementType: 'receipt' }); setShowMovementDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Record Movement
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={movements} columns={movementColumns} searchable searchPlaceholder="Search movements..." />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tank Dialog */}
      <Dialog open={showTankDialog} onOpenChange={setShowTankDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTank ? 'Edit Tank' : 'Add New Tank'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tank Tag *</Label>
              <Input value={tankForm.tankTag || ''} onChange={(e) => setTankForm({ ...tankForm, tankTag: e.target.value })} placeholder="e.g., TK-001" disabled={!!editingTank} />
            </div>
            <div>
              <Label>Tank Name *</Label>
              <Input value={tankForm.tankName || ''} onChange={(e) => setTankForm({ ...tankForm, tankName: e.target.value })} placeholder="e.g., Oil Storage Tank 1" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={tankForm.tankType || 'fixed_roof'} onValueChange={(v) => setTankForm({ ...tankForm, tankType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tankTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={tankForm.status || 'in_service'} onValueChange={(v) => setTankForm({ ...tankForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tankStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Product</Label>
              <Input value={tankForm.product || ''} onChange={(e) => setTankForm({ ...tankForm, product: e.target.value })} placeholder="e.g., Crude Oil" />
            </div>
            <div>
              <Label>Facility</Label>
              <Select value={tankForm.facilityId || ''} onValueChange={(v) => setTankForm({ ...tankForm, facilityId: v })}>
                <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                <SelectContent>
                  {facilities.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.facilityName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nominal Capacity (bbls)</Label>
              <Input type="number" value={tankForm.nominalCapacity || ''} onChange={(e) => setTankForm({ ...tankForm, nominalCapacity: e.target.value })} />
            </div>
            <div>
              <Label>Working Capacity (bbls)</Label>
              <Input type="number" value={tankForm.workingCapacity || ''} onChange={(e) => setTankForm({ ...tankForm, workingCapacity: e.target.value })} />
            </div>
            <div>
              <Label>Dead Stock (bbls)</Label>
              <Input type="number" value={tankForm.deadStock || ''} onChange={(e) => setTankForm({ ...tankForm, deadStock: e.target.value })} />
            </div>
            <div>
              <Label>Shell Height (ft)</Label>
              <Input type="number" step="0.1" value={tankForm.shellHeight || ''} onChange={(e) => setTankForm({ ...tankForm, shellHeight: e.target.value })} />
            </div>
            <div>
              <Label>Diameter (ft)</Label>
              <Input type="number" step="0.1" value={tankForm.diameter || ''} onChange={(e) => setTankForm({ ...tankForm, diameter: e.target.value })} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={tankForm.location || ''} onChange={(e) => setTankForm({ ...tankForm, location: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Comments</Label>
              <Textarea value={tankForm.comments || ''} onChange={(e) => setTankForm({ ...tankForm, comments: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowTankDialog(false)}>Cancel</Button>
            <Button onClick={handleTankSubmit} disabled={!tankForm.tankTag || !tankForm.tankName}>{editingTank ? 'Update' : 'Create'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gauging Dialog */}
      <Dialog open={showGaugingDialog} onOpenChange={setShowGaugingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Tank Gauging</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Tank *</Label>
              <Select value={gaugingForm.tankId || ''} onValueChange={(v) => setGaugingForm({ ...gaugingForm, tankId: v })}>
                <SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger>
                <SelectContent>
                  {tanks.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.tankName} ({t.tankTag})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={gaugingForm.gaugingDate || ''} onChange={(e) => setGaugingForm({ ...gaugingForm, gaugingDate: e.target.value })} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={gaugingForm.gaugingTime || ''} onChange={(e) => setGaugingForm({ ...gaugingForm, gaugingTime: e.target.value })} />
            </div>
            <div>
              <Label>Liquid Level (ft)</Label>
              <Input type="number" step="0.01" value={gaugingForm.liquidLevel || ''} onChange={(e) => setGaugingForm({ ...gaugingForm, liquidLevel: e.target.value })} />
            </div>
            <div>
              <Label>Temperature (°F)</Label>
              <Input type="number" step="0.1" value={gaugingForm.temperature || ''} onChange={(e) => setGaugingForm({ ...gaugingForm, temperature: e.target.value })} />
            </div>
            <div>
              <Label>Gross Observed Volume</Label>
              <Input type="number" value={gaugingForm.grossObservedVolume || ''} onChange={(e) => setGaugingForm({ ...gaugingForm, grossObservedVolume: e.target.value })} />
            </div>
            <div>
              <Label>Net Standard Volume</Label>
              <Input type="number" value={gaugingForm.netStandardVolume || ''} onChange={(e) => setGaugingForm({ ...gaugingForm, netStandardVolume: e.target.value })} />
            </div>
            <div>
              <Label>BS&W (%)</Label>
              <Input type="number" step="0.01" value={gaugingForm.bsw || ''} onChange={(e) => setGaugingForm({ ...gaugingForm, bsw: e.target.value })} />
            </div>
            <div>
              <Label>VCF</Label>
              <Input type="number" step="0.0001" value={gaugingForm.vcf || '1.0'} onChange={(e) => setGaugingForm({ ...gaugingForm, vcf: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowGaugingDialog(false)}>Cancel</Button>
            <Button onClick={() => createGauging.mutate(gaugingForm)} disabled={!gaugingForm.tankId || !gaugingForm.gaugingDate}>Record</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={movementForm.movementDate || ''} onChange={(e) => setMovementForm({ ...movementForm, movementDate: e.target.value })} />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={movementForm.movementType || 'receipt'} onValueChange={(v) => setMovementForm({ ...movementForm, movementType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {movementTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Tank</Label>
              <Select value={movementForm.tankId || ''} onValueChange={(v) => setMovementForm({ ...movementForm, tankId: v })}>
                <SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger>
                <SelectContent>
                  {tanks.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.tankName} ({t.tankTag})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gross Volume</Label>
              <Input type="number" value={movementForm.grossVolume || ''} onChange={(e) => setMovementForm({ ...movementForm, grossVolume: e.target.value })} />
            </div>
            <div>
              <Label>Net Volume</Label>
              <Input type="number" value={movementForm.netVolume || ''} onChange={(e) => setMovementForm({ ...movementForm, netVolume: e.target.value })} />
            </div>
            <div>
              <Label>Product</Label>
              <Input value={movementForm.product || ''} onChange={(e) => setMovementForm({ ...movementForm, product: e.target.value })} />
            </div>
            <div>
              <Label>Carrier</Label>
              <Input value={movementForm.carrier || ''} onChange={(e) => setMovementForm({ ...movementForm, carrier: e.target.value })} placeholder="e.g., Truck, Pipeline" />
            </div>
            <div>
              <Label>Document Number</Label>
              <Input value={movementForm.sourceDocument || ''} onChange={(e) => setMovementForm({ ...movementForm, sourceDocument: e.target.value })} placeholder="e.g., BOL-12345" />
            </div>
            <div>
              <Label>Vehicle ID</Label>
              <Input value={movementForm.vehicleId || ''} onChange={(e) => setMovementForm({ ...movementForm, vehicleId: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Comments</Label>
              <Textarea value={movementForm.comments || ''} onChange={(e) => setMovementForm({ ...movementForm, comments: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowMovementDialog(false)}>Cancel</Button>
            <Button onClick={() => createMovement.mutate(movementForm)} disabled={!movementForm.movementDate || !movementForm.movementType}>Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
