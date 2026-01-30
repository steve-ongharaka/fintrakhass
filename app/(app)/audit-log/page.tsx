'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PageHeader } from '@/components/page-header';
import { KPICard } from '@/components/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  History, Eye, FileEdit, Trash2, LogIn, LogOut, Download, Upload, CheckCircle, XCircle, Filter, RefreshCw
} from 'lucide-react';

const actionIcons: Record<string, any> = {
  create: FileEdit,
  update: FileEdit,
  delete: Trash2,
  view: Eye,
  export: Download,
  import: Upload,
  approve: CheckCircle,
  reject: XCircle,
  login: LogIn,
  logout: LogOut
};

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  view: 'bg-gray-100 text-gray-800',
  export: 'bg-purple-100 text-purple-800',
  import: 'bg-indigo-100 text-indigo-800',
  approve: 'bg-emerald-100 text-emerald-800',
  reject: 'bg-orange-100 text-orange-800',
  login: 'bg-cyan-100 text-cyan-800',
  logout: 'bg-slate-100 text-slate-800'
};

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', actionFilter, entityFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (actionFilter && actionFilter !== 'all') params.append('action', actionFilter);
      if (entityFilter && entityFilter !== 'all') params.append('entityType', entityFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    }
  });

  const logs = logsData?.data || [];

  // Calculate stats
  const todayLogs = logs.filter((l: any) => {
    const logDate = new Date(l.timestamp);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length;

  const createActions = logs.filter((l: any) => l.action === 'create').length;
  const updateActions = logs.filter((l: any) => l.action === 'update').length;
  const deleteActions = logs.filter((l: any) => l.action === 'delete').length;

  const uniqueEntities: string[] = [...new Set(logs.map((l: any) => l.entityType).filter(Boolean))] as string[];

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setShowDetailsDialog(true);
  };

  const columns = [
    { 
      key: 'timestamp', 
      header: 'Timestamp', 
      sortable: true,
      render: (v: any) => v?.timestamp ? format(new Date(v.timestamp), 'dd MMM yyyy HH:mm:ss') : '-'
    },
    { 
      key: 'userEmail', 
      header: 'User',
      render: (v: any) => (
        <div>
          <div className="font-medium">{v?.userName || 'System'}</div>
          <div className="text-xs text-muted-foreground">{v?.userEmail || '-'}</div>
        </div>
      )
    },
    { 
      key: 'action', 
      header: 'Action',
      render: (v: any) => {
        const IconComponent = actionIcons[v?.action] || History;
        return (
          <Badge className={`${actionColors[v?.action] || 'bg-gray-100'} flex items-center gap-1 w-fit`}>
            <IconComponent className="h-3 w-3" />
            {v?.action?.toUpperCase()}
          </Badge>
        );
      }
    },
    { key: 'entityType', header: 'Entity Type' },
    { key: 'entityName', header: 'Entity', render: (v: any) => v?.entityName || v?.entityId || '-' },
    { key: 'description', header: 'Description', render: (v: any) => (
      <span className="text-sm truncate max-w-xs block">{v?.description || '-'}</span>
    )},
    { 
      key: 'success', 
      header: 'Status',
      render: (v: any) => (
        <Badge className={v?.success !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
          {v?.success !== false ? 'Success' : 'Failed'}
        </Badge>
      )
    },
    { 
      key: 'actions', 
      header: '', 
      render: (v: any) => (
        <Button size="sm" variant="ghost" onClick={() => handleViewDetails(v)}>
          <Eye className="h-4 w-4" />
        </Button>
      )
    }
  ];

  const clearFilters = () => {
    setActionFilter('all');
    setEntityFilter('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        description="Comprehensive activity and change logging for compliance"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Today's Activities" value={todayLogs} icon={History} colorClass="text-blue-600" />
        <KPICard title="Create Actions" value={createActions} icon={FileEdit} colorClass="text-green-600" />
        <KPICard title="Update Actions" value={updateActions} icon={RefreshCw} colorClass="text-yellow-600" />
        <KPICard title="Delete Actions" value={deleteActions} icon={Trash2} colorClass="text-red-600" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" /> Filters
            </CardTitle>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Action:</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="view">View</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                    <SelectItem value="approve">Approve</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="logout">Logout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Entity:</Label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {uniqueEntities.map((entity: string) => (
                      <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">From:</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">To:</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-36"
                />
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            data={logs} 
            columns={columns} 
            loading={isLoading} 
            searchable 
            searchKeys={['userEmail', 'userName', 'entityType', 'description']} 
            pageSize={20}
          />
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Timestamp</Label>
                  <p className="font-medium">{selectedLog.timestamp ? format(new Date(selectedLog.timestamp), 'dd MMM yyyy HH:mm:ss') : '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Action</Label>
                  <Badge className={actionColors[selectedLog.action] || 'bg-gray-100'}>
                    {selectedLog.action?.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">User</Label>
                  <p className="font-medium">{selectedLog.userName || 'System'}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.userEmail}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <p className="font-medium">{selectedLog.userRole || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Entity Type</Label>
                  <p className="font-medium">{selectedLog.entityType || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Entity ID</Label>
                  <p className="font-medium text-xs">{selectedLog.entityId || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Module</Label>
                  <p className="font-medium">{selectedLog.module || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={selectedLog.success !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {selectedLog.success !== false ? 'Success' : 'Failed'}
                  </Badge>
                </div>
              </div>

              {selectedLog.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="mt-1 p-2 bg-muted rounded text-sm">{selectedLog.description}</p>
                </div>
              )}

              {selectedLog.previousValues && (
                <div>
                  <Label className="text-xs text-muted-foreground">Previous Values</Label>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedLog.previousValues), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && (
                <div>
                  <Label className="text-xs text-muted-foreground">New Values</Label>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedLog.newValues), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.changedFields && (
                <div>
                  <Label className="text-xs text-muted-foreground">Changed Fields</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {JSON.parse(selectedLog.changedFields).map((field: string) => (
                      <Badge key={field} variant="outline">{field}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.errorMessage && (
                <div>
                  <Label className="text-xs text-muted-foreground text-red-600">Error Message</Label>
                  <p className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">{selectedLog.errorMessage}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground">Request Context</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {selectedLog.ipAddress && (
                    <div><span className="text-muted-foreground">IP:</span> {selectedLog.ipAddress}</div>
                  )}
                  {selectedLog.requestPath && (
                    <div><span className="text-muted-foreground">Path:</span> {selectedLog.requestPath}</div>
                  )}
                  {selectedLog.requestMethod && (
                    <div><span className="text-muted-foreground">Method:</span> {selectedLog.requestMethod}</div>
                  )}
                  {selectedLog.sessionId && (
                    <div><span className="text-muted-foreground">Session:</span> {selectedLog.sessionId.substring(0, 8)}...</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
