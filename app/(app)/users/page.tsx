'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { TableSkeleton } from '@/components/loading-spinner';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Loader2,
  Shield,
  ShieldCheck,
  Eye,
  Check,
  X,
  Key,
  Lock,
  Pencil,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'admin' | 'operator' | 'viewer';
  createdAt: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string; borderColor: string; description: string }> = {
  admin: { 
    label: 'Administrator', 
    icon: ShieldCheck, 
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Full system access'
  },
  operator: { 
    label: 'Operator', 
    icon: Pencil, 
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Data entry access'
  },
  viewer: { 
    label: 'Viewer', 
    icon: Eye, 
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Read-only access'
  },
};

// Permissions matrix
const PERMISSIONS = [
  { category: 'Dashboard', permission: 'View Dashboard', admin: true, operator: true, viewer: true },
  { category: 'Dashboard', permission: 'View Analytics', admin: true, operator: true, viewer: true },
  { category: 'Production', permission: 'View Production Data', admin: true, operator: true, viewer: true },
  { category: 'Production', permission: 'Create Production Entries', admin: true, operator: true, viewer: false },
  { category: 'Production', permission: 'Edit Production Entries', admin: true, operator: true, viewer: false },
  { category: 'Production', permission: 'Delete Production Entries', admin: true, operator: false, viewer: false },
  { category: 'Wells', permission: 'View Wells', admin: true, operator: true, viewer: true },
  { category: 'Wells', permission: 'Create Wells', admin: true, operator: false, viewer: false },
  { category: 'Wells', permission: 'Edit Wells', admin: true, operator: false, viewer: false },
  { category: 'Wells', permission: 'Delete Wells', admin: true, operator: false, viewer: false },
  { category: 'Facilities', permission: 'View Facilities', admin: true, operator: true, viewer: true },
  { category: 'Facilities', permission: 'Manage Facilities', admin: true, operator: false, viewer: false },
  { category: 'Products', permission: 'View Products', admin: true, operator: true, viewer: true },
  { category: 'Products', permission: 'Manage Products', admin: true, operator: false, viewer: false },
  { category: 'Reports', permission: 'View Reports', admin: true, operator: true, viewer: true },
  { category: 'Reports', permission: 'Export Reports', admin: true, operator: true, viewer: true },
  { category: 'Users', permission: 'View Users', admin: true, operator: false, viewer: false },
  { category: 'Users', permission: 'Create Users', admin: true, operator: false, viewer: false },
  { category: 'Users', permission: 'Edit User Roles', admin: true, operator: false, viewer: false },
  { category: 'Users', permission: 'Delete Users', admin: true, operator: false, viewer: false },
  { category: 'Settings', permission: 'System Configuration', admin: true, operator: false, viewer: false },
];

export default function UsersPage() {
  const { data: session } = useSession() || {};
  const currentUserId = (session?.user as any)?.id;
  
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [createFormData, setCreateFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'viewer',
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to create user');
      return result;
    },
    onSuccess: () => {
      toast.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateOpen(false);
      setCreateFormData({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        role: 'viewer',
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to update user');
      return result;
    },
    onSuccess: () => {
      toast.success('User role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to delete user');
      return result;
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setIsEditOpen(true);
  };

  const handleUpdateRole = () => {
    if (editingUser && selectedRole) {
      updateMutation.mutate({ id: editingUser.id, role: selectedRole });
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (createFormData.password !== createFormData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (createFormData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    createMutation.mutate({
      email: createFormData.email,
      password: createFormData.password,
      firstName: createFormData.firstName || undefined,
      lastName: createFormData.lastName || undefined,
      role: createFormData.role,
    });
  };

  const users = usersData?.data ?? [];

  // Stats
  const adminCount = users.filter((u: User) => u.role === 'admin').length;
  const operatorCount = users.filter((u: User) => u.role === 'operator').length;
  const viewerCount = users.filter((u: User) => u.role === 'viewer').length;

  const columns = [
    {
      key: 'name',
      header: 'User',
      sortable: true,
      render: (user: User) => {
        const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || user.email[0]}`.toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {user.firstName || user.lastName
                  ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                  : 'No Name'}
              </p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => {
        const config = ROLE_CONFIG[user.role];
        const Icon = config?.icon || Shield;
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${config?.bgColor} ${config?.color} ${config?.borderColor}`}>
            <Icon className="h-3.5 w-3.5" />
            {config?.label || user.role}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      render: (user: User) => (
        <span className="text-gray-600">
          {new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      ),
    },
  ];

  // Group permissions by category
  const permissionsByCategory = PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof PERMISSIONS>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage user accounts, roles, and access permissions"
        action={
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg">
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-900">{users.length}</p>
                <p className="text-xs text-indigo-600">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-900">{adminCount}</p>
                <p className="text-xs text-emerald-600">Administrators</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Pencil className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{operatorCount}</p>
                <p className="text-xs text-blue-600">Operators</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Eye className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">{viewerCount}</p>
                <p className="text-xs text-amber-600">Viewers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            User Accounts
          </CardTitle>
          <CardDescription>Manage all registered user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description="No users have been registered yet."
            />
          ) : (
            <DataTable
              data={users}
              columns={columns}
              searchable={true}
              searchPlaceholder="Search by name or email..."
              searchKeys={['email', 'firstName', 'lastName']}
              pageSize={10}
              pageSizeOptions={[5, 10, 20]}
              actions={(user: User) => (
                <>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} className="hover:bg-indigo-50">
                    <Edit className="h-4 w-4 text-indigo-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={user.id === currentUserId}
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this user?')) {
                        deleteMutation.mutate(user.id);
                      }
                    }}
                    className="hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </>
              )}
            />
          )}
        </CardContent>
      </Card>

      {/* Roles & Permissions Reference */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Roles & Permissions Matrix
          </CardTitle>
          <CardDescription>Reference guide for role-based access control</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(ROLE_CONFIG).map(([role, config]) => {
              const Icon = config.icon;
              return (
                <div key={role} className={`p-4 rounded-xl border ${config.bgColor} ${config.borderColor}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <p className={`font-semibold ${config.color}`}>{config.label}</p>
                      <p className="text-xs text-gray-500">{config.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Permissions Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Permission</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-emerald-600 uppercase tracking-wider">Admin</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-blue-600 uppercase tracking-wider">Operator</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-amber-600 uppercase tracking-wider">Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <>
                    <tr key={category} className="bg-gray-50/50">
                      <td colSpan={4} className="px-4 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {category}
                      </td>
                    </tr>
                    {perms.map((perm, idx) => (
                      <tr key={`${category}-${idx}`} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-2.5 text-sm text-gray-700">{perm.permission}</td>
                        <td className="px-4 py-2.5 text-center">
                          {perm.admin ? (
                            <Check className="h-5 w-5 text-emerald-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {perm.operator ? (
                            <Check className="h-5 w-5 text-blue-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {perm.viewer ? (
                            <Check className="h-5 w-5 text-amber-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new user to the system with a specific role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={createFormData.firstName}
                  onChange={(e) => setCreateFormData({ ...createFormData, firstName: e.target.value })}
                  placeholder="John"
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={createFormData.lastName}
                  onChange={(e) => setCreateFormData({ ...createFormData, lastName: e.target.value })}
                  placeholder="Doe"
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                placeholder="user@example.com"
                required
                className="bg-gray-50 focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                placeholder="••••••••"
                required
                minLength={8}
                className="bg-gray-50 focus:bg-white"
              />
              <p className="text-xs text-gray-500">Minimum 8 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={createFormData.confirmPassword}
                onChange={(e) => setCreateFormData({ ...createFormData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
                className="bg-gray-50 focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={createFormData.role}
                onValueChange={(val) => setCreateFormData({ ...createFormData, role: val })}
              >
                <SelectTrigger className="bg-gray-50 focus:bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Administrator - Full access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="operator">
                    <div className="flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-blue-600" />
                      <span>Operator - Data entry access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-amber-600" />
                      <span>Viewer - Read-only access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-gradient-to-r from-indigo-600 to-blue-600"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-indigo-600" />
              Edit User Role
            </DialogTitle>
            <DialogDescription>
              Change the role for {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">Current User</p>
              <p className="font-semibold text-gray-900">
                {editingUser?.firstName || editingUser?.lastName
                  ? `${editingUser?.firstName ?? ''} ${editingUser?.lastName ?? ''}`.trim()
                  : editingUser?.email}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Select New Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="bg-gray-50 focus:bg-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Administrator - Full access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="operator">
                    <div className="flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-blue-600" />
                      <span>Operator - Data entry access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-amber-600" />
                      <span>Viewer - Read-only access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateRole} 
                disabled={updateMutation.isPending}
                className="bg-gradient-to-r from-indigo-600 to-blue-600"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
