'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { PageHeader } from '@/components/page-header';
import { KPICard } from '@/components/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useUserRole } from '@/hooks/use-user-role';
import {
  Plus, FileText, Ship, ClipboardList, Calendar, Anchor, DollarSign, Edit, Trash2
} from 'lucide-react';

const nominationStatusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  revised: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
};

const liftingStatusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  delayed: 'bg-orange-100 text-orange-800',
};

export default function NominationsPage() {
  const { canEdit } = useUserRole();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('nominations');
  const [showNominationDialog, setShowNominationDialog] = useState(false);
  const [showLiftingDialog, setShowLiftingDialog] = useState(false);
  const [showAgreementDialog, setShowAgreementDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [nominationForm, setNominationForm] = useState({
    nominationMonth: '', buyerName: '', sellerName: '', product: 'Crude Oil',
    nominatedVolume: 0, minVolume: 0, maxVolume: 0, loadingPort: '', destinationPort: '',
    vesselName: '', vesselSize: '', status: 'draft', comments: ''
  });

  const [liftingForm, setLiftingForm] = useState({
    nominationId: '', scheduledDate: '', product: 'Crude Oil', vesselName: '',
    loadingPort: '', destinationPort: '', nominatedVolume: 0, status: 'scheduled', comments: ''
  });

  const [agreementForm, setAgreementForm] = useState({
    agreementName: '', buyerName: '', sellerName: '', product: 'Crude Oil',
    effectiveDate: '', expiryDate: '', contractType: 'Term', annualVolume: 0,
    minLiftingVolume: 0, maxLiftingVolume: 0, pricingBasis: 'Dated Brent',
    loadingPort: '', isActive: true, comments: ''
  });

  const { data: nominationsData, isLoading: nominationsLoading } = useQuery({
    queryKey: ['nominations'],
    queryFn: async () => {
      const res = await fetch('/api/nominations');
      if (!res.ok) throw new Error('Failed to fetch nominations');
      return res.json();
    }
  });

  const { data: liftingsData, isLoading: liftingsLoading } = useQuery({
    queryKey: ['liftings'],
    queryFn: async () => {
      const res = await fetch('/api/liftings');
      if (!res.ok) throw new Error('Failed to fetch liftings');
      return res.json();
    }
  });

  const { data: agreementsData, isLoading: agreementsLoading } = useQuery({
    queryKey: ['lifting-agreements'],
    queryFn: async () => {
      const res = await fetch('/api/lifting-agreements');
      if (!res.ok) throw new Error('Failed to fetch agreements');
      return res.json();
    }
  });

  const nominations = nominationsData?.data || [];
  const liftings = liftingsData?.data || [];
  const agreements = agreementsData?.data || [];

  const nominationMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/nominations/${editingItem.id}` : '/api/nominations';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save nomination');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nominations'] });
      toast.success(editingItem ? 'Nomination updated' : 'Nomination created');
      setShowNominationDialog(false);
      setEditingItem(null);
    },
    onError: () => toast.error('Failed to save nomination')
  });

  const liftingMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/liftings/${editingItem.id}` : '/api/liftings';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save lifting');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liftings'] });
      toast.success(editingItem ? 'Lifting updated' : 'Lifting created');
      setShowLiftingDialog(false);
      setEditingItem(null);
    },
    onError: () => toast.error('Failed to save lifting')
  });

  const agreementMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/lifting-agreements/${editingItem.id}` : '/api/lifting-agreements';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save agreement');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifting-agreements'] });
      toast.success(editingItem ? 'Agreement updated' : 'Agreement created');
      setShowAgreementDialog(false);
      setEditingItem(null);
    },
    onError: () => toast.error('Failed to save agreement')
  });

  const totalNominated = nominations.reduce((sum: number, n: any) => sum + (n.nominatedVolume || 0), 0);
  const totalLifted = liftings.filter((l: any) => l.status === 'completed').reduce((sum: number, l: any) => sum + (l.loadedVolume || 0), 0);
  const activeAgreements = agreements.filter((a: any) => a.isActive).length;

  const nominationColumns = [
    { key: 'nominationNumber', header: 'Nomination #', sortable: true },
    { key: 'nominationMonth', header: 'Month', render: (v: any) => v?.nominationMonth ? format(new Date(v.nominationMonth), 'MMM yyyy') : '-' },
    { key: 'buyerName', header: 'Buyer' },
    { key: 'product', header: 'Product' },
    { key: 'nominatedVolume', header: 'Volume (bbls)', render: (v: any) => v?.nominatedVolume?.toLocaleString() || '0' },
    { key: 'status', header: 'Status', render: (v: any) => (
      <Badge className={nominationStatusColors[v?.status] || 'bg-gray-100'}>{v?.status?.replace('_', ' ')}</Badge>
    )},
    { key: 'actions', header: 'Actions', render: (v: any) => canEdit && (
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setEditingItem(v); setNominationForm(v); setShowNominationDialog(true); }}><Edit className="h-4 w-4" /></Button>
      </div>
    )}
  ];

  const liftingColumns = [
    { key: 'liftingNumber', header: 'Lifting #', sortable: true },
    { key: 'scheduledDate', header: 'Scheduled Date', render: (v: any) => v?.scheduledDate ? format(new Date(v.scheduledDate), 'dd MMM yyyy') : '-' },
    { key: 'vesselName', header: 'Vessel' },
    { key: 'product', header: 'Product' },
    { key: 'loadedVolume', header: 'Loaded (bbls)', render: (v: any) => v?.loadedVolume?.toLocaleString() || '0' },
    { key: 'status', header: 'Status', render: (v: any) => (
      <Badge className={liftingStatusColors[v?.status] || 'bg-gray-100'}>{v?.status?.replace('_', ' ')}</Badge>
    )},
    { key: 'actions', header: 'Actions', render: (v: any) => canEdit && (
      <Button size="sm" variant="ghost" onClick={() => { setEditingItem(v); setLiftingForm(v); setShowLiftingDialog(true); }}><Edit className="h-4 w-4" /></Button>
    )}
  ];

  const agreementColumns = [
    { key: 'agreementNumber', header: 'Agreement #', sortable: true },
    { key: 'agreementName', header: 'Name' },
    { key: 'buyerName', header: 'Buyer' },
    { key: 'contractType', header: 'Type' },
    { key: 'annualVolume', header: 'Annual Volume', render: (v: any) => `${(v?.annualVolume || 0).toLocaleString()} bbls` },
    { key: 'isActive', header: 'Status', render: (v: any) => (
      <Badge className={v?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
        {v?.isActive ? 'Active' : 'Inactive'}
      </Badge>
    )},
    { key: 'actions', header: 'Actions', render: (v: any) => canEdit && (
      <Button size="sm" variant="ghost" onClick={() => { setEditingItem(v); setAgreementForm(v); setShowAgreementDialog(true); }}><Edit className="h-4 w-4" /></Button>
    )}
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nominations & Lifting"
        description="Manage production nominations, lifting operations, and agreements"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total Nominations" value={nominations.length} icon={FileText} colorClass="text-blue-600" />
        <KPICard title="Nominated Volume" value={Math.round(totalNominated)} unit="bbls" icon={ClipboardList} colorClass="text-purple-600" />
        <KPICard title="Total Lifted" value={Math.round(totalLifted)} unit="bbls" icon={Ship} colorClass="text-green-600" />
        <KPICard title="Active Agreements" value={activeAgreements} icon={DollarSign} colorClass="text-orange-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="nominations"><FileText className="h-4 w-4 mr-2" />Nominations</TabsTrigger>
          <TabsTrigger value="liftings"><Ship className="h-4 w-4 mr-2" />Liftings</TabsTrigger>
          <TabsTrigger value="agreements"><DollarSign className="h-4 w-4 mr-2" />Agreements</TabsTrigger>
        </TabsList>

        <TabsContent value="nominations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Production Nominations</CardTitle>
              {canEdit && (
                <Button onClick={() => { setEditingItem(null); setNominationForm({ nominationMonth: '', buyerName: '', sellerName: '', product: 'Crude Oil', nominatedVolume: 0, minVolume: 0, maxVolume: 0, loadingPort: '', destinationPort: '', vesselName: '', vesselSize: '', status: 'draft', comments: '' }); setShowNominationDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Add Nomination
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={nominations} columns={nominationColumns} loading={nominationsLoading} searchable searchKeys={['nominationNumber', 'buyerName']} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liftings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lifting Operations</CardTitle>
              {canEdit && (
                <Button onClick={() => { setEditingItem(null); setLiftingForm({ nominationId: '', scheduledDate: '', product: 'Crude Oil', vesselName: '', loadingPort: '', destinationPort: '', nominatedVolume: 0, status: 'scheduled', comments: '' }); setShowLiftingDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Add Lifting
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={liftings} columns={liftingColumns} loading={liftingsLoading} searchable searchKeys={['liftingNumber', 'vesselName']} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agreements">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lifting Agreements</CardTitle>
              {canEdit && (
                <Button onClick={() => { setEditingItem(null); setAgreementForm({ agreementName: '', buyerName: '', sellerName: '', product: 'Crude Oil', effectiveDate: '', expiryDate: '', contractType: 'Term', annualVolume: 0, minLiftingVolume: 0, maxLiftingVolume: 0, pricingBasis: 'Dated Brent', loadingPort: '', isActive: true, comments: '' }); setShowAgreementDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Add Agreement
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={agreements} columns={agreementColumns} loading={agreementsLoading} searchable searchKeys={['agreementNumber', 'agreementName', 'buyerName']} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Nomination Dialog */}
      <Dialog open={showNominationDialog} onOpenChange={setShowNominationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Nomination' : 'Add Nomination'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nomination Month</Label>
              <Input type="month" value={nominationForm.nominationMonth ? nominationForm.nominationMonth.substring(0, 7) : ''} onChange={(e) => setNominationForm({ ...nominationForm, nominationMonth: e.target.value + '-01' })} />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={nominationForm.product} onValueChange={(v) => setNominationForm({ ...nominationForm, product: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Crude Oil">Crude Oil</SelectItem>
                  <SelectItem value="Condensate">Condensate</SelectItem>
                  <SelectItem value="LNG">LNG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Buyer Name</Label>
              <Input value={nominationForm.buyerName} onChange={(e) => setNominationForm({ ...nominationForm, buyerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Seller Name</Label>
              <Input value={nominationForm.sellerName} onChange={(e) => setNominationForm({ ...nominationForm, sellerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nominated Volume (bbls)</Label>
              <Input type="number" value={nominationForm.nominatedVolume} onChange={(e) => setNominationForm({ ...nominationForm, nominatedVolume: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={nominationForm.status} onValueChange={(v) => setNominationForm({ ...nominationForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="revised">Revised</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loading Port</Label>
              <Input value={nominationForm.loadingPort} onChange={(e) => setNominationForm({ ...nominationForm, loadingPort: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Destination Port</Label>
              <Input value={nominationForm.destinationPort} onChange={(e) => setNominationForm({ ...nominationForm, destinationPort: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Comments</Label>
              <Textarea value={nominationForm.comments} onChange={(e) => setNominationForm({ ...nominationForm, comments: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNominationDialog(false)}>Cancel</Button>
            <Button onClick={() => nominationMutation.mutate({ ...nominationForm, nominationDate: new Date().toISOString() })} disabled={nominationMutation.isPending}>
              {nominationMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lifting Dialog */}
      <Dialog open={showLiftingDialog} onOpenChange={setShowLiftingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Lifting' : 'Add Lifting'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input type="date" value={liftingForm.scheduledDate ? liftingForm.scheduledDate.substring(0, 10) : ''} onChange={(e) => setLiftingForm({ ...liftingForm, scheduledDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={liftingForm.product} onValueChange={(v) => setLiftingForm({ ...liftingForm, product: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Crude Oil">Crude Oil</SelectItem>
                  <SelectItem value="Condensate">Condensate</SelectItem>
                  <SelectItem value="LNG">LNG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vessel Name</Label>
              <Input value={liftingForm.vesselName} onChange={(e) => setLiftingForm({ ...liftingForm, vesselName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nominated Volume (bbls)</Label>
              <Input type="number" value={liftingForm.nominatedVolume} onChange={(e) => setLiftingForm({ ...liftingForm, nominatedVolume: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Loading Port</Label>
              <Input value={liftingForm.loadingPort} onChange={(e) => setLiftingForm({ ...liftingForm, loadingPort: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={liftingForm.status} onValueChange={(v) => setLiftingForm({ ...liftingForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Comments</Label>
              <Textarea value={liftingForm.comments} onChange={(e) => setLiftingForm({ ...liftingForm, comments: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLiftingDialog(false)}>Cancel</Button>
            <Button onClick={() => liftingMutation.mutate(liftingForm)} disabled={liftingMutation.isPending}>
              {liftingMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agreement Dialog */}
      <Dialog open={showAgreementDialog} onOpenChange={setShowAgreementDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Agreement' : 'Add Agreement'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Agreement Name</Label>
              <Input value={agreementForm.agreementName} onChange={(e) => setAgreementForm({ ...agreementForm, agreementName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contract Type</Label>
              <Select value={agreementForm.contractType} onValueChange={(v) => setAgreementForm({ ...agreementForm, contractType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term">Term</SelectItem>
                  <SelectItem value="Spot">Spot</SelectItem>
                  <SelectItem value="Evergreen">Evergreen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Buyer Name</Label>
              <Input value={agreementForm.buyerName} onChange={(e) => setAgreementForm({ ...agreementForm, buyerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Seller Name</Label>
              <Input value={agreementForm.sellerName} onChange={(e) => setAgreementForm({ ...agreementForm, sellerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input type="date" value={agreementForm.effectiveDate ? agreementForm.effectiveDate.substring(0, 10) : ''} onChange={(e) => setAgreementForm({ ...agreementForm, effectiveDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Annual Volume (bbls)</Label>
              <Input type="number" value={agreementForm.annualVolume} onChange={(e) => setAgreementForm({ ...agreementForm, annualVolume: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Pricing Basis</Label>
              <Select value={agreementForm.pricingBasis} onValueChange={(v) => setAgreementForm({ ...agreementForm, pricingBasis: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dated Brent">Dated Brent</SelectItem>
                  <SelectItem value="WTI">WTI</SelectItem>
                  <SelectItem value="Bonny Light">Bonny Light</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loading Port</Label>
              <Input value={agreementForm.loadingPort} onChange={(e) => setAgreementForm({ ...agreementForm, loadingPort: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgreementDialog(false)}>Cancel</Button>
            <Button onClick={() => agreementMutation.mutate(agreementForm)} disabled={agreementMutation.isPending}>
              {agreementMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
