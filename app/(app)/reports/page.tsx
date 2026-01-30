'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserRole } from '@/hooks/use-user-role';
import {
  FileText,
  Download,
  Filter,
  Save,
  Trash2,
  Calendar,
  BarChart3,
  TrendingDown,
  Building2,
  FileSpreadsheet,
  Loader2,
  Upload,
  FileUp,
  Gauge,
  Container,
  FileCheck,
  Scale,
  Ship,
  ClipboardList,
  AlertTriangle,
  Droplet,
  History,
  TestTube2,
  Factory,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { toast } from 'react-hot-toast';

const reportTypeOptions = [
  { value: 'production_summary', label: 'Production Summary', icon: BarChart3 },
  { value: 'well_test_report', label: 'Well Test Report', icon: TestTube2 },
  { value: 'well_performance', label: 'Well Performance', icon: TrendingDown },
  { value: 'facilities_report', label: 'Facilities Report', icon: Factory },
  { value: 'field_analysis', label: 'Field Analysis', icon: Building2 },
  { value: 'allocation_report', label: 'Allocation Report', icon: FileSpreadsheet },
  { value: 'decline_curve', label: 'Decline Curve Analysis', icon: TrendingDown },
  { value: 'metering_report', label: 'Metering Report', icon: Gauge },
  { value: 'tank_inventory_report', label: 'Tank/Inventory Report', icon: Container },
  { value: 'custody_transfer_report', label: 'Custody Transfer Report', icon: FileCheck },
  { value: 'reconciliation_report', label: 'Reconciliation Report', icon: Scale },
  { value: 'nominations_lifting_report', label: 'Nominations & Lifting', icon: Ship },
  { value: 'regulatory_report', label: 'Regulatory Compliance', icon: ClipboardList },
  { value: 'loss_accounting_report', label: 'Loss Accounting', icon: AlertTriangle },
  { value: 'injection_wells_report', label: 'Injection Wells', icon: Droplet },
  { value: 'audit_trail_report', label: 'Audit Trail', icon: History },
];

export default function ReportsPage() {
  const { userRole, canEdit } = useUserRole();
  const queryClient = useQueryClient();

  const [reportType, setReportType] = useState<string>('production_summary');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [wellId, setWellId] = useState<string>('');
  const [field, setField] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState<string>('');
  const [templateDescription, setTemplateDescription] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['reportTemplates'],
    queryFn: async () => {
      const res = await fetch('/api/reports/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  // Fetch wells for filter
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

  // Generate report mutation
  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          startDate,
          endDate,
          wellId,
          field,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate report');
      const data = await res.json();
      setReportData(data);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download PDF mutation
  const downloadPDF = async () => {
    if (!reportData) return;

    try {
      toast.loading('Generating PDF...', { id: 'pdf-generation' });
      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportData,
          reportType,
          title: reportTypeOptions.find(r => r.value === reportType)?.label,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully', { id: 'pdf-generation' });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF', { id: 'pdf-generation' });
    }
  };

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reports/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          reportType,
          filters: JSON.stringify({ startDate, endDate, wellId, field }),
        }),
      });
      if (!res.ok) throw new Error('Failed to save template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
      toast.success('Template saved successfully');
      setIsSaveDialogOpen(false);
      setTemplateName('');
      setTemplateDescription('');
    },
    onError: () => {
      toast.error('Failed to save template');
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reports/templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete template');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
      toast.success('Template deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  // Load template
  const loadTemplate = (template: any) => {
    setReportType(template.reportType);
    if (template.filters) {
      try {
        const filters = JSON.parse(template.filters);
        setStartDate(filters.startDate || '');
        setEndDate(filters.endDate || '');
        setWellId(filters.wellId || '');
        setField(filters.field || '');
      } catch (e) {
        console.error('Error parsing filters:', e);
      }
    }
    toast.success(`Loaded template: ${template.name}`);
  };

  // Upload template from file
  const handleTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (CSV or Excel)
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast.error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    try {
      // Use xlsx library to parse the file
      const XLSX = (await import('xlsx')).default;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length < 2) {
        toast.error('Template file must contain at least a header row and one data row');
        return;
      }

      // Parse headers and data
      const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim());
      const dataRow = jsonData[1];
      
      // Map headers to data
      const templateData: any = {};
      headers.forEach((header: string, index: number) => {
        if (dataRow[index] !== undefined && dataRow[index] !== null && dataRow[index] !== '') {
          templateData[header] = dataRow[index];
        }
      });

      // Validate required fields
      if (!templateData.name || !templateData.reporttype) {
        toast.error('Invalid template format. Required columns: name, reportType');
        return;
      }

      // Normalize reportType (handle case variations)
      const reportType = String(templateData.reporttype).toLowerCase().trim();
      
      // Validate reportType
      const validReportTypes = reportTypeOptions.map(r => r.value);
      if (!validReportTypes.includes(reportType)) {
        toast.error(`Invalid report type. Must be one of: ${validReportTypes.join(', ')}`);
        return;
      }

      // Build filters object from columns
      const filters: any = {};
      if (templateData.startdate) filters.startDate = String(templateData.startdate);
      if (templateData.enddate) filters.endDate = String(templateData.enddate);
      if (templateData.wellid) filters.wellId = String(templateData.wellid);
      if (templateData.field) filters.field = String(templateData.field);
      if (templateData.facilityid) filters.facilityId = String(templateData.facilityid);

      // Save the uploaded template to the database
      const res = await fetch('/api/reports/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(templateData.name),
          description: templateData.description ? String(templateData.description) : '',
          reportType: reportType,
          filters: JSON.stringify(filters),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload template');
      }

      // Refresh templates list
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
      toast.success(`Template "${templateData.name}" uploaded successfully`);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading template:', error);
      toast.error(error.message || 'Failed to upload template. Please check the file format.');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Export template as CSV
  const exportTemplate = async (template: any) => {
    try {
      // Parse filters
      let filters: any = {};
      try {
        filters = JSON.parse(template.filters || '{}');
      } catch (e) {
        console.error('Error parsing filters:', e);
      }

      // Prepare data for CSV
      const csvData = [
        // Header row
        ['name', 'description', 'reportType', 'startDate', 'endDate', 'wellId', 'field', 'facilityId'],
        // Data row
        [
          template.name || '',
          template.description || '',
          template.reportType || '',
          filters.startDate || '',
          filters.endDate || '',
          filters.wellId || '',
          filters.field || '',
          filters.facilityId || '',
        ]
      ];

      // Use xlsx library to create CSV
      const XLSX = (await import('xlsx')).default;
      const worksheet = XLSX.utils.aoa_to_sheet(csvData);
      const csvString = XLSX.utils.sheet_to_csv(worksheet);

      // Create blob and download
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/\s+/g, '_').toLowerCase()}_template.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Template exported successfully as CSV');
    } catch (error: any) {
      console.error('Error exporting template:', error);
      toast.error('Failed to export template');
    }
  };

  const templateColumns = [
    {
      key: 'name',
      header: 'Template Name',
      sortable: true,
    },
    {
      key: 'reportType',
      header: 'Report Type',
      render: (row: any) => {
        const type = reportTypeOptions.find(r => r.value === row.reportType);
        return type?.label || row.reportType;
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: any) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Generate custom reports and analyze production data"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Builder */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-2 border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Report Builder</h3>
                <p className="text-sm text-muted-foreground">
                  Configure filters and generate custom reports • Click "Generate Report" when ready
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Report Type */}
              <div>
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypeOptions.map(option => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Well Filter */}
              <div>
                <Label htmlFor="wellId">Well (Optional)</Label>
                <Select value={wellId || 'all'} onValueChange={(value) => setWellId(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Wells" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Wells</SelectItem>
                    {wells.map((well: any) => (
                      <SelectItem key={well.id} value={well.id}>
                        {well.wellName} ({well.wellId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field Filter */}
              {reportType === 'field_analysis' && (
                <div>
                  <Label htmlFor="field">Field (Optional)</Label>
                  <Input
                    id="field"
                    placeholder="Enter field name"
                    value={field}
                    onChange={e => setField(e.target.value)}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={generateReport}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
                {(userRole === 'admin' || userRole === 'operator') && (
                  <Button
                    variant="outline"
                    onClick={() => setIsSaveDialogOpen(true)}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Template
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Report Results */}
          {reportData && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Report Results</h3>
                    <p className="text-sm text-muted-foreground">
                      {reportTypeOptions.find(r => r.value === reportType)?.label}
                    </p>
                  </div>
                </div>
                <Button onClick={downloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              {/* Summary Stats */}
              {reportData.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {Object.entries(reportData.summary).map(([key, value]) => (
                    <div key={key} className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-2xl font-bold">
                        {typeof value === 'number'
                          ? value.toLocaleString()
                          : String(value || '')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Data Preview */}
              <div className="text-sm text-muted-foreground">
                {reportData.data?.length || 0} records found
              </div>
            </Card>
          )}
        </div>

        {/* Saved Templates */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Saved Templates</h3>
                  <p className="text-sm text-muted-foreground">
                    {templates?.length || 0} templates
                  </p>
                </div>
              </div>
              {(userRole === 'admin' || userRole === 'operator') && (
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleTemplateUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload template from CSV or Excel file"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
              )}
            </div>

            {templatesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates && templates.length > 0 ? (
              <DataTable
                data={templates}
                columns={templateColumns}
                pageSize={10}
                onRowClick={loadTemplate}
                rowClassName={() => "cursor-pointer hover:bg-muted/50"}
                actions={(row: any) => (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportTemplate(row);
                      }}
                      title="Download template as JSON"
                    >
                      <Download className="w-4 h-4 text-blue-500" />
                    </Button>
                    {userRole === 'admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this template?')) {
                            deleteTemplateMutation.mutate(row.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                )}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No saved templates</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Save Template Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                placeholder="e.g., Monthly Production Summary"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="templateDescription">Description (Optional)</Label>
              <Textarea
                id="templateDescription"
                placeholder="Describe this template..."
                value={templateDescription}
                onChange={e => setTemplateDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsSaveDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveTemplateMutation.mutate()}
                disabled={!templateName || saveTemplateMutation.isPending}
                className="flex-1"
              >
                {saveTemplateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
