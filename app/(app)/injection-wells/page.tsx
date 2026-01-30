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
  Plus, Droplet, Activity, Gauge, TestTube, Edit, ArrowDown
} from 'lucide-react';

const injectionTypeLabels: Record<string, string> = {
  water_injection: 'Water Injection',
  gas_injection: 'Gas Injection',
  wag: 'WAG (Water Alternating Gas)',
  steam_injection: 'Steam Injection',
  polymer_injection: 'Polymer Injection',
  co2_injection: 'CO2 Injection'
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  shut_in: 'bg-yellow-100 text-yellow-800',
  workover: 'bg-orange-100 text-orange-800',
  abandoned: 'bg-red-100 text-red-800',
};

export default function InjectionWellsPage() {
  const { canEdit } = useUserRole();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('wells');
  const [showWellDialog, setShowWellDialog] = useState(false);
  const [showDataDialog, setShowDataDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedWellId, setSelectedWellId] = useState<string>('');

  const [wellForm, setWellForm] = useState({
    wellName: '', wellId: '', field: '', reservoirZone: '',
    injectionType: 'water_injection', status: 'active',
    maxInjectionRate: 0, maxInjectionPressure: 0,
    targetFormation: '', perforationInterval: '', patternType: '', comments: ''
  });

  const [dataForm, setDataForm] = useState({
    injectionWellId: '', injectionDate: '', injectionVolume: 0, volumeUnit: 'bbls',
    injectionRate: 0, injectionPressure: 0, tubingPressure: 0, casingPressure: 0,
    temperature: 0, operatingHours: 24, comments: ''
  });

  const [testForm, setTestForm] = useState({
    injectionWellId: '', testDate: '', testType: 'Injectivity',
    duration: 0, injectionRate: 0, injectionPressure: 0, stabilizedPressure: 0,
    injectivityIndex: 0, skinFactor: 0, reservoirPressure: 0, formationDamage: 'None', comments: ''
  });

  const { data: wellsData, isLoading: wellsLoading } = useQuery({
    queryKey: ['injection-wells'],
    queryFn: async () => {
      const res = await fetch('/api/injection-wells');
      if (!res.ok) throw new Error('Failed to fetch wells');
      return res.json();
    }
  });

  const { data: injectionDataRes, isLoading: dataLoading } = useQuery({
    queryKey: ['injection-data', selectedWellId],
    queryFn: async () => {
      const url = selectedWellId && selectedWellId !== 'all' 
        ? `/api/injection-data?injectionWellId=${selectedWellId}` 
        : '/api/injection-data';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch data');
      return res.json();
    }
  });

  const { data: testsData, isLoading: testsLoading } = useQuery({
    queryKey: ['injection-tests'],
    queryFn: async () => {
      const res = await fetch('/api/injection-tests');
      if (!res.ok) throw new Error('Failed to fetch tests');
      return res.json();
    }
  });

  const wells = wellsData?.data || [];
  const injectionData = injectionDataRes?.data || [];
  const tests = testsData?.data || [];

  const wellMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/injection-wells/${editingItem.id}` : '/api/injection-wells';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save well');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injection-wells'] });
      toast.success(editingItem ? 'Well updated' : 'Well created');
      setShowWellDialog(false);
      setEditingItem(null);
    },
    onError: () => toast.error('Failed to save well')
  });

  const dataMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/injection-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save data');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injection-data'] });
      queryClient.invalidateQueries({ queryKey: ['injection-wells'] });
      toast.success('Injection data recorded');
      setShowDataDialog(false);
    },
    onError: () => toast.error('Failed to save data')
  });

  const testMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/injection-tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save test');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injection-tests'] });
      queryClient.invalidateQueries({ queryKey: ['injection-wells'] });
      toast.success('Injection test recorded');
      setShowTestDialog(false);
    },
    onError: () => toast.error('Failed to save test')
  });

  const activeWells = wells.filter((w: any) => w.status === 'active').length;
  const totalInjectionRate = wells.reduce((sum: number, w: any) => sum + (w.currentInjectionRate || 0), 0);
  const totalCumulative = wells.reduce((sum: number, w: any) => sum + (w.cumulativeInjection || 0), 0);

  const wellColumns = [
    { key: 'wellName', header: 'Well Name', sortable: true },
    { key: 'wellId', header: 'Well ID' },
    { key: 'field', header: 'Field' },
    { key: 'injectionType', header: 'Type', render: (v: any) => injectionTypeLabels[v?.injectionType] || v?.injectionType },
    { key: 'status', header: 'Status', render: (v: any) => (
      <Badge className={statusColors[v?.status] || 'bg-gray-100'}>{v?.status?.replace('_', ' ')}</Badge>
    )},
    { key: 'currentInjectionRate', header: 'Current Rate', render: (v: any) => `${(v?.currentInjectionRate || 0).toLocaleString()} bbl/d` },
    { key: 'cumulativeInjection', header: 'Cumulative', render: (v: any) => `${((v?.cumulativeInjection || 0) / 1000).toFixed(0)}k bbls` },
    { key: 'actions', header: 'Actions', render: (v: any) => canEdit && (
      <Button size="sm" variant="ghost" onClick={() => { setEditingItem(v); setWellForm(v); setShowWellDialog(true); }}><Edit className="h-4 w-4" /></Button>
    )}
  ];

  const dataColumns = [
    { key: 'injectionDate', header: 'Date', render: (v: any) => v?.injectionDate ? format(new Date(v.injectionDate), 'dd MMM yyyy') : '-' },
    { key: 'injectionWell', header: 'Well', render: (v: any) => v?.injectionWell?.wellName || '-' },
    { key: 'injectionVolume', header: 'Volume', render: (v: any) => `${(v?.injectionVolume || 0).toLocaleString()} ${v?.volumeUnit || 'bbls'}` },
    { key: 'injectionRate', header: 'Rate (bbl/d)', render: (v: any) => (v?.injectionRate || 0).toLocaleString() },
    { key: 'injectionPressure', header: 'Pressure (psi)', render: (v: any) => (v?.injectionPressure || 0).toLocaleString() },
    { key: 'operatingHours', header: 'Hours', render: (v: any) => v?.operatingHours || 24 }
  ];

  const testColumns = [
    { key: 'testDate', header: 'Date', render: (v: any) => v?.testDate ? format(new Date(v.testDate), 'dd MMM yyyy') : '-' },
    { key: 'injectionWell', header: 'Well', render: (v: any) => v?.injectionWell?.wellName || '-' },
    { key: 'testType', header: 'Test Type' },
    { key: 'duration', header: 'Duration (hrs)', render: (v: any) => v?.duration || 0 },
    { key: 'injectivityIndex', header: 'II (bbl/d/psi)', render: (v: any) => (v?.injectivityIndex || 0).toFixed(2) },
    { key: 'reservoirPressure', header: 'Res. Pressure', render: (v: any) => v?.reservoirPressure ? `${v.reservoirPressure} psi` : '-' },
    { key: 'formationDamage', header: 'Formation Damage' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Injection Wells"
        description="Water/gas injection tracking for reservoir management"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total Injectors" value={wells.length} icon={Droplet} colorClass="text-blue-600" />
        <KPICard title="Active Wells" value={activeWells} icon={Activity} colorClass="text-green-600" />
        <KPICard title="Total Injection Rate" value={Math.round(totalInjectionRate)} unit="bbl/d" icon={Gauge} colorClass="text-purple-600" />
        <KPICard title="Cumulative Injection" value={Math.round(totalCumulative / 1000000)} unit="MMbbl" icon={ArrowDown} colorClass="text-cyan-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="wells"><Droplet className="h-4 w-4 mr-2" />Injection Wells</TabsTrigger>
          <TabsTrigger value="data"><Activity className="h-4 w-4 mr-2" />Daily Data</TabsTrigger>
          <TabsTrigger value="tests"><TestTube className="h-4 w-4 mr-2" />Injection Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="wells">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Injection Wells</CardTitle>
              {canEdit && (
                <Button onClick={() => {
                  setEditingItem(null);
                  setWellForm({
                    wellName: '', wellId: '', field: '', reservoirZone: '',
                    injectionType: 'water_injection', status: 'active',
                    maxInjectionRate: 0, maxInjectionPressure: 0,
                    targetFormation: '', perforationInterval: '', patternType: '', comments: ''
                  });
                  setShowWellDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />Add Injection Well
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={wells} columns={wellColumns} loading={wellsLoading} searchable searchKeys={['wellName', 'wellId', 'field']} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Daily Injection Data</CardTitle>
              <div className="flex gap-2">
                <Select value={selectedWellId} onValueChange={setSelectedWellId}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="All Wells" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Wells</SelectItem>
                    {wells.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>{w.wellName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canEdit && (
                  <Button onClick={() => {
                    setDataForm({
                      injectionWellId: '', injectionDate: '', injectionVolume: 0, volumeUnit: 'bbls',
                      injectionRate: 0, injectionPressure: 0, tubingPressure: 0, casingPressure: 0,
                      temperature: 0, operatingHours: 24, comments: ''
                    });
                    setShowDataDialog(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />Record Data
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable data={injectionData} columns={dataColumns} loading={dataLoading} searchable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Injection Tests</CardTitle>
              {canEdit && (
                <Button onClick={() => {
                  setTestForm({
                    injectionWellId: '', testDate: '', testType: 'Injectivity',
                    duration: 0, injectionRate: 0, injectionPressure: 0, stabilizedPressure: 0,
                    injectivityIndex: 0, skinFactor: 0, reservoirPressure: 0, formationDamage: 'None', comments: ''
                  });
                  setShowTestDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />Record Test
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={tests} columns={testColumns} loading={testsLoading} searchable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Well Dialog */}
      <Dialog open={showWellDialog} onOpenChange={setShowWellDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Injection Well' : 'Add Injection Well'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Well Name</Label>
              <Input value={wellForm.wellName} onChange={(e) => setWellForm({ ...wellForm, wellName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Well ID</Label>
              <Input value={wellForm.wellId} onChange={(e) => setWellForm({ ...wellForm, wellId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Field</Label>
              <Input value={wellForm.field} onChange={(e) => setWellForm({ ...wellForm, field: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Injection Type</Label>
              <Select value={wellForm.injectionType} onValueChange={(v) => setWellForm({ ...wellForm, injectionType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(injectionTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={wellForm.status} onValueChange={(v) => setWellForm({ ...wellForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="shut_in">Shut-in</SelectItem>
                  <SelectItem value="workover">Workover</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Formation</Label>
              <Input value={wellForm.targetFormation} onChange={(e) => setWellForm({ ...wellForm, targetFormation: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Max Injection Rate (bbl/d)</Label>
              <Input type="number" value={wellForm.maxInjectionRate} onChange={(e) => setWellForm({ ...wellForm, maxInjectionRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Max Injection Pressure (psi)</Label>
              <Input type="number" value={wellForm.maxInjectionPressure} onChange={(e) => setWellForm({ ...wellForm, maxInjectionPressure: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWellDialog(false)}>Cancel</Button>
            <Button onClick={() => wellMutation.mutate(wellForm)} disabled={wellMutation.isPending}>
              {wellMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Data Dialog */}
      <Dialog open={showDataDialog} onOpenChange={setShowDataDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Injection Data</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Injection Well</Label>
              <Select value={dataForm.injectionWellId} onValueChange={(v) => setDataForm({ ...dataForm, injectionWellId: v })}>
                <SelectTrigger><SelectValue placeholder="Select well" /></SelectTrigger>
                <SelectContent>
                  {wells.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>{w.wellName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Injection Date</Label>
              <Input type="date" value={dataForm.injectionDate} onChange={(e) => setDataForm({ ...dataForm, injectionDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Injection Volume (bbls)</Label>
              <Input type="number" value={dataForm.injectionVolume} onChange={(e) => setDataForm({ ...dataForm, injectionVolume: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Injection Rate (bbl/d)</Label>
              <Input type="number" value={dataForm.injectionRate} onChange={(e) => setDataForm({ ...dataForm, injectionRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Injection Pressure (psi)</Label>
              <Input type="number" value={dataForm.injectionPressure} onChange={(e) => setDataForm({ ...dataForm, injectionPressure: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Operating Hours</Label>
              <Input type="number" value={dataForm.operatingHours} onChange={(e) => setDataForm({ ...dataForm, operatingHours: parseFloat(e.target.value) || 24 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDataDialog(false)}>Cancel</Button>
            <Button onClick={() => dataMutation.mutate(dataForm)} disabled={dataMutation.isPending}>
              {dataMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Injection Test</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Injection Well</Label>
              <Select value={testForm.injectionWellId} onValueChange={(v) => setTestForm({ ...testForm, injectionWellId: v })}>
                <SelectTrigger><SelectValue placeholder="Select well" /></SelectTrigger>
                <SelectContent>
                  {wells.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>{w.wellName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Test Date</Label>
              <Input type="date" value={testForm.testDate} onChange={(e) => setTestForm({ ...testForm, testDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Test Type</Label>
              <Select value={testForm.testType} onValueChange={(v) => setTestForm({ ...testForm, testType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Injectivity">Injectivity Test</SelectItem>
                  <SelectItem value="Falloff">Falloff Test</SelectItem>
                  <SelectItem value="Step-rate">Step-rate Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration (hrs)</Label>
              <Input type="number" value={testForm.duration} onChange={(e) => setTestForm({ ...testForm, duration: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Injectivity Index (bbl/d/psi)</Label>
              <Input type="number" step="0.01" value={testForm.injectivityIndex} onChange={(e) => setTestForm({ ...testForm, injectivityIndex: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Reservoir Pressure (psi)</Label>
              <Input type="number" value={testForm.reservoirPressure} onChange={(e) => setTestForm({ ...testForm, reservoirPressure: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Formation Damage</Label>
              <Select value={testForm.formationDamage} onValueChange={(v) => setTestForm({ ...testForm, formationDamage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Minor">Minor</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Skin Factor</Label>
              <Input type="number" step="0.1" value={testForm.skinFactor} onChange={(e) => setTestForm({ ...testForm, skinFactor: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>Cancel</Button>
            <Button onClick={() => testMutation.mutate(testForm)} disabled={testMutation.isPending}>
              {testMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
