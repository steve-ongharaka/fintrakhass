'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { TableSkeleton } from '@/components/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileInput,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Upload,
  FileDown,
  Calendar,
  Droplets,
  Flame,
  Waves,
  Filter,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useUserRole } from '@/hooks/use-user-role';

interface ProductionEntry {
  id: string;
  productionDate: string;
  wellId: string;
  well: {
    wellName: string;
    wellId: string;
    field: string | null;
    facility: { facilityName: string } | null;
  };
  grossOilVolume: number | null;
  grossGasVolume: number | null;
  grossWaterVolume: number | null;
  operatingHours: number | null;
  sandWaterPercentage: number | null;
  productionStd: {
    netOilVolume: number | null;
    gor: number | null;
    waterCut: number | null;
    productionEfficiency: number | null;
  } | null;
}

interface Well {
  id: string;
  wellName: string;
  wellId: string;
}

export default function ProductionPage() {
  const router = useRouter();
  const { userRole, canEdit } = useUserRole();
  
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [wellFilter, setWellFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: productionData, isLoading } = useQuery({
    queryKey: ['production', page, pageSize, wellFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (wellFilter !== 'all') params.set('wellId', wellFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      
      const res = await fetch(`/api/production?${params}`);
      return res.json();
    },
  });

  const { data: wellsData } = useQuery({
    queryKey: ['wells-all'],
    queryFn: async () => {
      const res = await fetch('/api/wells?pageSize=1000');
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/production/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to delete');
      return result;
    },
    onSuccess: () => {
      toast.success('Entry deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['production'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const exportToCSV = () => {
    const entries = productionData?.data ?? [];
    if (entries.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Date',
      'Well Name',
      'Well ID',
      'Field',
      'Gross Oil (bbl)',
      'Gross Gas (Mcf)',
      'Gross Water (bbl)',
      'S&W %',
      'Net Oil (bbl)',
      'GOR',
      'Water Cut %',
      'Operating Hours',
      'Efficiency %',
    ];

    const rows = entries.map((entry: ProductionEntry) => [
      entry.productionDate?.split?.('T')?.[0] ?? '',
      entry.well?.wellName ?? '',
      entry.well?.wellId ?? '',
      entry.well?.field ?? '',
      entry.grossOilVolume ?? '',
      entry.grossGasVolume ?? '',
      entry.grossWaterVolume ?? '',
      entry.sandWaterPercentage ?? '',
      entry.productionStd?.netOilVolume ?? '',
      entry.productionStd?.gor ?? '',
      entry.productionStd?.waterCut ?? '',
      entry.operatingHours ?? '',
      entry.productionStd?.productionEfficiency ?? '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  const exportToExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (wellFilter !== 'all') params.set('wellId', wellFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/export/production?${params}`);
      if (!response.ok) throw new Error('Failed to export data');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `production_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Data exported to Excel successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/export/template/production');
      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'production_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Template downloaded successfully');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      toast.loading('Importing data...', { id: 'import' });
      const response = await fetch('/api/import/production', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import data');
      }

      toast.success(
        `Import completed: ${result.recordsSuccessful} successful, ${result.recordsFailed} failed`,
        { id: 'import', duration: 5000 }
      );

      if (result.errors && result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }

      queryClient.invalidateQueries({ queryKey: ['production'] });
      
      // Reset the file input
      e.target.value = '';
    } catch (error: any) {
      toast.error(error.message || 'Failed to import data', { id: 'import' });
    }
  };

  const entries = productionData?.data ?? [];
  const totalPages = productionData?.totalPages ?? 1;
  const total = productionData?.total ?? 0;
  const wells: Well[] = wellsData?.data ?? [];

  // Calculate summary stats
  const totalOil = entries.reduce((sum: number, e: ProductionEntry) => sum + (e.grossOilVolume || 0), 0);
  const totalGas = entries.reduce((sum: number, e: ProductionEntry) => sum + (e.grossGasVolume || 0), 0);
  const totalWater = entries.reduce((sum: number, e: ProductionEntry) => sum + (e.grossWaterVolume || 0), 0);

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Data"
        description="View and manage daily production entries"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadTemplate} className="gap-2 bg-white">
              <FileDown className="h-4 w-4" />
              Template
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()} className="gap-2 bg-white">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
                <input
                  id="import-file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImport}
                  className="hidden"
                />
              </>
            )}
            <Button variant="outline" onClick={exportToExcel} className="gap-2 bg-white">
              <Download className="h-4 w-4" />
              Export
            </Button>
            {canEdit && (
              <Button onClick={() => router.push('/production/new')} className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg">
                <Plus className="h-4 w-4" />
                New Entry
              </Button>
            )}
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{total.toLocaleString()}</p>
                <p className="text-xs text-green-600">Total Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Droplets className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">{totalOil.toLocaleString()}</p>
                <p className="text-xs text-amber-600">Oil (bbl) - Page</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <Flame className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-900">{totalGas.toLocaleString()}</p>
                <p className="text-xs text-red-600">Gas (Mcf) - Page</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Waves className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{totalWater.toLocaleString()}</p>
                <p className="text-xs text-blue-600">Water (bbl) - Page</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Well</label>
              <Select value={wellFilter} onValueChange={(v) => { setWellFilter(v); setPage(1); }}>
                <SelectTrigger className="bg-gray-50 focus:bg-white">
                  <SelectValue placeholder="Filter by well" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wells</SelectItem>
                  {wells.map((well) => (
                    <SelectItem key={well.id} value={well.id}>
                      {well.wellName} ({well.wellId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 items-end">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    className="pl-10 w-44 bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    className="pl-10 w-44 bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>
              {(startDate || endDate || wellFilter !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setWellFilter('all');
                    setPage(1);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={10} />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={FileInput}
            title="No production data found"
            description="Start recording daily production entries."
            action={canEdit && (
              <Button onClick={() => router.push('/production/new')} className="gap-2">
                <Plus className="h-4 w-4" />New Entry
              </Button>
            )}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                    <TableHead className="font-semibold text-gray-700">Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Well</TableHead>
                    <TableHead className="font-semibold text-gray-700">Field</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Gross Oil</TableHead>
                    <TableHead className="text-right font-semibold text-amber-700">Net Oil</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Gas</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Water</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">GOR</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Water Cut</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Hrs</TableHead>
                    {canEdit && <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry: ProductionEntry, index: number) => (
                    <TableRow 
                      key={entry.id}
                      className={`transition-colors hover:bg-blue-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <TableCell className="font-medium text-gray-900">
                        {new Date(entry.productionDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{entry.well?.wellName}</p>
                          <p className="text-xs text-gray-500">{entry.well?.wellId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{entry.well?.field ?? '-'}</TableCell>
                      <TableCell className="text-right tabular-nums text-gray-700">
                        {entry.grossOilVolume?.toLocaleString() ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-amber-600">
                        {entry.productionStd?.netOilVolume?.toLocaleString() ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-700">
                        {entry.grossGasVolume?.toLocaleString() ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-700">
                        {entry.grossWaterVolume?.toLocaleString() ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-sm">
                          {entry.productionStd?.gor?.toFixed(2) ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-sm">
                          {entry.productionStd?.waterCut?.toFixed(1) ?? '-'}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-700">
                        {entry.operatingHours ?? '-'}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/production/${entry.id}`)}
                              className="hover:bg-green-50"
                            >
                              <Edit className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Delete this entry?')) {
                                  deleteMutation.mutate(entry.id);
                                }
                              }}
                              className="hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-gray-50/50">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{startIndex}</span> to{' '}
                  <span className="font-semibold">{endIndex}</span> of{' '}
                  <span className="font-semibold">{total}</span> entries
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Show</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => { setPageSize(Number(val)); setPage(1); }}
                  >
                    <SelectTrigger className="w-20 h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="hidden sm:flex"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Previous</span>
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 p-0 ${page === pageNum ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="hidden sm:flex"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
