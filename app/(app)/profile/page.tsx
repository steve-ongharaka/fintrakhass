'use client';

import { useSession } from 'next-auth/react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession() || {};
  const user = session?.user as any;

  const roleColors: Record<string, 'default' | 'success' | 'warning'> = {
    admin: 'success',
    operator: 'default',
    viewer: 'warning',
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Profile" description="View your account information" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user?.firstName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-gray-500">{user?.email}</p>
              <Badge variant={roleColors[user?.role] ?? 'default'} className="mt-2 capitalize">
                {user?.role}
              </Badge>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-medium mb-3">Role Permissions</h3>
            <div className="space-y-2 text-sm">
              {user?.role === 'admin' && (
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Full access to all features</li>
                  <li>Manage users and roles</li>
                  <li>Create, edit, and delete all data</li>
                  <li>Configure system settings</li>
                </ul>
              )}
              {user?.role === 'operator' && (
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Enter and edit production data</li>
                  <li>View all dashboards and reports</li>
                  <li>Manage wells and facilities data</li>
                  <li>Cannot manage users</li>
                </ul>
              )}
              {user?.role === 'viewer' && (
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>View dashboards and reports</li>
                  <li>View wells, facilities, and production data</li>
                  <li>Export data to CSV</li>
                  <li>Read-only access (cannot create or edit)</li>
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
