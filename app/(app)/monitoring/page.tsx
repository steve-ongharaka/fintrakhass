'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Zap,
  AlertCircle,
  Filter,
  Plus,
  Wrench,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { KPICard } from '@/components/kpi-card';
import { toast } from 'react-hot-toast';

const alertSeverityColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const alertStatusColors: Record<string, string> = {
  active: 'bg-red-100 text-red-800',
  acknowledged: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
};

export default function MonitoringPage() {
  const { data: session } = useSession() || {};
  const queryClient = useQueryClient();
  const userRole = (session?.user as any)?.role;

  const [wellFilter, setWellFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDowntimeDialogOpen, setIsDowntimeDialogOpen] = useState(false);
  const [downtimeForm, setDowntimeForm] = useState({
    wellId: '',
    startTime: '',
    endTime: '',
    reason: 'other',
    description: '',
  });

  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['wellAlerts', wellFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (wellFilter) params.append('wellId', wellFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/performance/alerts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    },
  });

  // Fetch downtime
  const { data: downtimeData, isLoading: downtimeLoading } = useQuery({
    queryKey: ['downtime', wellFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (wellFilter) params.append('wellId', wellFilter);

      const res = await fetch(`/api/performance/downtime?${params}`);
      if (!res.ok) throw new Error('Failed to fetch downtime');
      return res.json();
    },
  });

  // Fetch performance metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['performanceMetrics', wellFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (wellFilter) params.append('wellId', wellFilter);
      params.append('limit', '30');

      const res = await fetch(`/api/performance/metrics?${params}`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
  });

  // Fetch wells
  const { data: wellsData } = useQuery({
    queryKey: ['wells'],
    queryFn: async () => {
      const res = await fetch('/api/wells');
      if (!res.ok) throw new Error('Failed to fetch wells');
      const result = await res.json();
      return result.data || [];
    },
  });

  const wells = wellsData || [];

  // Update alert mutation
  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/performance/alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update alert');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellAlerts'] });
      toast.success('Alert updated');
    },
    onError: () => {
      toast.error('Failed to update alert');
    },
  });

  // Create downtime mutation
  const createDowntimeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/performance/downtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(downtimeForm),
      });
      if (!res.ok) throw new Error('Failed to create downtime');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downtime'] });
      toast.success('Downtime recorded');
      setIsDowntimeDialogOpen(false);
      setDowntimeForm({
        wellId: '',
        startTime: '',
        endTime: '',
        reason: 'other',
        description: '',
      });
    },
    onError: () => {
      toast.error('Failed to record downtime');
    },
  });

  // Calculate statistics
  const activeAlerts = alerts?.filter((a: any) => a.status === 'active').length || 0;
  const criticalAlerts = alerts?.filter((a: any) => a.severity === 'critical' && a.status === 'active').length || 0;
  const avgEfficiency = metrics && metrics.length > 0
    ? metrics.reduce((sum: number, m: any) => sum + (m.efficiency || 0), 0) / metrics.length
    : 0;
  const totalDowntime = downtimeData?.reduce((sum: number, d: any) => sum + (d.duration || 0), 0) || 0;

  const alertColumns = [
    {
      key: 'detectedAt',
      header: 'Detected',
      render: (row: any) => new Date(row.detectedAt).toLocaleString(),
    },
    {
      key: 'well',
      header: 'Well',
      render: (row: any) => row.well.wellName,
    },
    {
      key: 'message',
      header: 'Message',
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (row: any) => (
        <Badge className={alertSeverityColors[row.severity]}>
          {row.severity}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <Badge className={alertStatusColors[row.status]}>
          {row.status}
        </Badge>
      ),
    },
  ];

  const downtimeColumns = [
    {
      key: 'startTime',
      header: 'Start Time',
      render: (row: any) => new Date(row.startTime).toLocaleString(),
    },
    {
      key: 'well',
      header: 'Well',
      render: (row: any) => row.well.wellName,
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row: any) => `${(row.duration || 0).toFixed(1)} hrs`,
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row: any) => row.reason.replace(/_/g, ' '),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Well Performance Monitoring"
        description="Real-time monitoring, alerts, and downtime tracking"
        action={
          (userRole === 'admin' || userRole === 'operator') && (
            <Button onClick={() => setIsDowntimeDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Record Downtime
            </Button>
          )
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Active Alerts"
          value={activeAlerts}
          icon={AlertTriangle}
          colorClass="from-red-500 to-orange-500"
          iconBgClass="bg-red-100 dark:bg-red-900/30"
        />
        <KPICard
          title="Critical Alerts"
          value={criticalAlerts}
          icon={AlertCircle}
          colorClass="from-red-600 to-red-700"
          iconBgClass="bg-red-100 dark:bg-red-900/30"
        />
        <KPICard
          title="Avg Efficiency"
          value={Math.round(avgEfficiency * 10) / 10}
          unit="%"
          icon={Zap}
          colorClass="from-green-500 to-emerald-500"
          iconBgClass="bg-green-100 dark:bg-green-900/30"
        />
        <KPICard
          title="Total Downtime"
          value={Math.round(totalDowntime * 10) / 10}
          unit="hrs"
          icon={Clock}
          colorClass="from-yellow-500 to-amber-500"
          iconBgClass="bg-yellow-100 dark:bg-yellow-900/30"
        />
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Well</Label>
            <Select value={wellFilter || 'all'} onValueChange={(value) => setWellFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Wells" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wells</SelectItem>
                {wells.map((well: any) => (
                  <SelectItem key={well.id} value={well.id}>
                    {well.wellName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Alert Status</Label>
            <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Alerts Table */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Active Alerts</h3>
            <p className="text-sm text-muted-foreground">
              {alerts?.length || 0} total alerts
            </p>
          </div>
        </div>
        <DataTable
          data={alerts || []}
          columns={alertColumns}
          loading={alertsLoading}
          searchable
          searchKeys={['well.wellName', 'message']}
          pageSize={10}
          actions={(row: any) => (
            <div className="flex gap-2">
              {row.status === 'active' && (userRole === 'admin' || userRole === 'operator') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateAlertMutation.mutate({ id: row.id, status: 'acknowledged' });
                  }}
                >
                  <CheckCircle className="w-4 h-4 text-yellow-500" />
                </Button>
              )}
              {row.status === 'acknowledged' && (userRole === 'admin' || userRole === 'operator') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateAlertMutation.mutate({ id: row.id, status: 'resolved' });
                  }}
                >
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </Button>
              )}
            </div>
          )}
        />
      </Card>

      {/* Downtime Table */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Downtime Log</h3>
            <p className="text-sm text-muted-foreground">
              {downtimeData?.length || 0} downtime events
            </p>
          </div>
        </div>
        <DataTable
          data={downtimeData || []}
          columns={downtimeColumns}
          loading={downtimeLoading}
          searchable
          searchKeys={['well.wellName', 'reason']}
          pageSize={10}
        />
      </Card>

      {/* Record Downtime Dialog */}
      <Dialog open={isDowntimeDialogOpen} onOpenChange={setIsDowntimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Downtime</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Well</Label>
              <Select
                value={downtimeForm.wellId}
                onValueChange={(value) =>
                  setDowntimeForm({ ...downtimeForm, wellId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select well" />
                </SelectTrigger>
                <SelectContent>
                  {wells.map((well: any) => (
                    <SelectItem key={well.id} value={well.id}>
                      {well.wellName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={downtimeForm.startTime}
                  onChange={(e) =>
                    setDowntimeForm({ ...downtimeForm, startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Time (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={downtimeForm.endTime}
                  onChange={(e) =>
                    setDowntimeForm({ ...downtimeForm, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Select
                value={downtimeForm.reason}
                onValueChange={(value) =>
                  setDowntimeForm({ ...downtimeForm, reason: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled_maintenance">
                    Scheduled Maintenance
                  </SelectItem>
                  <SelectItem value="unscheduled_maintenance">
                    Unscheduled Maintenance
                  </SelectItem>
                  <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                  <SelectItem value="weather">Weather</SelectItem>
                  <SelectItem value="regulatory">Regulatory</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the downtime event..."
                value={downtimeForm.description}
                onChange={(e) =>
                  setDowntimeForm({ ...downtimeForm, description: e.target.value })
                }
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDowntimeDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createDowntimeMutation.mutate()}
                disabled={!downtimeForm.wellId || !downtimeForm.startTime || createDowntimeMutation.isPending}
                className="flex-1"
              >
                Record Downtime
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
