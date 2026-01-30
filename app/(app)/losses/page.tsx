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
  Plus, AlertTriangle, Flame, Droplets, TrendingDown, DollarSign, Edit
} from 'lucide-react';

const categoryLabels: Record<string, string> = {
  flaring: 'Flaring', venting: 'Venting', spillage: 'Spillage', evaporation: 'Evaporation',
  theft: 'Theft', measurement_error: 'Measurement Error', shrinkage: 'Shrinkage',
  pigging_losses: 'Pigging Losses', tank_bottoms: 'Tank Bottoms', pipeline_losses: 'Pipeline Losses',
  processing_losses: 'Processing Losses', fuel_consumption: 'Fuel Consumption', other: 'Other'
};

const severityColors: Record<string, string> = {
  minor: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  major: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const statusColors: Record<string, string> = {
  reported: 'bg-blue-100 text-blue-800',
  under_investigation: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-orange-100 text-orange-800',
  recovered: 'bg-green-100 text-green-800',
  written_off: 'bg-gray-100 text-gray-800',
};

export default function LossesPage() {
  const { canEdit } = useUserRole();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('events');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showFlaringDialog, setShowFlaringDialog] = useState(false);
  const [showShrinkageDialog, setShowShrinkageDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [eventForm, setEventForm] = useState({
    eventDate: '', category: 'flaring', severity: 'minor', status: 'reported',
    location: '', product: 'Gas', volumeLost: 0, volumeUnit: 'mscf',
    estimatedValue: 0, flaringReason: '', rootCause: '', comments: ''
  });

  const [flaringForm, setFlaringForm] = useState({
    recordDate: '', flaringPointName: '', product: 'gas', volumeFlared: 0,
    volumeUnit: 'mscf', duration: 0, flaringReason: 'routine', isPermitted: true, comments: ''
  });

  const [shrinkageForm, setShrinkageForm] = useState({
    recordDate: '', product: 'Crude Oil', inletVolume: 0, outletVolume: 0,
    shrinkageCause: '', temperature: 0, pressure: 0, comments: ''
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['loss-events'],
    queryFn: async () => {
      const res = await fetch('/api/loss-events');
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    }
  });

  const { data: flaringData, isLoading: flaringLoading } = useQuery({
    queryKey: ['flaring-records'],
    queryFn: async () => {
      const res = await fetch('/api/flaring-records');
      if (!res.ok) throw new Error('Failed to fetch flaring records');
      return res.json();
    }
  });

  const { data: shrinkageData, isLoading: shrinkageLoading } = useQuery({
    queryKey: ['shrinkage-records'],
    queryFn: async () => {
      const res = await fetch('/api/shrinkage-records');
      if (!res.ok) throw new Error('Failed to fetch shrinkage records');
      return res.json();
    }
  });

  const events = eventsData?.data || [];
  const flaringRecords = flaringData?.data || [];
  const shrinkageRecords = shrinkageData?.data || [];

  const eventMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/loss-events/${editingItem.id}` : '/api/loss-events';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save event');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loss-events'] });
      toast.success(editingItem ? 'Event updated' : 'Event recorded');
      setShowEventDialog(false);
      setEditingItem(null);
    },
    onError: () => toast.error('Failed to save event')
  });

  const flaringMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/flaring-records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save flaring record');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flaring-records'] });
      toast.success('Flaring record saved');
      setShowFlaringDialog(false);
    },
    onError: () => toast.error('Failed to save flaring record')
  });

  const shrinkageMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/shrinkage-records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save shrinkage record');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrinkage-records'] });
      toast.success('Shrinkage record saved');
      setShowShrinkageDialog(false);
    },
    onError: () => toast.error('Failed to save shrinkage record')
  });

  const totalLossVolume = events.reduce((sum: number, e: any) => sum + (e.volumeLost || 0), 0);
  const totalLossValue = events.reduce((sum: number, e: any) => sum + (e.estimatedValue || 0), 0);
  const totalFlared = flaringRecords.reduce((sum: number, r: any) => sum + (r.volumeFlared || 0), 0);
  const totalShrinkage = shrinkageRecords.reduce((sum: number, r: any) => sum + (r.shrinkageVolume || 0), 0);

  const eventColumns = [
    { key: 'eventNumber', header: 'Event #', sortable: true },
    { key: 'eventDate', header: 'Date', render: (v: any) => v?.eventDate ? format(new Date(v.eventDate), 'dd MMM yyyy') : '-' },
    { key: 'category', header: 'Category', render: (v: any) => categoryLabels[v?.category] || v?.category },
    { key: 'product', header: 'Product' },
    { key: 'volumeLost', header: 'Volume Lost', render: (v: any) => `${(v?.volumeLost || 0).toLocaleString()} ${v?.volumeUnit || ''}` },
    { key: 'severity', header: 'Severity', render: (v: any) => (
      <Badge className={severityColors[v?.severity] || 'bg-gray-100'}>{v?.severity}</Badge>
    )},
    { key: 'status', header: 'Status', render: (v: any) => (
      <Badge className={statusColors[v?.status] || 'bg-gray-100'}>{v?.status?.replace('_', ' ')}</Badge>
    )},
    { key: 'actions', header: 'Actions', render: (v: any) => canEdit && (
      <Button size="sm" variant="ghost" onClick={() => { setEditingItem(v); setEventForm(v); setShowEventDialog(true); }}><Edit className="h-4 w-4" /></Button>
    )}
  ];

  const flaringColumns = [
    { key: 'recordDate', header: 'Date', render: (v: any) => v?.recordDate ? format(new Date(v.recordDate), 'dd MMM yyyy') : '-' },
    { key: 'flaringPointName', header: 'Flaring Point' },
    { key: 'volumeFlared', header: 'Volume', render: (v: any) => `${(v?.volumeFlared || 0).toLocaleString()} ${v?.volumeUnit || 'mscf'}` },
    { key: 'duration', header: 'Duration (hrs)', render: (v: any) => v?.duration?.toFixed(1) || '0' },
    { key: 'flaringReason', header: 'Reason' },
    { key: 'isPermitted', header: 'Permitted', render: (v: any) => (
      <Badge className={v?.isPermitted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
        {v?.isPermitted ? 'Yes' : 'No'}
      </Badge>
    )}
  ];

  const shrinkageColumns = [
    { key: 'recordDate', header: 'Date', render: (v: any) => v?.recordDate ? format(new Date(v.recordDate), 'dd MMM yyyy') : '-' },
    { key: 'product', header: 'Product' },
    { key: 'inletVolume', header: 'Inlet (bbls)', render: (v: any) => (v?.inletVolume || 0).toLocaleString() },
    { key: 'outletVolume', header: 'Outlet (bbls)', render: (v: any) => (v?.outletVolume || 0).toLocaleString() },
    { key: 'shrinkageVolume', header: 'Shrinkage (bbls)', render: (v: any) => (v?.shrinkageVolume || 0).toLocaleString() },
    { key: 'shrinkagePercent', header: 'Shrinkage %', render: (v: any) => `${(v?.shrinkagePercent || 0).toFixed(2)}%` },
    { key: 'shrinkageCause', header: 'Cause' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loss Accounting"
        description="Track flaring, venting, spills, and shrinkage losses"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total Loss Events" value={events.length} icon={AlertTriangle} colorClass="text-red-600" />
        <KPICard title="Total Loss Volume" value={Math.round(totalLossVolume)} unit="units" icon={TrendingDown} colorClass="text-orange-600" />
        <KPICard title="Gas Flared (MTD)" value={Math.round(totalFlared)} unit="mscf" icon={Flame} colorClass="text-yellow-600" />
        <KPICard title="Shrinkage (MTD)" value={Math.round(totalShrinkage)} unit="bbls" icon={Droplets} colorClass="text-blue-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="events"><AlertTriangle className="h-4 w-4 mr-2" />Loss Events</TabsTrigger>
          <TabsTrigger value="flaring"><Flame className="h-4 w-4 mr-2" />Flaring Records</TabsTrigger>
          <TabsTrigger value="shrinkage"><Droplets className="h-4 w-4 mr-2" />Shrinkage</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Loss Events</CardTitle>
              {canEdit && (
                <Button onClick={() => { setEditingItem(null); setEventForm({ eventDate: '', category: 'flaring', severity: 'minor', status: 'reported', location: '', product: 'Gas', volumeLost: 0, volumeUnit: 'mscf', estimatedValue: 0, flaringReason: '', rootCause: '', comments: '' }); setShowEventDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Report Loss Event
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={events} columns={eventColumns} loading={eventsLoading} searchable searchKeys={['eventNumber', 'category']} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flaring">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Flaring Records</CardTitle>
              {canEdit && (
                <Button onClick={() => { setFlaringForm({ recordDate: '', flaringPointName: '', product: 'gas', volumeFlared: 0, volumeUnit: 'mscf', duration: 0, flaringReason: 'routine', isPermitted: true, comments: '' }); setShowFlaringDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Add Flaring Record
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={flaringRecords} columns={flaringColumns} loading={flaringLoading} searchable searchKeys={['flaringPointName']} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shrinkage">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Shrinkage Records</CardTitle>
              {canEdit && (
                <Button onClick={() => { setShrinkageForm({ recordDate: '', product: 'Crude Oil', inletVolume: 0, outletVolume: 0, shrinkageCause: '', temperature: 0, pressure: 0, comments: '' }); setShowShrinkageDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Add Shrinkage Record
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={shrinkageRecords} columns={shrinkageColumns} loading={shrinkageLoading} searchable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Loss Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Loss Event' : 'Report Loss Event'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Event Date</Label>
              <Input type="date" value={eventForm.eventDate ? eventForm.eventDate.substring(0, 10) : ''} onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={eventForm.category} onValueChange={(v) => setEventForm({ ...eventForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={eventForm.severity} onValueChange={(v) => setEventForm({ ...eventForm, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Input value={eventForm.product} onChange={(e) => setEventForm({ ...eventForm, product: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Volume Lost</Label>
              <Input type="number" value={eventForm.volumeLost} onChange={(e) => setEventForm({ ...eventForm, volumeLost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Volume Unit</Label>
              <Select value={eventForm.volumeUnit} onValueChange={(v) => setEventForm({ ...eventForm, volumeUnit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bbls">bbls</SelectItem>
                  <SelectItem value="mscf">mscf</SelectItem>
                  <SelectItem value="scf">scf</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Estimated Value ($)</Label>
              <Input type="number" value={eventForm.estimatedValue} onChange={(e) => setEventForm({ ...eventForm, estimatedValue: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Root Cause</Label>
              <Textarea value={eventForm.rootCause} onChange={(e) => setEventForm({ ...eventForm, rootCause: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>Cancel</Button>
            <Button onClick={() => eventMutation.mutate(eventForm)} disabled={eventMutation.isPending}>
              {eventMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flaring Dialog */}
      <Dialog open={showFlaringDialog} onOpenChange={setShowFlaringDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Flaring Record</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Record Date</Label>
              <Input type="date" value={flaringForm.recordDate} onChange={(e) => setFlaringForm({ ...flaringForm, recordDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Flaring Point</Label>
              <Input value={flaringForm.flaringPointName} onChange={(e) => setFlaringForm({ ...flaringForm, flaringPointName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Volume Flared</Label>
              <Input type="number" value={flaringForm.volumeFlared} onChange={(e) => setFlaringForm({ ...flaringForm, volumeFlared: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Duration (hours)</Label>
              <Input type="number" value={flaringForm.duration} onChange={(e) => setFlaringForm({ ...flaringForm, duration: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={flaringForm.flaringReason} onValueChange={(v) => setFlaringForm({ ...flaringForm, flaringReason: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Permitted</Label>
              <Select value={flaringForm.isPermitted ? 'true' : 'false'} onValueChange={(v) => setFlaringForm({ ...flaringForm, isPermitted: v === 'true' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlaringDialog(false)}>Cancel</Button>
            <Button onClick={() => flaringMutation.mutate(flaringForm)} disabled={flaringMutation.isPending}>
              {flaringMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shrinkage Dialog */}
      <Dialog open={showShrinkageDialog} onOpenChange={setShowShrinkageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Shrinkage Record</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Record Date</Label>
              <Input type="date" value={shrinkageForm.recordDate} onChange={(e) => setShrinkageForm({ ...shrinkageForm, recordDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Input value={shrinkageForm.product} onChange={(e) => setShrinkageForm({ ...shrinkageForm, product: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Inlet Volume (bbls)</Label>
              <Input type="number" value={shrinkageForm.inletVolume} onChange={(e) => setShrinkageForm({ ...shrinkageForm, inletVolume: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Outlet Volume (bbls)</Label>
              <Input type="number" value={shrinkageForm.outletVolume} onChange={(e) => setShrinkageForm({ ...shrinkageForm, outletVolume: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Shrinkage Cause</Label>
              <Input value={shrinkageForm.shrinkageCause} onChange={(e) => setShrinkageForm({ ...shrinkageForm, shrinkageCause: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShrinkageDialog(false)}>Cancel</Button>
            <Button onClick={() => shrinkageMutation.mutate(shrinkageForm)} disabled={shrinkageMutation.isPending}>
              {shrinkageMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
