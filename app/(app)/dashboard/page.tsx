'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { KPICard, HeroStatCard } from '@/components/kpi-card';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading-spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Droplets,
  Flame,
  Waves,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Gauge,
  Percent,
  Plus,
  ArrowRight,
  Calendar,
  Zap,
  Target,
  Clock,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const ProductionTrendChart = dynamic(() => import('./_components/production-trend-chart'), {
  ssr: false,
  loading: () => <div className="h-80 bg-gradient-to-r from-gray-100 to-gray-50 animate-pulse rounded-xl" />,
});

const TopWellsChart = dynamic(() => import('./_components/top-wells-chart'), {
  ssr: false,
  loading: () => <div className="h-80 bg-gradient-to-r from-gray-100 to-gray-50 animate-pulse rounded-xl" />,
});

const FieldDistributionChart = dynamic(() => import('./_components/field-distribution-chart'), {
  ssr: false,
  loading: () => <div className="h-80 bg-gradient-to-r from-gray-100 to-gray-50 animate-pulse rounded-xl" />,
});

const WellStatusChart = dynamic(() => import('./_components/well-status-chart'), {
  ssr: false,
  loading: () => <div className="h-80 bg-gradient-to-r from-gray-100 to-gray-50 animate-pulse rounded-xl" />,
});

const GORWaterCutChart = dynamic(() => import('./_components/gor-watercut-chart'), {
  ssr: false,
  loading: () => <div className="h-80 bg-gradient-to-r from-gray-100 to-gray-50 animate-pulse rounded-xl" />,
});

interface DashboardKPIs {
  totalOilMTD: number;
  totalOilYTD: number;
  totalGasMTD: number;
  totalGasYTD: number;
  totalWaterMTD: number;
  totalWaterYTD: number;
  activeWellsCount: number;
  avgGOR: number;
  avgWaterCut: number;
  avgEfficiency: number;
}

function getCurrentDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { data: session } = useSession() || {};
  const userName = session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'User';
  
  const { data: kpisData, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/kpis');
      const data = await res.json();
      return data?.data as DashboardKPIs;
    },
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/trends?days=30');
      const data = await res.json();
      return data?.data;
    },
  });

  if (kpisLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 p-8 text-white shadow-2xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-purple-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        </div>
        
        {/* Content */}
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-blue-300">
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">{getCurrentDate()}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">
              {getGreeting()}, {userName}! 👋
            </h1>
            <p className="text-blue-200 max-w-xl">
              Welcome to your production dashboard. Here&apos;s an overview of your hydrocarbon operations and key performance metrics.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Link href="/production/new">
              <Button className="bg-white text-slate-900 hover:bg-blue-50 shadow-lg gap-2">
                <Plus className="h-4 w-4" />
                New Production Entry
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:border-white shadow-lg gap-2">
                <BarChart3 className="h-4 w-4" />
                View Reports
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
          <div className="text-center">
            <p className="text-3xl font-bold">{kpisData?.activeWellsCount ?? 0}</p>
            <p className="text-sm text-blue-300 mt-1">Active Wells</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{(kpisData?.avgEfficiency ?? 0).toFixed(1)}%</p>
            <p className="text-sm text-blue-300 mt-1">Avg Efficiency</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{(kpisData?.avgGOR ?? 0).toFixed(2)}</p>
            <p className="text-sm text-blue-300 mt-1">Avg GOR (Mcf/bbl)</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{(kpisData?.avgWaterCut ?? 0).toFixed(1)}%</p>
            <p className="text-sm text-blue-300 mt-1">Avg Water Cut</p>
          </div>
        </div>
      </div>

      {/* Hero Production Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <HeroStatCard
          title="Total Oil Production (MTD)"
          value={kpisData?.totalOilMTD ?? 0}
          unit="bbl"
          icon={Droplets}
          description="Crude oil produced this month across all wells"
          colorClass="from-amber-500 to-orange-600"
        />
        <HeroStatCard
          title="Total Gas Production (MTD)"
          value={kpisData?.totalGasMTD ?? 0}
          unit="Mcf"
          icon={Flame}
          description="Natural gas produced this month"
          colorClass="from-red-500 to-rose-600"
        />
        <HeroStatCard
          title="Total Water Production (MTD)"
          value={kpisData?.totalWaterMTD ?? 0}
          unit="bbl"
          icon={Waves}
          description="Water produced this month"
          colorClass="from-blue-500 to-cyan-600"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Active Wells"
          value={kpisData?.activeWellsCount ?? 0}
          icon={Activity}
          subtitle="Currently producing wells"
          colorClass="from-emerald-500 to-green-600"
          delay={100}
        />
        <KPICard
          title="Average GOR"
          value={kpisData?.avgGOR ?? 0}
          unit="Mcf/bbl"
          icon={TrendingUp}
          subtitle="Gas-Oil Ratio"
          colorClass="from-violet-500 to-purple-600"
          delay={200}
        />
        <KPICard
          title="Water Cut"
          value={kpisData?.avgWaterCut ?? 0}
          unit="%"
          icon={Percent}
          subtitle="Average water percentage"
          colorClass="from-pink-500 to-rose-600"
          delay={300}
        />
        <KPICard
          title="Production Efficiency"
          value={kpisData?.avgEfficiency ?? 0}
          unit="%"
          icon={Gauge}
          subtitle="Operating hours ratio"
          colorClass="from-indigo-500 to-blue-600"
          delay={400}
        />
      </div>

      {/* YTD Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Oil YTD</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  {((kpisData?.totalOilYTD ?? 0) / 1000).toFixed(1)}K bbl
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Droplets className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Gas YTD</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {((kpisData?.totalGasYTD ?? 0) / 1000).toFixed(1)}K Mcf
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                <Flame className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Water YTD</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {((kpisData?.totalWaterYTD ?? 0) / 1000).toFixed(1)}K bbl
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Waves className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Production Trend</p>
                <p className="text-sm font-normal text-gray-500">Last 30 days</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ProductionTrendChart data={trendsData?.dailyTrend ?? []} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Top Producing Wells</p>
                <p className="text-sm font-normal text-gray-500">By total oil volume</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <TopWellsChart data={trendsData?.topWells ?? []} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Production by Field</p>
                <p className="text-sm font-normal text-gray-500">Oil distribution</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <FieldDistributionChart data={trendsData?.byField ?? []} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Well Status</p>
                <p className="text-sm font-normal text-gray-500">Distribution overview</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <WellStatusChart data={trendsData?.wellStatus ?? []} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Gauge className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">GOR & Water Cut Trends</p>
                <p className="text-sm font-normal text-gray-500">Performance metrics over time</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <GORWaterCutChart data={trendsData?.gorTrend ?? []} />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Footer */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white border-0 shadow-xl">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Quick Actions</p>
                <p className="text-sm text-slate-400">Common tasks and shortcuts</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/production/new">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <Plus className="h-4 w-4" /> Add Production
                </Button>
              </Link>
              <Link href="/wells">
                <Button size="sm" variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:border-white gap-2">
                  Manage Wells <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/reports">
                <Button size="sm" variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:border-white gap-2">
                  Generate Report <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
