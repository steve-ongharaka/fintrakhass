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
  Plus, FileText, ClipboardCheck, Building2, Calendar, Send, CheckCircle, Clock, Edit
} from 'lucide-react';

const reportTypeLabels: Record<string, string> = {
  dpr_monthly: 'DPR Monthly Report',
  dpr_quarterly: 'DPR Quarterly Report',
  dpr_annual: 'DPR Annual Report',
  nnpc_report: 'NNPC Report',
  gas_flare_report: 'Gas Flare Report',
  royalty_report: 'Royalty Report',
  jv_report: 'JV Report',
  psc_report: 'PSC Report',
  environmental: 'Environmental Report',
  custom: 'Custom Report'
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  submitted: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  revision_required: 'bg-orange-100 text-orange-800',
};

export default function RegulatoryPage() {
  const { canEdit } = useUserRole();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('reports');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [reportForm, setReportForm] = useState({
    reportType: 'dpr_monthly', reportingPeriod: '', periodStart: '', periodEnd: '',
    regulatoryBody: 'DPR', licenseBlock: '', operatorName: '',
    totalOilProduction: 0, totalGasProduction: 0, totalWaterProduction: 0,
    gasFlared: 0, gasReinjected: 0, gasSold: 0,
    totalExported: 0, domesticSales: 0, royaltyVolume: 0, royaltyRate: 0,
    totalWells: 0, producingWells: 0, shutInWells: 0,
    status: 'draft', comments: ''
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['regulatory-reports'],
    queryFn: async () => {
      const res = await fetch('/api/regulatory-reports');
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    }
  });

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['regulatory-templates'],
    queryFn: async () => {
      const res = await fetch('/api/regulatory-templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    }
  });

  const reports = reportsData?.data || [];
  const templates = templatesData?.data || [];

  const reportMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/regulatory-reports/${editingItem.id}` : '/api/regulatory-reports';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save report');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulatory-reports'] });
      toast.success(editingItem ? 'Report updated' : 'Report created');
      setShowReportDialog(false);
      setEditingItem(null);
    },
    onError: () => toast.error('Failed to save report')
  });

  const pendingReports = reports.filter((r: any) => ['draft', 'pending_review'].includes(r.status)).length;
  const submittedReports = reports.filter((r: any) => r.status === 'submitted').length;
  const acceptedReports = reports.filter((r: any) => r.status === 'accepted').length;

  const reportColumns = [
    { key: 'reportNumber', header: 'Report #', sortable: true },
    { key: 'reportType', header: 'Type', render: (v: any) => reportTypeLabels[v?.reportType] || v?.reportType },
    { key: 'reportingPeriod', header: 'Period' },
    { key: 'regulatoryBody', header: 'Regulatory Body' },
    { key: 'totalOilProduction', header: 'Oil (bbls)', render: (v: any) => v?.totalOilProduction?.toLocaleString() || '0' },
    { key: 'totalGasProduction', header: 'Gas (scf)', render: (v: any) => v?.totalGasProduction?.toLocaleString() || '0' },
    { key: 'status', header: 'Status', render: (v: any) => (
      <Badge className={statusColors[v?.status] || 'bg-gray-100'}>{v?.status?.replace('_', ' ')}</Badge>
    )},
    { key: 'actions', header: 'Actions', render: (v: any) => canEdit && (
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setEditingItem(v); setReportForm(v); setShowReportDialog(true); }}><Edit className="h-4 w-4" /></Button>
        {v?.status === 'draft' && (
          <Button size="sm" variant="ghost" onClick={() => reportMutation.mutate({ ...v, status: 'submitted' })}><Send className="h-4 w-4" /></Button>
        )}
      </div>
    )}
  ];

  const templateColumns = [
    { key: 'templateName', header: 'Template Name', sortable: true },
    { key: 'reportType', header: 'Report Type', render: (v: any) => reportTypeLabels[v?.reportType] || v?.reportType },
    { key: 'regulatoryBody', header: 'Regulatory Body' },
    { key: 'version', header: 'Version' },
    { key: 'isActive', header: 'Status', render: (v: any) => (
      <Badge className={v?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
        {v?.isActive ? 'Active' : 'Inactive'}
      </Badge>
    )}
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regulatory Compliance"
        description="Manage government and DPR regulatory reports"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total Reports" value={reports.length} icon={FileText} colorClass="text-blue-600" />
        <KPICard title="Pending" value={pendingReports} icon={Clock} colorClass="text-yellow-600" />
        <KPICard title="Submitted" value={submittedReports} icon={Send} colorClass="text-purple-600" />
        <KPICard title="Accepted" value={acceptedReports} icon={CheckCircle} colorClass="text-green-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports"><FileText className="h-4 w-4 mr-2" />Reports</TabsTrigger>
          <TabsTrigger value="templates"><ClipboardCheck className="h-4 w-4 mr-2" />Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Regulatory Reports</CardTitle>
              {canEdit && (
                <Button onClick={() => {
                  setEditingItem(null);
                  setReportForm({
                    reportType: 'dpr_monthly', reportingPeriod: '', periodStart: '', periodEnd: '',
                    regulatoryBody: 'DPR', licenseBlock: '', operatorName: '',
                    totalOilProduction: 0, totalGasProduction: 0, totalWaterProduction: 0,
                    gasFlared: 0, gasReinjected: 0, gasSold: 0,
                    totalExported: 0, domesticSales: 0, royaltyVolume: 0, royaltyRate: 0,
                    totalWells: 0, producingWells: 0, shutInWells: 0,
                    status: 'draft', comments: ''
                  });
                  setShowReportDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />Create Report
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={reports} columns={reportColumns} loading={reportsLoading} searchable searchKeys={['reportNumber', 'reportingPeriod']} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Report Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable data={templates} columns={templateColumns} loading={templatesLoading} searchable searchKeys={['templateName']} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Regulatory Report' : 'Create Regulatory Report'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportForm.reportType} onValueChange={(v) => setReportForm({ ...reportForm, reportType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(reportTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reporting Period</Label>
              <Input value={reportForm.reportingPeriod} placeholder="e.g., 2024-01" onChange={(e) => setReportForm({ ...reportForm, reportingPeriod: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Regulatory Body</Label>
              <Select value={reportForm.regulatoryBody} onValueChange={(v) => setReportForm({ ...reportForm, regulatoryBody: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DPR">DPR</SelectItem>
                  <SelectItem value="NNPC">NNPC</SelectItem>
                  <SelectItem value="NUPRC">NUPRC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Period Start</Label>
              <Input type="date" value={reportForm.periodStart ? reportForm.periodStart.substring(0, 10) : ''} onChange={(e) => setReportForm({ ...reportForm, periodStart: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Period End</Label>
              <Input type="date" value={reportForm.periodEnd ? reportForm.periodEnd.substring(0, 10) : ''} onChange={(e) => setReportForm({ ...reportForm, periodEnd: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>License Block</Label>
              <Input value={reportForm.licenseBlock} onChange={(e) => setReportForm({ ...reportForm, licenseBlock: e.target.value })} />
            </div>

            <div className="col-span-3 border-t pt-4 mt-2">
              <h4 className="font-semibold mb-3">Production Data</h4>
            </div>
            <div className="space-y-2">
              <Label>Total Oil Production (bbls)</Label>
              <Input type="number" value={reportForm.totalOilProduction} onChange={(e) => setReportForm({ ...reportForm, totalOilProduction: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Total Gas Production (scf)</Label>
              <Input type="number" value={reportForm.totalGasProduction} onChange={(e) => setReportForm({ ...reportForm, totalGasProduction: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Total Water Production (bbls)</Label>
              <Input type="number" value={reportForm.totalWaterProduction} onChange={(e) => setReportForm({ ...reportForm, totalWaterProduction: parseFloat(e.target.value) || 0 })} />
            </div>

            <div className="col-span-3 border-t pt-4 mt-2">
              <h4 className="font-semibold mb-3">Gas Utilization</h4>
            </div>
            <div className="space-y-2">
              <Label>Gas Flared (scf)</Label>
              <Input type="number" value={reportForm.gasFlared} onChange={(e) => setReportForm({ ...reportForm, gasFlared: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Gas Reinjected (scf)</Label>
              <Input type="number" value={reportForm.gasReinjected} onChange={(e) => setReportForm({ ...reportForm, gasReinjected: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Gas Sold (scf)</Label>
              <Input type="number" value={reportForm.gasSold} onChange={(e) => setReportForm({ ...reportForm, gasSold: parseFloat(e.target.value) || 0 })} />
            </div>

            <div className="col-span-3 border-t pt-4 mt-2">
              <h4 className="font-semibold mb-3">Well Count</h4>
            </div>
            <div className="space-y-2">
              <Label>Total Wells</Label>
              <Input type="number" value={reportForm.totalWells} onChange={(e) => setReportForm({ ...reportForm, totalWells: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Producing Wells</Label>
              <Input type="number" value={reportForm.producingWells} onChange={(e) => setReportForm({ ...reportForm, producingWells: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Shut-In Wells</Label>
              <Input type="number" value={reportForm.shutInWells} onChange={(e) => setReportForm({ ...reportForm, shutInWells: parseInt(e.target.value) || 0 })} />
            </div>

            <div className="col-span-3 space-y-2">
              <Label>Comments</Label>
              <Textarea value={reportForm.comments} onChange={(e) => setReportForm({ ...reportForm, comments: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
            <Button onClick={() => reportMutation.mutate(reportForm)} disabled={reportMutation.isPending}>
              {reportMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
