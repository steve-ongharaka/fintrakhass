'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  Building2,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Factory,
  Warehouse,
  Cog,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const FACILITY_TYPES: Record<string, { label: string; icon: any; className: string }> = {
  production: { label: 'Production', icon: Factory, className: 'bg-blue-50 text-blue-700' },
  processing: { label: 'Processing', icon: Cog, className: 'bg-purple-50 text-purple-700' },
  storage: { label: 'Storage', icon: Warehouse, className: 'bg-amber-50 text-amber-700' },
};

interface Facility {
  id: string;
  facilityName: string;
  facilityId: string;
  field: string | null;
  facilityType: 'production' | 'processing' | 'storage';
  operator: string | null;
  location: string | null;
  capacity: number | null;
  status: 'active' | 'inactive';
}

export default function FacilitiesPage() {
  const { data: session } = useSession() || {};
  const userRole = (session?.user as any)?.role ?? 'viewer';
  const canEdit = userRole === 'admin';
  
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [formData, setFormData] = useState({
    facilityName: '',
    facilityId: '',
    field: '',
    facilityType: 'production',
    operator: '',
    location: '',
    capacity: '',
    status: 'active',
  });

  const { data: facilitiesData, isLoading } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const res = await fetch('/api/facilities?limit=1000');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to create facility');
      return result;
    },
    onSuccess: () => {
      toast.success('Facility created successfully');
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      closeForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/facilities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to update facility');
      return result;
    },
    onSuccess: () => {
      toast.success('Facility updated successfully');
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      closeForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/facilities/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to delete facility');
      return result;
    },
    onSuccess: () => {
      toast.success('Facility deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingFacility(null);
    setFormData({
      facilityName: '',
      facilityId: '',
      field: '',
      facilityType: 'production',
      operator: '',
      location: '',
      capacity: '',
      status: 'active',
    });
  };

  const openCreateForm = () => {
    setEditingFacility(null);
    setFormData({
      facilityName: '',
      facilityId: '',
      field: '',
      facilityType: 'production',
      operator: '',
      location: '',
      capacity: '',
      status: 'active',
    });
    setIsFormOpen(true);
  };

  const openEditForm = (facility: Facility) => {
    setEditingFacility(facility);
    setFormData({
      facilityName: facility.facilityName,
      facilityId: facility.facilityId,
      field: facility.field || '',
      facilityType: facility.facilityType,
      operator: facility.operator || '',
      location: facility.location || '',
      capacity: facility.capacity?.toString() || '',
      status: facility.status,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      capacity: formData.capacity ? parseFloat(formData.capacity) : null,
    };

    if (editingFacility) {
      updateMutation.mutate({ id: editingFacility.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const facilities = facilitiesData?.data ?? [];

  // Stats
  const productionCount = facilities.filter((f: Facility) => f.facilityType === 'production').length;
  const processingCount = facilities.filter((f: Facility) => f.facilityType === 'processing').length;
  const storageCount = facilities.filter((f: Facility) => f.facilityType === 'storage').length;

  const columns = [
    {
      key: 'facilityName',
      header: 'Facility Name',
      sortable: true,
      render: (facility: Facility) => (
        <div>
          <p className="font-semibold text-gray-900">{facility.facilityName}</p>
          <p className="text-xs text-gray-500">{facility.facilityId}</p>
        </div>
      ),
    },
    {
      key: 'field',
      header: 'Field',
      sortable: true,
      render: (facility: Facility) => facility.field || '-',
    },
    {
      key: 'facilityType',
      header: 'Type',
      render: (facility: Facility) => {
        const typeInfo = FACILITY_TYPES[facility.facilityType];
        const Icon = typeInfo?.icon || Building2;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeInfo?.className || ''}`}>
            <Icon className="h-3.5 w-3.5" />
            {typeInfo?.label || facility.facilityType}
          </span>
        );
      },
    },
    {
      key: 'operator',
      header: 'Operator',
      render: (facility: Facility) => facility.operator || '-',
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (facility: Facility) => facility.capacity ? `${facility.capacity.toLocaleString()} bbl` : '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (facility: Facility) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_BADGES[facility.status]?.className || ''}`}>
          {STATUS_BADGES[facility.status]?.label || facility.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facilities Management"
        description="Manage production, processing, and storage facilities"
        action={
          canEdit ? (
            <Button onClick={openCreateForm} className="gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg">
              <Plus className="h-4 w-4" />
              Add Facility
            </Button>
          ) : undefined
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">{facilities.length}</p>
                <p className="text-xs text-purple-600">Total Facilities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Factory className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{productionCount}</p>
                <p className="text-xs text-blue-600">Production</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
                <Cog className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-900">{processingCount}</p>
                <p className="text-xs text-violet-600">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Warehouse className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">{storageCount}</p>
                <p className="text-xs text-amber-600">Storage</p>
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
          ) : facilities.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No facilities found"
              description="Start by adding your first facility."
              action={
                canEdit ? (
                  <Button onClick={openCreateForm} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Facility
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DataTable
              data={facilities}
              columns={columns}
              searchable={true}
              searchPlaceholder="Search facilities..."
              searchKeys={['facilityName', 'facilityId', 'field', 'operator']}
              pageSize={10}
              pageSizeOptions={[5, 10, 20, 50]}
              actions={canEdit ? (facility: Facility) => (
                <>
                  <Button variant="ghost" size="icon" onClick={() => openEditForm(facility)} className="hover:bg-purple-50">
                    <Edit className="h-4 w-4 text-purple-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this facility?')) {
                        deleteMutation.mutate(facility.id);
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              {editingFacility ? 'Edit Facility' : 'Add New Facility'}
            </DialogTitle>
            <DialogDescription>
              {editingFacility ? 'Update the facility information.' : 'Enter the details for the new facility.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facilityName">Facility Name *</Label>
                <Input
                  id="facilityName"
                  value={formData.facilityName}
                  onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
                  required
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facilityId">Facility ID *</Label>
                <Input
                  id="facilityId"
                  value={formData.facilityId}
                  onChange={(e) => setFormData({ ...formData, facilityId: e.target.value })}
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
                <Label htmlFor="facilityType">Facility Type</Label>
                <Select
                  value={formData.facilityType}
                  onValueChange={(val) => setFormData({ ...formData, facilityType: val })}
                >
                  <SelectTrigger className="bg-gray-50 focus:bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="operator">Operator</Label>
                <Input
                  id="operator"
                  value={formData.operator}
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (bbl)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="bg-gray-50 focus:bg-white"
                />
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-purple-600 to-purple-700"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingFacility ? 'Update Facility' : 'Create Facility'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
