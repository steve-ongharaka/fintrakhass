'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { TableSkeleton } from '@/components/loading-spinner';
import { DataTable } from '@/components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Droplets,
  Plus,
  Edit,
  Trash2,
  Loader2,
  MapPin,
  Calendar,
  Building2,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';

const STATUS_BADGES: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive'; className: string }> = {
  active: { label: 'Active', variant: 'success', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactive', variant: 'warning', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  shut_in: { label: 'Shut-in', variant: 'destructive', className: 'bg-red-100 text-red-700 border-red-200' },
};

const WELL_TYPES: Record<string, { label: string; className: string }> = {
  oil: { label: 'Oil', className: 'bg-amber-50 text-amber-700' },
  gas: { label: 'Gas', className: 'bg-red-50 text-red-700' },
  water_injection: { label: 'Water Injection', className: 'bg-blue-50 text-blue-700' },
};

interface Well {
  id: string;
  wellName: string;
  wellId: string;
  field: string | null;
  facilityId: string | null;
  facility: { facilityName: string } | null;
  status: 'active' | 'inactive' | 'shut_in';
  wellType: 'oil' | 'gas' | 'water_injection';
  latitude: number | null;
  longitude: number | null;
  spudDate: string | null;
  completionDate: string | null;
}

interface Facility {
  id: string;
  facilityName: string;
  facilityId: string;
}

export default function WellsPage() {
  const { data: session } = useSession() || {};
  const userRole = (session?.user as any)?.role ?? 'viewer';
  const canEdit = userRole !== 'viewer';
  
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWell, setEditingWell] = useState<Well | null>(null);
  const [formData, setFormData] = useState({
    wellName: '',
    wellId: '',
    field: '',
    facilityId: '',
    status: 'active',
    wellType: 'oil',
    latitude: '',
    longitude: '',
    spudDate: '',
    completionDate: '',
  });

  const { data: wellsData, isLoading } = useQuery({
    queryKey: ['wells'],
    queryFn: async () => {
      const res = await fetch('/api/wells?limit=1000');
      return res.json();
    },
  });

  const { data: facilitiesData } = useQuery({
    queryKey: ['facilities-list'],
    queryFn: async () => {
      const res = await fetch('/api/facilities?limit=100');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/wells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to create well');
      return result;
    },
    onSuccess: () => {
      toast.success('Well created successfully');
      queryClient.invalidateQueries({ queryKey: ['wells'] });
      closeForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/wells/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to update well');
      return result;
    },
    onSuccess: () => {
      toast.success('Well updated successfully');
      queryClient.invalidateQueries({ queryKey: ['wells'] });
      closeForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/wells/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to delete well');
      return result;
    },
    onSuccess: () => {
      toast.success('Well deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['wells'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingWell(null);
    setFormData({
      wellName: '',
      wellId: '',
      field: '',
      facilityId: '',
      status: 'active',
      wellType: 'oil',
      latitude: '',
      longitude: '',
      spudDate: '',
      completionDate: '',
    });
  };

  const openCreateForm = () => {
    setEditingWell(null);
    setFormData({
      wellName: '',
      wellId: '',
      field: '',
      facilityId: '',
      status: 'active',
      wellType: 'oil',
      latitude: '',
      longitude: '',
      spudDate: '',
      completionDate: '',
    });
    setIsFormOpen(true);
  };

  const openEditForm = (well: Well) => {
    setEditingWell(well);
    setFormData({
      wellName: well.wellName,
      wellId: well.wellId,
      field: well.field || '',
      facilityId: well.facilityId || '',
      status: well.status,
      wellType: well.wellType,
      latitude: well.latitude?.toString() || '',
      longitude: well.longitude?.toString() || '',
      spudDate: well.spudDate ? new Date(well.spudDate).toISOString().split('T')[0] : '',
      completionDate: well.completionDate ? new Date(well.completionDate).toISOString().split('T')[0] : '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      spudDate: formData.spudDate || null,
      completionDate: formData.completionDate || null,
      facilityId: formData.facilityId || null,
    };

    if (editingWell) {
      updateMutation.mutate({ id: editingWell.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const wells = wellsData?.data ?? [];
  const facilities = facilitiesData?.data ?? [];

  // Stats
  const activeCount = wells.filter((w: Well) => w.status === 'active').length;
  const inactiveCount = wells.filter((w: Well) => w.status === 'inactive').length;
  const shutInCount = wells.filter((w: Well) => w.status === 'shut_in').length;

  const columns = [
    {
      key: 'wellName',
      header: 'Well Name',
      sortable: true,
      render: (well: Well) => (
        <div>
          <p className="font-semibold text-gray-900">{well.wellName}</p>
          <p className="text-xs text-gray-500">{well.wellId}</p>
        </div>
      ),
    },
    {
      key: 'field',
      header: 'Field',
      sortable: true,
      render: (well: Well) => well.field || '-',
    },
    {
      key: 'facility',
      header: 'Facility',
      render: (well: Well) => well.facility?.facilityName || '-',
    },
    {
      key: 'wellType',
      header: 'Type',
      render: (well: Well) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${WELL_TYPES[well.wellType]?.className || ''}`}>
          {WELL_TYPES[well.wellType]?.label || well.wellType}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (well: Well) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_BADGES[well.status]?.className || ''}`}>
          {STATUS_BADGES[well.status]?.label || well.status}
        </span>
      ),
    },
    {
      key: 'completionDate',
      header: 'Completion',
      render: (well: Well) => well.completionDate ? new Date(well.completionDate).toLocaleDateString() : '-',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wells Management"
        description="Manage and monitor all wells in your production operations"
        action={
          canEdit ? (
            <Button onClick={openCreateForm} className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
              <Plus className="h-4 w-4" />
              Add Well
            </Button>
          ) : undefined
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Droplets className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{wells.length}</p>
                <p className="text-xs text-blue-600">Total Wells</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-900">{activeCount}</p>
                <p className="text-xs text-emerald-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">{inactiveCount}</p>
                <p className="text-xs text-amber-600">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <Droplets className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-900">{shutInCount}</p>
                <p className="text-xs text-red-600">Shut-in</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : wells.length === 0 ? (
            <EmptyState
              icon={Droplets}
              title="No wells found"
              description="Start by adding your first well to the system."
              action={
                canEdit ? (
                  <Button onClick={openCreateForm} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Well
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DataTable
              data={wells}
              columns={columns}
              searchable={true}
              searchPlaceholder="Search wells by name, ID, or field..."
              searchKeys={['wellName', 'wellId', 'field']}
              pageSize={10}
              pageSizeOptions={[5, 10, 20, 50]}
              actions={canEdit ? (well: Well) => (
                <>
                  <Button variant="ghost" size="icon" onClick={() => openEditForm(well)} className="hover:bg-blue-50">
                    <Edit className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this well?')) {
                        deleteMutation.mutate(well.id);
                      }
                    }}
                    className="hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </>
              ) : undefined}
            />
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-600" />
              {editingWell ? 'Edit Well' : 'Add New Well'}
            </DialogTitle>
            <DialogDescription>
              {editingWell ? 'Update the well information below.' : 'Enter the details for the new well.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wellName">Well Name *</Label>
                <Input
                  id="wellName"
                  value={formData.wellName}
                  onChange={(e) => setFormData({ ...formData, wellName: e.target.value })}
                  required
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wellId">Well ID *</Label>
                <Input
                  id="wellId"
                  value={formData.wellId}
                  onChange={(e) => setFormData({ ...formData, wellId: e.target.value })}
                  required
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field">Field</Label>
                <Input
                  id="field"
                  value={formData.field}
                  onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facilityId">Facility</Label>
                <Select
                  value={formData.facilityId}
                  onValueChange={(val) => setFormData({ ...formData, facilityId: val })}
                >
                  <SelectTrigger className="bg-gray-50 focus:bg-white">
                    <SelectValue placeholder="Select facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((f: Facility) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.facilityName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="bg-gray-50 focus:bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="shut_in">Shut-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wellType">Well Type</Label>
                <Select
                  value={formData.wellType}
                  onValueChange={(val) => setFormData({ ...formData, wellType: val })}
                >
                  <SelectTrigger className="bg-gray-50 focus:bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oil">Oil</SelectItem>
                    <SelectItem value="gas">Gas</SelectItem>
                    <SelectItem value="water_injection">Water Injection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spudDate">Spud Date</Label>
                <Input
                  id="spudDate"
                  type="date"
                  value={formData.spudDate}
                  onChange={(e) => setFormData({ ...formData, spudDate: e.target.value })}
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completionDate">Completion Date</Label>
                <Input
                  id="completionDate"
                  type="date"
                  value={formData.completionDate}
                  onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-blue-700"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingWell ? 'Update Well' : 'Create Well'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
