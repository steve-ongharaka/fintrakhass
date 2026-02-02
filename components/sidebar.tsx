'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/use-user-role';
import {
  LayoutDashboard,
  Droplets,
  Building2,
  Package,
  FileInput,
  FileBarChart,
  Users,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  TestTube,
  Share2,
  Settings as SettingsIcon,
  Activity,
  HelpCircle,
  Gauge,
  Container,
  FileCheck,
  Scale,
  Ship,
  ClipboardList,
  AlertTriangle,
  TrendingDown,
  Droplet,
  History,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Production', href: '/production', icon: FileInput },
  { name: 'Well Tests', href: '/well-tests', icon: TestTube },
  { name: 'Allocations', href: '/allocations', icon: Share2 },
  { name: 'Wells', href: '/wells', icon: Droplets },
  { name: 'Injection Wells', href: '/injection-wells', icon: Droplet },
  { name: 'Facilities', href: '/facilities', icon: Building2 },
  { name: 'Meters', href: '/meters', icon: Gauge },
  { name: 'Tanks', href: '/tanks', icon: Container },
  { name: 'Custody Transfer', href: '/custody-transfer', icon: FileCheck },
  { name: 'Reconciliation', href: '/reconciliation', icon: Scale },
  { name: 'Nominations', href: '/nominations', icon: Ship },
  { name: 'Losses', href: '/losses', icon: AlertTriangle },
  { name: 'Decline Analysis', href: '/decline-analysis', icon: TrendingDown },
  { name: 'Regulatory', href: '/regulatory', icon: ClipboardList },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Monitoring', href: '/monitoring', icon: Activity },
  { name: 'Reports', href: '/reports', icon: FileBarChart },
  { name: 'Audit Log', href: '/audit-log', icon: History },
  { name: 'Help', href: '/help', icon: HelpCircle },
];

const adminNavigation = [
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession() || {};
  const { userRole, isLoading } = useUserRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userName = session?.user?.name ?? session?.user?.email ?? 'User';

  const allNavigation = userRole === 'admin' 
    ? [...navigation, ...adminNavigation] 
    : navigation;

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg md:hidden"
      >
        <Menu className="h-6 w-6 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                <Droplets className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">FinTrak</h1>
                <p className="text-xs text-slate-400">HASS</p>
              </div>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1 rounded hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {allNavigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-slate-700">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all"
              >
                <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <p className="truncate">{userName}</p>
                  <p className="text-xs text-slate-400 capitalize">{userRole}</p>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', userMenuOpen && 'rotate-180')} />
              </button>

              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
                  <Link
                    href="/profile"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Company Logo */}
          <div className="px-4 py-3 border-t border-slate-700/50">
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/fintrak-logo.jpg"
                alt="FinTrak Software"
                width={35}
                height={12}
                className="opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
