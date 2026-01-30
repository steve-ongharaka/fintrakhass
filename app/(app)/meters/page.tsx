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
  Gauge, Plus, Edit, Trash2, Calendar, Activity, CheckCircle,
  AlertTriangle, Settings, FileText, Wrench
} from 'lucide-react';

const meterTypes = [
  { value: 'turbine', label: 'Turbine' },
  { value: 'ultrasonic', label: 'Ultrasonic' },
  { value: 'coriolis', label: 'Coriolis' },
  { value: 'orifice', label: 'Orifice' },
  { value: 'positive_displacement', label: 'Positive Displacement' },
  { value: 'vortex', label: 'Vortex' },
];

const meterStatuses = [
  { value: 'active', label: 'Active', color: 'bg-green-500' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-500' },
  { value: 'under_calibration', label: 'Under Calibration', color: 'bg-yellow-500' },
  { value: 'faulty', label: 'Faulty', color: 'bg-red-500' },
];

const calibrationStatuses = [
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-500' },
];

export default function MetersPage() {
  const { canEdit, isAdmin, userRole } = useUserRole();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('meters');
  const [showMeterDialog, setShowMeterDialog] = useState(false);
  const [showReadingDialog, setShowReadingDialog] = useState(false);
  const [showCalibrationDialog, setShowCalibrationDialog] = useState(false);
  const [showProvingDialog, setShowProvingDialog] = useState(false);
  const [editingMeter, setEditingMeter] = useState<any>(null);
  const [meterForm, setMeterForm] = useState<any>({});
  const [readingForm, setReadingForm] = useState<any>({});
  const [calibrationForm, setCalibrationForm] = useState<any>({});
  const [provingForm, setProvingForm] = useState<any>({});

  // Fetch data with proper error handling
  const { data: metersData, isLoading: loadingMeters } = useQuery({
    queryKey: ['meters'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/meters');
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

  const { data: readingsData } = useQuery({
    queryKey: ['meter-readings'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/meter-readings');
        if (!res.ok) return [];
        const result = await res.json();
        return result?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: calibrationsData } = useQuery({
    queryKey: ['meter-calibrations'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/meter-calibrations');
        if (!res.ok) return [];
        const result = await res.json();
        return result?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: provingsData } = useQuery({
    queryKey: ['meter-provings'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/meter-provings');
        if (!res.ok) return [];
        const result = await res.json();
        return result?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Mutations
  const createMeter = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/meters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create meter');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meters'] });
      toast.success('Meter created successfully');
      setShowMeterDialog(false);
      setMeterForm({});
    },
    onError: () => toast.error('Failed to create meter'),
  });

  const updateMeter = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/meters/${editingMeter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update meter');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meters'] });
      toast.success('Meter updated successfully');
      setShowMeterDialog(false);
      setEditingMeter(null);
      setMeterForm({});
    },
    onError: () => toast.error('Failed to update meter'),
  });

  const deleteMeter = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/meters/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete meter');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meters'] });
      toast.success('Meter deleted successfully');
    },
    onError: () => toast.error('Failed to delete meter'),
  });

  const createReading = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/meter-readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create reading');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meter-readings'] });
      toast.success('Reading recorded successfully');
      setShowReadingDialog(false);
      setReadingForm({});
    },
    onError: () => toast.error('Failed to record reading'),
  });

  const createCalibration = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/meter-calibrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create calibration');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meter-calibrations', 'meters'] });
      toast.success('Calibration recorded successfully');
      setShowCalibrationDialog(false);
      setCalibrationForm({});
    },
    onError: () => toast.error('Failed to record calibration'),
  });

  const createProving = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/meter-provings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create proving');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meter-provings'] });
      toast.success('Proving recorded successfully');
      setShowProvingDialog(false);
      setProvingForm({});
    },
    onError: () => toast.error('Failed to record proving'),
  });

  const meters = metersData || [];
  const readings = readingsData || [];
  const calibrations = calibrationsData || [];
  const provings = provingsData || [];
  const facilities = facilitiesData || [];

  // Stats
  const activeMeters = meters.filter((m: any) => m.status === 'active').length;
  const calibrationsDue = meters.filter((m: any) => {
    if (!m.nextCalibrationDate) return false;
    return new Date(m.nextCalibrationDate) <= new Date();
  }).length;
  const faultyMeters = meters.filter((m: any) => m.status === 'faulty').length;

  const handleMeterSubmit = () => {
    if (editingMeter) {
      updateMeter.mutate(meterForm);
    } else {
      createMeter.mutate(meterForm);
    }
  };

  const openEditMeter = (meter: any) => {
    setEditingMeter(meter);
    setMeterForm({
      meterTag: meter.meterTag,
      meterName: meter.meterName,
      meterType: meter.meterType,
      manufacturer: meter.manufacturer,
      model: meter.model,
      serialNumber: meter.serialNumber,
      facilityId: meter.facilityId,
      location: meter.location,
      status: meter.status,
      minFlow: meter.minFlow,
      maxFlow: meter.maxFlow,
      accuracy: meter.accuracy,
      kFactor: meter.kFactor,
      calibrationInterval: meter.calibrationInterval,
      installationDate: meter.installationDate ? format(new Date(meter.installationDate), 'yyyy-MM-dd') : '',
      lastCalibrationDate: meter.lastCalibrationDate ? format(new Date(meter.lastCalibrationDate), 'yyyy-MM-dd') : '',
      nextCalibrationDate: meter.nextCalibrationDate ? format(new Date(meter.nextCalibrationDate), 'yyyy-MM-dd') : '',
      comments: meter.comments,
    });
    setShowMeterDialog(true);
  };

  // Table columns
  const meterColumns = [
    { key: 'meterTag', header: 'Meter Tag', sortable: true },
    { key: 'meterName', header: 'Name', sortable: true },
    {
      key: 'meterType',
      header: 'Type',
      render: (row: any) => (
        <span className="capitalize">{row.meterType?.replace('_', ' ')}</span>
      ),
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
        const status = meterStatuses.find(s => s.value === row.status);
        return (
          <Badge className={`${status?.color} text-white`}>
            {status?.label}
          </Badge>
        );
      },
    },
    {
      key: 'nextCalibrationDate',
      header: 'Next Calibration',
      render: (row: any) => {
        if (!row.nextCalibrationDate) return '-';
        const date = new Date(row.nextCalibrationDate);
        const isOverdue = date <= new Date();
        return (
          <span className={isOverdue ? 'text-red-500 font-semibold' : ''}>
            {format(date, 'MMM dd, yyyy')}
            {isOverdue && ' (Overdue)'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={() => openEditMeter(row)}>
                <Edit className="h-4 w-4" />
              </Button>
              {userRole === 'admin' && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Delete this meter?')) deleteMeter.mutate(row.id);
                  }}
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

  const readingColumns = [
    {
      key: 'readingDate',
      header: 'Date',
      sortable: true,
      render: (row: any) => format(new Date(row.readingDate), 'MMM dd, yyyy HH:mm'),
    },
    { key: 'meter', header: 'Meter', render: (row: any) => row.meter?.meterName || '-' },
    { key: 'grossVolume', header: 'Gross Vol', render: (row: any) => row.grossVolume?.toFixed(2) || '0' },
    { key: 'netVolume', header: 'Net Vol', render: (row: any) => row.netVolume?.toFixed(2) || '0' },
    { key: 'flowRate', header: 'Flow Rate', render: (row: any) => row.flowRate?.toFixed(2) || '0' },
    { key: 'temperature', header: 'Temp (°F)', render: (row: any) => row.temperature?.toFixed(1) || '-' },
    { key: 'meterFactor', header: 'MF', render: (row: any) => row.meterFactor?.toFixed(4) || '1.0000' },
    { key: 'vcf', header: 'VCF', render: (row: any) => row.vcf?.toFixed(4) || '1.0000' },
  ];

  const calibrationColumns = [
    {
      key: 'calibrationDate',
      header: 'Date',
      sortable: true,
      render: (row: any) => format(new Date(row.calibrationDate), 'MMM dd, yyyy'),
    },
    { key: 'meter', header: 'Meter', render: (row: any) => row.meter?.meterName || '-' },
    { key: 'calibrationType', header: 'Type', render: (row: any) => row.calibrationType || '-' },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => {
        const status = calibrationStatuses.find(s => s.value === row.status);
        return (
          <Badge className={`${status?.color} text-white`}>
            {status?.label}
          </Badge>
        );
      },
    },
    { key: 'preCalibrationError', header: 'Pre Error %', render: (row: any) => row.preCalibrationError?.toFixed(3) || '-' },
    { key: 'postCalibrationError', header: 'Post Error %', render: (row: any) => row.postCalibrationError?.toFixed(3) || '-' },
    { key: 'performedBy', header: 'Performed By' },
  ];

  const provingColumns = [
    {
      key: 'provingDate',
      header: 'Date',
      sortable: true,
      render: (row: any) => format(new Date(row.provingDate), 'MMM dd, yyyy'),
    },
    { key: 'meter', header: 'Meter', render: (row: any) => row.meter?.meterName || '-' },
    { key: 'proverType', header: 'Prover Type' },
    { key: 'runs', header: 'Runs' },
    { key: 'avgMeterFactor', header: 'Avg MF', render: (row: any) => row.avgMeterFactor?.toFixed(4) || '-' },
    { key: 'repeatability', header: 'Repeatability %', render: (row: any) => row.repeatability?.toFixed(3) || '-' },
    {
      key: 'passOrFail',
      header: 'Result',
      render: (row: any) => (
        <Badge className={row.passOrFail === 'pass' ? 'bg-green-500' : 'bg-red-500'}>
          {row.passOrFail?.toUpperCase()}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metering & Calibration"
        description="Manage meters, readings, calibrations, and provings"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Meters"
          value={meters.length}
          icon={Gauge}
          colorClass="text-blue-600"
          iconBgClass="bg-blue-100"
        />
        <KPICard
          title="Active Meters"
          value={activeMeters}
          icon={CheckCircle}
          colorClass="text-green-600"
          iconBgClass="bg-green-100"
        />
        <KPICard
          title="Calibrations Due"
          value={calibrationsDue}
          icon={AlertTriangle}
          colorClass="text-yellow-600"
          iconBgClass="bg-yellow-100"
        />
        <KPICard
          title="Faulty Meters"
          value={faultyMeters}
          icon={AlertTriangle}
          colorClass="text-red-600"
          iconBgClass="bg-red-100"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="meters" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" /> Meters
          </TabsTrigger>
          <TabsTrigger value="readings" className="flex items-center gap-2">
            <Activity className="h-4 w-4" /> Readings
          </TabsTrigger>
          <TabsTrigger value="calibrations" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Calibrations
          </TabsTrigger>
          <TabsTrigger value="provings" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Provings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meters">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Meters</CardTitle>
              {canEdit && (
                <Button onClick={() => { setEditingMeter(null); setMeterForm({}); setShowMeterDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Meter
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable
                data={meters}
                columns={meterColumns}
                searchable
                searchKeys={['meterTag', 'meterName']}
                searchPlaceholder="Search meters..."
                loading={loadingMeters}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Meter Readings</CardTitle>
              {canEdit && (
                <Button onClick={() => { setReadingForm({ readingDate: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm') }); setShowReadingDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Record Reading
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable
                data={readings}
                columns={readingColumns}
                searchable
                searchPlaceholder="Search readings..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calibrations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Calibration Records</CardTitle>
              {canEdit && (
                <Button onClick={() => { setCalibrationForm({ calibrationDate: format(new Date(), 'yyyy-MM-dd'), status: 'scheduled' }); setShowCalibrationDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Schedule Calibration
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable
                data={calibrations}
                columns={calibrationColumns}
                searchable
                searchPlaceholder="Search calibrations..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="provings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Meter Proving Records</CardTitle>
              {canEdit && (
                <Button onClick={() => { setProvingForm({ provingDate: format(new Date(), 'yyyy-MM-dd'), runs: 5, passOrFail: 'pass' }); setShowProvingDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Record Proving
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable
                data={provings}
                columns={provingColumns}
                searchable
                searchPlaceholder="Search provings..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Meter Dialog */}
      <Dialog open={showMeterDialog} onOpenChange={setShowMeterDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeter ? 'Edit Meter' : 'Add New Meter'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Meter Tag *</Label>
              <Input
                value={meterForm.meterTag || ''}
                onChange={(e) => setMeterForm({ ...meterForm, meterTag: e.target.value })}
                placeholder="e.g., FT-001"
                disabled={!!editingMeter}
              />
            </div>
            <div>
              <Label>Meter Name *</Label>
              <Input
                value={meterForm.meterName || ''}
                onChange={(e) => setMeterForm({ ...meterForm, meterName: e.target.value })}
                placeholder="e.g., Oil Export Meter"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={meterForm.meterType || 'turbine'} onValueChange={(v) => setMeterForm({ ...meterForm, meterType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {meterTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={meterForm.status || 'active'} onValueChange={(v) => setMeterForm({ ...meterForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {meterStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Facility</Label>
              <Select value={meterForm.facilityId || ''} onValueChange={(v) => setMeterForm({ ...meterForm, facilityId: v })}>
                <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                <SelectContent>
                  {facilities.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.facilityName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={meterForm.location || ''} onChange={(e) => setMeterForm({ ...meterForm, location: e.target.value })} />
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input value={meterForm.manufacturer || ''} onChange={(e) => setMeterForm({ ...meterForm, manufacturer: e.target.value })} />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={meterForm.model || ''} onChange={(e) => setMeterForm({ ...meterForm, model: e.target.value })} />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input value={meterForm.serialNumber || ''} onChange={(e) => setMeterForm({ ...meterForm, serialNumber: e.target.value })} />
            </div>
            <div>
              <Label>K-Factor</Label>
              <Input type="number" step="0.0001" value={meterForm.kFactor || ''} onChange={(e) => setMeterForm({ ...meterForm, kFactor: e.target.value })} />
            </div>
            <div>
              <Label>Min Flow Rate</Label>
              <Input type="number" value={meterForm.minFlow || ''} onChange={(e) => setMeterForm({ ...meterForm, minFlow: e.target.value })} />
            </div>
            <div>
              <Label>Max Flow Rate</Label>
              <Input type="number" value={meterForm.maxFlow || ''} onChange={(e) => setMeterForm({ ...meterForm, maxFlow: e.target.value })} />
            </div>
            <div>
              <Label>Accuracy (%)</Label>
              <Input type="number" step="0.01" value={meterForm.accuracy || ''} onChange={(e) => setMeterForm({ ...meterForm, accuracy: e.target.value })} />
            </div>
            <div>
              <Label>Calibration Interval (months)</Label>
              <Input type="number" value={meterForm.calibrationInterval || 12} onChange={(e) => setMeterForm({ ...meterForm, calibrationInterval: e.target.value })} />
            </div>
            <div>
              <Label>Installation Date</Label>
              <Input type="date" value={meterForm.installationDate || ''} onChange={(e) => setMeterForm({ ...meterForm, installationDate: e.target.value })} />
            </div>
            <div>
              <Label>Last Calibration Date</Label>
              <Input type="date" value={meterForm.lastCalibrationDate || ''} onChange={(e) => setMeterForm({ ...meterForm, lastCalibrationDate: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Comments</Label>
              <Textarea value={meterForm.comments || ''} onChange={(e) => setMeterForm({ ...meterForm, comments: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowMeterDialog(false)}>Cancel</Button>
            <Button onClick={handleMeterSubmit} disabled={!meterForm.meterTag || !meterForm.meterName}>
              {editingMeter ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reading Dialog */}
      <Dialog open={showReadingDialog} onOpenChange={setShowReadingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Meter Reading</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Meter *</Label>
              <Select value={readingForm.meterId || ''} onValueChange={(v) => setReadingForm({ ...readingForm, meterId: v })}>
                <SelectTrigger><SelectValue placeholder="Select meter" /></SelectTrigger>
                <SelectContent>
                  {meters.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.meterName} ({m.meterTag})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Reading Date/Time *</Label>
              <Input type="datetime-local" value={readingForm.readingDate || ''} onChange={(e) => setReadingForm({ ...readingForm, readingDate: e.target.value })} />
            </div>
            <div>
              <Label>Gross Volume</Label>
              <Input type="number" step="0.01" value={readingForm.grossVolume || ''} onChange={(e) => setReadingForm({ ...readingForm, grossVolume: e.target.value })} />
            </div>
            <div>
              <Label>Net Volume</Label>
              <Input type="number" step="0.01" value={readingForm.netVolume || ''} onChange={(e) => setReadingForm({ ...readingForm, netVolume: e.target.value })} />
            </div>
            <div>
              <Label>Flow Rate</Label>
              <Input type="number" step="0.01" value={readingForm.flowRate || ''} onChange={(e) => setReadingForm({ ...readingForm, flowRate: e.target.value })} />
            </div>
            <div>
              <Label>Temperature (°F)</Label>
              <Input type="number" step="0.1" value={readingForm.temperature || ''} onChange={(e) => setReadingForm({ ...readingForm, temperature: e.target.value })} />
            </div>
            <div>
              <Label>Pressure (psi)</Label>
              <Input type="number" step="0.1" value={readingForm.pressure || ''} onChange={(e) => setReadingForm({ ...readingForm, pressure: e.target.value })} />
            </div>
            <div>
              <Label>BS&W (%)</Label>
              <Input type="number" step="0.01" value={readingForm.bsw || ''} onChange={(e) => setReadingForm({ ...readingForm, bsw: e.target.value })} />
            </div>
            <div>
              <Label>Meter Factor</Label>
              <Input type="number" step="0.0001" value={readingForm.meterFactor || '1.0'} onChange={(e) => setReadingForm({ ...readingForm, meterFactor: e.target.value })} />
            </div>
            <div>
              <Label>VCF</Label>
              <Input type="number" step="0.0001" value={readingForm.vcf || '1.0'} onChange={(e) => setReadingForm({ ...readingForm, vcf: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowReadingDialog(false)}>Cancel</Button>
            <Button onClick={() => createReading.mutate(readingForm)} disabled={!readingForm.meterId || !readingForm.readingDate}>
              Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calibration Dialog */}
      <Dialog open={showCalibrationDialog} onOpenChange={setShowCalibrationDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule/Record Calibration</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Meter *</Label>
              <Select value={calibrationForm.meterId || ''} onValueChange={(v) => setCalibrationForm({ ...calibrationForm, meterId: v })}>
                <SelectTrigger><SelectValue placeholder="Select meter" /></SelectTrigger>
                <SelectContent>
                  {meters.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.meterName} ({m.meterTag})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={calibrationForm.calibrationDate || ''} onChange={(e) => setCalibrationForm({ ...calibrationForm, calibrationDate: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={calibrationForm.status || 'scheduled'} onValueChange={(v) => setCalibrationForm({ ...calibrationForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {calibrationStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Input value={calibrationForm.calibrationType || ''} onChange={(e) => setCalibrationForm({ ...calibrationForm, calibrationType: e.target.value })} placeholder="e.g., In-situ, Laboratory" />
            </div>
            <div>
              <Label>Performed By</Label>
              <Input value={calibrationForm.performedBy || ''} onChange={(e) => setCalibrationForm({ ...calibrationForm, performedBy: e.target.value })} />
            </div>
            <div>
              <Label>Pre-Calibration Error (%)</Label>
              <Input type="number" step="0.001" value={calibrationForm.preCalibrationError || ''} onChange={(e) => setCalibrationForm({ ...calibrationForm, preCalibrationError: e.target.value })} />
            </div>
            <div>
              <Label>Post-Calibration Error (%)</Label>
              <Input type="number" step="0.001" value={calibrationForm.postCalibrationError || ''} onChange={(e) => setCalibrationForm({ ...calibrationForm, postCalibrationError: e.target.value })} />
            </div>
            <div>
              <Label>Old K-Factor</Label>
              <Input type="number" step="0.0001" value={calibrationForm.oldKFactor || ''} onChange={(e) => setCalibrationForm({ ...calibrationForm, oldKFactor: e.target.value })} />
            </div>
            <div>
              <Label>New K-Factor</Label>
              <Input type="number" step="0.0001" value={calibrationForm.newKFactor || ''} onChange={(e) => setCalibrationForm({ ...calibrationForm, newKFactor: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Next Calibration Date</Label>
              <Input type="date" value={calibrationForm.nextCalibrationDate || ''} onChange={(e) => setCalibrationForm({ ...calibrationForm, nextCalibrationDate: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCalibrationDialog(false)}>Cancel</Button>
            <Button onClick={() => createCalibration.mutate(calibrationForm)} disabled={!calibrationForm.meterId || !calibrationForm.calibrationDate}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Proving Dialog */}
      <Dialog open={showProvingDialog} onOpenChange={setShowProvingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Meter Proving</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Meter *</Label>
              <Select value={provingForm.meterId || ''} onValueChange={(v) => setProvingForm({ ...provingForm, meterId: v })}>
                <SelectTrigger><SelectValue placeholder="Select meter" /></SelectTrigger>
                <SelectContent>
                  {meters.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.meterName} ({m.meterTag})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={provingForm.provingDate || ''} onChange={(e) => setProvingForm({ ...provingForm, provingDate: e.target.value })} />
            </div>
            <div>
              <Label>Prover Type</Label>
              <Input value={provingForm.proverType || ''} onChange={(e) => setProvingForm({ ...provingForm, proverType: e.target.value })} placeholder="e.g., Bidirectional" />
            </div>
            <div>
              <Label>Number of Runs</Label>
              <Input type="number" value={provingForm.runs || 5} onChange={(e) => setProvingForm({ ...provingForm, runs: e.target.value })} />
            </div>
            <div>
              <Label>Avg Meter Factor</Label>
              <Input type="number" step="0.0001" value={provingForm.avgMeterFactor || ''} onChange={(e) => setProvingForm({ ...provingForm, avgMeterFactor: e.target.value })} />
            </div>
            <div>
              <Label>Repeatability (%)</Label>
              <Input type="number" step="0.001" value={provingForm.repeatability || ''} onChange={(e) => setProvingForm({ ...provingForm, repeatability: e.target.value })} />
            </div>
            <div>
              <Label>Result</Label>
              <Select value={provingForm.passOrFail || 'pass'} onValueChange={(v) => setProvingForm({ ...provingForm, passOrFail: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Performed By</Label>
              <Input value={provingForm.performedBy || ''} onChange={(e) => setProvingForm({ ...provingForm, performedBy: e.target.value })} />
            </div>
            <div>
              <Label>Witnessed By</Label>
              <Input value={provingForm.witnessedBy || ''} onChange={(e) => setProvingForm({ ...provingForm, witnessedBy: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowProvingDialog(false)}>Cancel</Button>
            <Button onClick={() => createProving.mutate(provingForm)} disabled={!provingForm.meterId || !provingForm.provingDate}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
