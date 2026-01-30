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
  Plus, TrendingDown, BarChart3, LineChart, Calculator, Database, Edit
} from 'lucide-react';

const declineTypeLabels: Record<string, string> = {
  exponential: 'Exponential',
  hyperbolic: 'Hyperbolic',
  harmonic: 'Harmonic'
};

export default function DeclineAnalysisPage() {
  const { canEdit } = useUserRole();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('analyses');
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [showForecastDialog, setShowForecastDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [analysisForm, setAnalysisForm] = useState({
    analysisName: '', wellId: '', wellName: '', field: '', declineType: 'exponential',
    dataStartDate: '', dataEndDate: '', forecastEndDate: '',
    initialRate: 0, currentRate: 0, nominalDeclineRate: 0, bFactor: 0, economicLimit: 0,
    cumulativeToDate: 0, estimatedUltimateRecovery: 0, recoveryFactor: 0,
    rSquared: 0, confidenceLevel: 90, assumptions: '', comments: ''
  });

  const [forecastForm, setForecastForm] = useState({
    forecastName: '', wellId: '', field: '', forecastType: 'short-term',
    startDate: '', endDate: '', scenario: 'base', probability: 50,
    totalOilForecast: 0, totalGasForecast: 0, assumptions: '', comments: ''
  });

  const { data: analysesData, isLoading: analysesLoading } = useQuery({
    queryKey: ['decline-analyses'],
    queryFn: async () => {
      const res = await fetch('/api/decline-analyses');
      if (!res.ok) throw new Error('Failed to fetch analyses');
      return res.json();
    }
  });

  const { data: forecastsData, isLoading: forecastsLoading } = useQuery({
    queryKey: ['production-forecasts'],
    queryFn: async () => {
      const res = await fetch('/api/production-forecasts');
      if (!res.ok) throw new Error('Failed to fetch forecasts');
      return res.json();
    }
  });

  const { data: wellsData } = useQuery({
    queryKey: ['wells'],
    queryFn: async () => {
      const res = await fetch('/api/wells');
      if (!res.ok) throw new Error('Failed to fetch wells');
      return res.json();
    }
  });

  const analyses = analysesData?.data || [];
  const forecasts = forecastsData?.data || [];
  const wells = wellsData?.data || [];

  const analysisMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/decline-analyses/${editingItem.id}` : '/api/decline-analyses';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save analysis');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decline-analyses'] });
      toast.success(editingItem ? 'Analysis updated' : 'Analysis created');
      setShowAnalysisDialog(false);
      setEditingItem(null);
    },
    onError: () => toast.error('Failed to save analysis')
  });

  const forecastMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/production-forecasts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save forecast');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-forecasts'] });
      toast.success('Forecast created');
      setShowForecastDialog(false);
    },
    onError: () => toast.error('Failed to save forecast')
  });

  const avgDeclineRate = analyses.length > 0 ? analyses.reduce((sum: number, a: any) => sum + (a.nominalDeclineRate || 0), 0) / analyses.length : 0;
  const totalEUR = analyses.reduce((sum: number, a: any) => sum + (a.estimatedUltimateRecovery || 0), 0);
  const totalRemaining = analyses.reduce((sum: number, a: any) => sum + (a.remainingReserves || 0), 0);

  const analysisColumns = [
    { key: 'analysisName', header: 'Analysis Name', sortable: true },
    { key: 'wellName', header: 'Well' },
    { key: 'field', header: 'Field' },
    { key: 'declineType', header: 'Type', render: (v: any) => (
      <Badge variant="outline">{declineTypeLabels[v?.declineType] || v?.declineType}</Badge>
    )},
    { key: 'nominalDeclineRate', header: 'Decline Rate', render: (v: any) => `${(v?.nominalDeclineRate || 0).toFixed(1)}%/yr` },
    { key: 'estimatedUltimateRecovery', header: 'EUR (bbls)', render: (v: any) => (v?.estimatedUltimateRecovery || 0).toLocaleString() },
    { key: 'remainingReserves', header: 'Remaining', render: (v: any) => (v?.remainingReserves || 0).toLocaleString() },
    { key: 'rSquared', header: 'R²', render: (v: any) => (v?.rSquared || 0).toFixed(3) },
    { key: 'actions', header: 'Actions', render: (v: any) => canEdit && (
      <Button size="sm" variant="ghost" onClick={() => { setEditingItem(v); setAnalysisForm(v); setShowAnalysisDialog(true); }}><Edit className="h-4 w-4" /></Button>
    )}
  ];

  const forecastColumns = [
    { key: 'forecastName', header: 'Forecast Name', sortable: true },
    { key: 'field', header: 'Field' },
    { key: 'forecastType', header: 'Type' },
    { key: 'scenario', header: 'Scenario', render: (v: any) => (
      <Badge variant="outline">{v?.scenario}</Badge>
    )},
    { key: 'probability', header: 'Probability', render: (v: any) => `P${v?.probability || 50}` },
    { key: 'startDate', header: 'Start', render: (v: any) => v?.startDate ? format(new Date(v.startDate), 'MMM yyyy') : '-' },
    { key: 'endDate', header: 'End', render: (v: any) => v?.endDate ? format(new Date(v.endDate), 'MMM yyyy') : '-' },
    { key: 'totalOilForecast', header: 'Oil Forecast (bbls)', render: (v: any) => (v?.totalOilForecast || 0).toLocaleString() }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Decline Curve Analysis"
        description="Advanced production forecasting and reserves estimation"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total Analyses" value={analyses.length} icon={Calculator} colorClass="text-blue-600" />
        <KPICard title="Avg Decline Rate" value={Number(avgDeclineRate.toFixed(1))} unit="%/yr" icon={TrendingDown} colorClass="text-red-600" />
        <KPICard title="Total EUR" value={Math.round(totalEUR / 1000)} unit="Mbbls" icon={Database} colorClass="text-green-600" />
        <KPICard title="Remaining Reserves" value={Math.round(totalRemaining / 1000)} unit="Mbbls" icon={BarChart3} colorClass="text-purple-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="analyses"><TrendingDown className="h-4 w-4 mr-2" />Decline Analyses</TabsTrigger>
          <TabsTrigger value="forecasts"><LineChart className="h-4 w-4 mr-2" />Production Forecasts</TabsTrigger>
        </TabsList>

        <TabsContent value="analyses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Decline Curve Analyses</CardTitle>
              {canEdit && (
                <Button onClick={() => {
                  setEditingItem(null);
                  setAnalysisForm({
                    analysisName: '', wellId: '', wellName: '', field: '', declineType: 'exponential',
                    dataStartDate: '', dataEndDate: '', forecastEndDate: '',
                    initialRate: 0, currentRate: 0, nominalDeclineRate: 0, bFactor: 0, economicLimit: 0,
                    cumulativeToDate: 0, estimatedUltimateRecovery: 0, recoveryFactor: 0,
                    rSquared: 0, confidenceLevel: 90, assumptions: '', comments: ''
                  });
                  setShowAnalysisDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />New Analysis
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={analyses} columns={analysisColumns} loading={analysesLoading} searchable searchKeys={['analysisName', 'wellName', 'field']} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Production Forecasts</CardTitle>
              {canEdit && (
                <Button onClick={() => {
                  setForecastForm({
                    forecastName: '', wellId: '', field: '', forecastType: 'short-term',
                    startDate: '', endDate: '', scenario: 'base', probability: 50,
                    totalOilForecast: 0, totalGasForecast: 0, assumptions: '', comments: ''
                  });
                  setShowForecastDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />Create Forecast
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={forecasts} columns={forecastColumns} loading={forecastsLoading} searchable searchKeys={['forecastName', 'field']} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analysis Dialog */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Decline Analysis' : 'New Decline Analysis'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <Label>Analysis Name</Label>
              <Input value={analysisForm.analysisName} onChange={(e) => setAnalysisForm({ ...analysisForm, analysisName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Well</Label>
              <Select value={analysisForm.wellId} onValueChange={(v) => {
                const well = wells.find((w: any) => w.id === v);
                setAnalysisForm({ ...analysisForm, wellId: v, wellName: well?.wellName || '', field: well?.field || '' });
              }}>
                <SelectTrigger><SelectValue placeholder="Select well" /></SelectTrigger>
                <SelectContent>
                  {wells.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>{w.wellName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Decline Type</Label>
              <Select value={analysisForm.declineType} onValueChange={(v) => setAnalysisForm({ ...analysisForm, declineType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exponential">Exponential</SelectItem>
                  <SelectItem value="hyperbolic">Hyperbolic</SelectItem>
                  <SelectItem value="harmonic">Harmonic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-3 border-t pt-4 mt-2">
              <h4 className="font-semibold mb-3">Decline Parameters</h4>
            </div>
            <div className="space-y-2">
              <Label>Initial Rate (bbl/d)</Label>
              <Input type="number" value={analysisForm.initialRate} onChange={(e) => setAnalysisForm({ ...analysisForm, initialRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Current Rate (bbl/d)</Label>
              <Input type="number" value={analysisForm.currentRate} onChange={(e) => setAnalysisForm({ ...analysisForm, currentRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Nominal Decline Rate (%/yr)</Label>
              <Input type="number" step="0.1" value={analysisForm.nominalDeclineRate} onChange={(e) => setAnalysisForm({ ...analysisForm, nominalDeclineRate: parseFloat(e.target.value) || 0 })} />
            </div>
            {analysisForm.declineType === 'hyperbolic' && (
              <div className="space-y-2">
                <Label>b-Factor (0-1)</Label>
                <Input type="number" step="0.1" min="0" max="1" value={analysisForm.bFactor} onChange={(e) => setAnalysisForm({ ...analysisForm, bFactor: parseFloat(e.target.value) || 0 })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Economic Limit (bbl/d)</Label>
              <Input type="number" value={analysisForm.economicLimit} onChange={(e) => setAnalysisForm({ ...analysisForm, economicLimit: parseFloat(e.target.value) || 0 })} />
            </div>

            <div className="col-span-3 border-t pt-4 mt-2">
              <h4 className="font-semibold mb-3">Reserves Estimation</h4>
            </div>
            <div className="space-y-2">
              <Label>Cumulative to Date (bbls)</Label>
              <Input type="number" value={analysisForm.cumulativeToDate} onChange={(e) => setAnalysisForm({ ...analysisForm, cumulativeToDate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>EUR (bbls)</Label>
              <Input type="number" value={analysisForm.estimatedUltimateRecovery} onChange={(e) => setAnalysisForm({ ...analysisForm, estimatedUltimateRecovery: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Recovery Factor (%)</Label>
              <Input type="number" step="0.1" value={analysisForm.recoveryFactor} onChange={(e) => setAnalysisForm({ ...analysisForm, recoveryFactor: parseFloat(e.target.value) || 0 })} />
            </div>

            <div className="col-span-3 space-y-2">
              <Label>Assumptions</Label>
              <Textarea value={analysisForm.assumptions} onChange={(e) => setAnalysisForm({ ...analysisForm, assumptions: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnalysisDialog(false)}>Cancel</Button>
            <Button onClick={() => analysisMutation.mutate(analysisForm)} disabled={analysisMutation.isPending}>
              {analysisMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forecast Dialog */}
      <Dialog open={showForecastDialog} onOpenChange={setShowForecastDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Production Forecast</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Forecast Name</Label>
              <Input value={forecastForm.forecastName} onChange={(e) => setForecastForm({ ...forecastForm, forecastName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Field</Label>
              <Input value={forecastForm.field} onChange={(e) => setForecastForm({ ...forecastForm, field: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Forecast Type</Label>
              <Select value={forecastForm.forecastType} onValueChange={(v) => setForecastForm({ ...forecastForm, forecastType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short-term">Short-term (1-2 years)</SelectItem>
                  <SelectItem value="mid-term">Mid-term (3-5 years)</SelectItem>
                  <SelectItem value="long-term">Long-term (5+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scenario</Label>
              <Select value={forecastForm.scenario} onValueChange={(v) => setForecastForm({ ...forecastForm, scenario: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base Case</SelectItem>
                  <SelectItem value="upside">Upside</SelectItem>
                  <SelectItem value="downside">Downside</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={forecastForm.startDate} onChange={(e) => setForecastForm({ ...forecastForm, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={forecastForm.endDate} onChange={(e) => setForecastForm({ ...forecastForm, endDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Total Oil Forecast (bbls)</Label>
              <Input type="number" value={forecastForm.totalOilForecast} onChange={(e) => setForecastForm({ ...forecastForm, totalOilForecast: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Total Gas Forecast (scf)</Label>
              <Input type="number" value={forecastForm.totalGasForecast} onChange={(e) => setForecastForm({ ...forecastForm, totalGasForecast: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Assumptions</Label>
              <Textarea value={forecastForm.assumptions} onChange={(e) => setForecastForm({ ...forecastForm, assumptions: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForecastDialog(false)}>Cancel</Button>
            <Button onClick={() => forecastMutation.mutate(forecastForm)} disabled={forecastMutation.isPending}>
              {forecastMutation.isPending ? 'Saving...' : 'Create Forecast'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
