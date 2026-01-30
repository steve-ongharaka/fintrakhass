'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Download,
  FileText,
  HelpCircle,
  ExternalLink,
  Search,
  Users,
  Settings,
  TrendingUp,
  BarChart3,
  Activity,
  Droplet,
  CheckCircle2,
  AlertCircle,
  Info,
  Gauge,
  FlaskConical,
  PieChart,
  Building2,
  Package,
  Shield,
  ChevronRight,
  ArrowRight,
  ListChecks,
  Lightbulb,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ModuleHelp {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  overview: string;
  features: string[];
  howTo: {
    title: string;
    steps: string[];
  }[];
  tips: string[];
  permissions: string;
}

const moduleHelpData: ModuleHelp[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: TrendingUp,
    color: 'from-blue-500 to-indigo-600',
    overview: 'The Dashboard provides a comprehensive overview of your hydrocarbon operations with real-time KPIs, production trends, and visual analytics.',
    features: [
      'Real-time production KPIs (Oil, Gas, Water volumes)',
      'Month-to-Date (MTD) and Year-to-Date (YTD) summaries',
      'Interactive production trend charts',
      'Top performing wells visualization',
      'Field distribution analysis',
      'Well status overview',
      'GOR and Water Cut trend monitoring',
    ],
    howTo: [
      {
        title: 'View Production Summary',
        steps: [
          'Navigate to Dashboard from the sidebar',
          'View the KPI cards at the top for quick metrics',
          'Scroll down to see detailed charts and trends',
          'Use the date selectors to filter data by period',
        ],
      },
      {
        title: 'Analyze Production Trends',
        steps: [
          'Locate the Production Trend chart',
          'Hover over data points to see detailed values',
          'Compare oil, gas, and water production over time',
          'Identify patterns and anomalies in production',
        ],
      },
    ],
    tips: [
      'Check the dashboard daily for production anomalies',
      'Use the quick action buttons for common tasks',
      'Monitor GOR and water cut trends for well health indicators',
    ],
    permissions: 'All users (Admin, Operator, Viewer) can view the dashboard.',
  },
  {
    id: 'wells',
    title: 'Wells Management',
    icon: Droplet,
    color: 'from-green-500 to-emerald-600',
    overview: 'Manage all well information including creation, editing, status tracking, and well details. This is the central repository for all well data.',
    features: [
      'Complete well inventory management',
      'Well status tracking (Active, Inactive, Shut-in)',
      'Well type classification (Oil, Gas, Water Injection, Gas Injection)',
      'Facility association',
      'GPS coordinates storage',
      'Spud and completion date tracking',
    ],
    howTo: [
      {
        title: 'Add a New Well',
        steps: [
          'Click the "Add Well" button in the top right',
          'Fill in the well name and well ID (unique identifier)',
          'Select the field and associated facility',
          'Choose the well type and status',
          'Enter optional coordinates and dates',
          'Click "Create Well" to save',
        ],
      },
      {
        title: 'Edit Well Information',
        steps: [
          'Find the well in the table using search or scroll',
          'Click the edit (pencil) icon in the Actions column',
          'Modify the desired fields',
          'Click "Update Well" to save changes',
        ],
      },
      {
        title: 'Change Well Status',
        steps: [
          'Click the edit icon for the target well',
          'Change the Status dropdown (Active/Inactive/Shut-in)',
          'Save the changes',
          'The status badge will update automatically',
        ],
      },
    ],
    tips: [
      'Use consistent naming conventions for well IDs',
      'Always associate wells with the correct facility',
      'Keep well coordinates accurate for field mapping',
      'Update well status promptly when changes occur',
    ],
    permissions: 'Admin and Operator can add/edit wells. Viewer has read-only access.',
  },
  {
    id: 'facilities',
    title: 'Facilities Management',
    icon: Building2,
    color: 'from-amber-500 to-orange-600',
    overview: 'Manage production, processing, and storage facilities. Track facility details, capacities, and operational status.',
    features: [
      'Facility type management (Production, Processing, Storage)',
      'Capacity tracking',
      'Operator assignment',
      'Location and field association',
      'Facility status monitoring',
    ],
    howTo: [
      {
        title: 'Add a New Facility',
        steps: [
          'Click "Add Facility" button',
          'Enter facility name and unique ID',
          'Select facility type (Production/Processing/Storage)',
          'Fill in operator, location, and capacity',
          'Set the operational status',
          'Click "Create Facility" to save',
        ],
      },
      {
        title: 'Update Facility Capacity',
        steps: [
          'Find the facility in the table',
          'Click the edit icon',
          'Update the capacity field',
          'Save changes',
        ],
      },
    ],
    tips: [
      'Keep facility capacities updated for accurate planning',
      'Associate all wells with their respective facilities',
      'Track facility status for maintenance planning',
    ],
    permissions: 'Admin and Operator can manage facilities. Viewer has read-only access.',
  },
  {
    id: 'production',
    title: 'Production Data',
    icon: BarChart3,
    color: 'from-purple-500 to-pink-600',
    overview: 'Record, view, and manage daily production data. This module supports manual entry, bulk import, and data export functionality.',
    features: [
      'Daily production entry (Oil, Gas, Water volumes)',
      'Operating hours and choke size tracking',
      'Wellhead pressure and temperature recording',
      'Bulk import from Excel/CSV',
      'Data export functionality',
      'Production data filtering and search',
      'Historical data viewing',
    ],
    howTo: [
      {
        title: 'Add Production Entry',
        steps: [
          'Click "New Entry" button',
          'Select the well from the dropdown',
          'Choose the production date',
          'Enter oil volume (bbl), gas volume (Mscf), water volume (bbl)',
          'Fill in optional fields (choke, pressure, temperature)',
          'Click "Save" to record the entry',
        ],
      },
      {
        title: 'Import Production Data from Excel',
        steps: [
          'Click "Template" to download the import template',
          'Open the template in Excel',
          'Fill in production data following the template format',
          'Save the file as .xlsx or .csv',
          'Click "Import" and select your file',
          'Review the imported data and confirm',
        ],
      },
      {
        title: 'Export Production Data',
        steps: [
          'Apply any filters for the data you want to export',
          'Click the "Export" button',
          'Select the export format (Excel/CSV)',
          'The file will download automatically',
        ],
      },
    ],
    tips: [
      'Enter production data daily for accurate tracking',
      'Use bulk import for historical data migration',
      'Always verify imported data before saving',
      'Use filters to quickly find specific entries',
    ],
    permissions: 'Admin and Operator can add/edit production data. Viewer has read-only access.',
  },
  {
    id: 'well-tests',
    title: 'Well Tests',
    icon: FlaskConical,
    color: 'from-cyan-500 to-teal-600',
    overview: 'Record and analyze well test data used for production allocation. Track oil, gas, and water rates from periodic well tests.',
    features: [
      'Well test data recording',
      'Test type classification (Routine, Extended, Special)',
      'Automatic GOR and Water Cut calculation',
      'Test duration tracking',
      'Rate measurements (Oil, Gas, Water)',
      'Comments and notes storage',
    ],
    howTo: [
      {
        title: 'Record a Well Test',
        steps: [
          'Click "New Test" button',
          'Select the well being tested',
          'Choose the test date and type',
          'Enter the test duration in hours',
          'Input measured rates: Oil (bbl/d), Gas (Mscf/d), Water (bbl/d)',
          'GOR and Water Cut will calculate automatically',
          'Add any relevant comments',
          'Click "Save Test" to record',
        ],
      },
      {
        title: 'View Test History',
        steps: [
          'Use the well filter to select a specific well',
          'Filter by test type if needed',
          'View historical tests in the table',
          'Click on a test to see full details',
        ],
      },
    ],
    tips: [
      'Conduct regular well tests for accurate allocation',
      'Record tests immediately after completion',
      'Note any unusual conditions in comments',
      'Review calculated GOR for reasonableness',
    ],
    permissions: 'Admin and Operator can record tests. Viewer has read-only access.',
  },
  {
    id: 'allocations',
    title: 'Production Allocations',
    icon: PieChart,
    color: 'from-rose-500 to-red-600',
    overview: 'Allocate commingled production volumes to individual wells using test-based, pro-rata, or manual allocation methods.',
    features: [
      'Test-based allocation using latest well test data',
      'Pro-rata allocation based on equal distribution',
      'Manual allocation with custom factors',
      'Multi-well allocation support',
      'Allocation history tracking',
      'Allocation factor adjustment',
    ],
    howTo: [
      {
        title: 'Create Test-Based Allocation',
        steps: [
          'Click "New Allocation" button',
          'Enter the total commingled production volumes',
          'Select "Test-Based" as the allocation method',
          'Select the wells to include in allocation',
          'System will fetch latest test rates for each well',
          'Review calculated allocation factors',
          'Click "Calculate" to see allocated volumes',
          'Save the allocation',
        ],
      },
      {
        title: 'Manual Allocation',
        steps: [
          'Create new allocation',
          'Select "Manual" method',
          'Enter custom allocation factors for each well',
          'Factors should sum to 1.0 (or 100%)',
          'Calculate and review results',
          'Save the allocation',
        ],
      },
    ],
    tips: [
      'Keep well tests current for accurate test-based allocation',
      'Verify allocation factors sum to 100%',
      'Review allocations for reasonableness before saving',
      'Document any manual adjustments',
    ],
    permissions: 'Admin and Operator can create allocations. Admin only can delete.',
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    icon: FileText,
    color: 'from-orange-500 to-red-600',
    overview: 'Generate custom reports, save report templates, and export data in PDF format. Supports production summaries, well performance, and field analysis reports.',
    features: [
      'Multiple report types (Production Summary, Well Performance, Field Analysis)',
      'Custom date range filtering',
      'Well and facility filters',
      'PDF report generation',
      'Report template saving',
      'Template import/export (CSV/Excel)',
      'Charts and data tables in reports',
    ],
    howTo: [
      {
        title: 'Generate a Production Report',
        steps: [
          'Select "Production Summary" as report type',
          'Choose the date range (start and end dates)',
          'Optionally filter by well or facility',
          'Check "Include Charts" and "Include Data Table" as needed',
          'Click "Generate Report"',
          'Review the report preview',
          'Click "Download PDF" to export',
        ],
      },
      {
        title: 'Save a Report Template',
        steps: [
          'Configure your report filters',
          'Enter a template name in the "Save Configuration" section',
          'Click "Save Template"',
          'The template appears in "Saved Templates"',
          'Click on a template to quickly load those settings',
        ],
      },
      {
        title: 'Import/Export Templates',
        steps: [
          'To export: Click "Download" icon next to a template',
          'Template downloads as CSV file',
          'To import: Click "Upload" button',
          'Select your CSV or Excel template file',
          'Template is added to your saved templates',
        ],
      },
    ],
    tips: [
      'Save frequently used filter combinations as templates',
      'Include charts for executive summaries',
      'Use data tables for detailed analysis',
      'Share templates with team via export/import',
    ],
    permissions: 'All users can view and generate reports. Admin/Operator can save templates.',
  },
  {
    id: 'monitoring',
    title: 'Performance Monitoring',
    icon: Activity,
    color: 'from-cyan-500 to-blue-600',
    overview: 'Monitor well performance, track alerts, and log downtime events. Get real-time visibility into well health and operational issues.',
    features: [
      'Real-time well alerts (Low Production, High Water Cut, etc.)',
      'Alert severity levels (Info, Warning, Critical)',
      'Alert acknowledgment and resolution workflow',
      'Downtime logging and tracking',
      'Performance metrics visualization',
      'Efficiency and uptime monitoring',
    ],
    howTo: [
      {
        title: 'View and Manage Alerts',
        steps: [
          'Navigate to Performance Monitoring',
          'View active alerts in the alerts table',
          'Filter by well or status if needed',
          'Click "Acknowledge" to mark an alert as seen',
          'Click "Resolve" once the issue is fixed',
          'Add comments when resolving alerts',
        ],
      },
      {
        title: 'Record Downtime',
        steps: [
          'Click "Record Downtime" button',
          'Select the affected well',
          'Enter start time and end time',
          'Select the downtime reason',
          'Add description and impact assessment',
          'Click "Save" to record the downtime event',
        ],
      },
      {
        title: 'Monitor Performance Metrics',
        steps: [
          'View the KPI cards for summary statistics',
          'Check total downtime hours',
          'Monitor average efficiency across wells',
          'Review critical alerts count',
        ],
      },
    ],
    tips: [
      'Acknowledge alerts promptly to track response times',
      'Always document the resolution when closing alerts',
      'Record all downtime events for accurate uptime tracking',
      'Monitor critical alerts dashboard daily',
    ],
    permissions: 'Admin and Operator can manage alerts and downtime. Viewer has read-only access.',
  },
  {
    id: 'products',
    title: 'Products Configuration',
    icon: Package,
    color: 'from-violet-500 to-purple-600',
    overview: 'Define and configure hydrocarbon product specifications including units, densities, and standard conditions.',
    features: [
      'Product definition (Crude Oil, Natural Gas, Produced Water, etc.)',
      'Unit of measurement configuration',
      'Standard temperature and pressure settings',
      'Density and API gravity storage',
      'Product code management',
    ],
    howTo: [
      {
        title: 'Add a New Product',
        steps: [
          'Click "Add Product" button',
          'Enter product name and unique code',
          'Select the unit of measurement',
          'Set standard temperature and pressure',
          'Enter density and API gravity values',
          'Click "Create Product" to save',
        ],
      },
    ],
    tips: [
      'Use industry-standard product codes',
      'Ensure density values are accurate for calculations',
      'Keep API gravity updated for crude oil products',
    ],
    permissions: 'Admin only can modify product configurations.',
  },
  {
    id: 'settings',
    title: 'System Settings',
    icon: Settings,
    color: 'from-gray-500 to-slate-600',
    overview: 'Configure system-wide settings including correction factors (BSW, shrinkage, temperature, pressure) used in calculations.',
    features: [
      'BSW (Basic Sediment & Water) correction factors',
      'Shrinkage factor configuration',
      'Temperature correction settings',
      'Pressure correction factors',
      'Meter factor adjustments',
    ],
    howTo: [
      {
        title: 'Configure Correction Factors',
        steps: [
          'Navigate to Settings',
          'Locate the correction factor section',
          'Click "Add Factor" or edit existing',
          'Select the factor type',
          'Enter the factor value',
          'Associate with well or facility if applicable',
          'Set effective date range',
          'Save the configuration',
        ],
      },
    ],
    tips: [
      'Review correction factors periodically',
      'Document reasons for factor changes',
      'Keep historical factors for audit trails',
    ],
    permissions: 'Admin only can modify system settings.',
  },
  {
    id: 'users',
    title: 'User Management',
    icon: Users,
    color: 'from-emerald-500 to-green-600',
    overview: 'Manage user accounts, roles, and permissions. Create new users and assign appropriate access levels.',
    features: [
      'User account creation',
      'Role assignment (Admin, Operator, Viewer)',
      'Password management',
      'Role-based access control',
      'User activity tracking',
    ],
    howTo: [
      {
        title: 'Create a New User',
        steps: [
          'Click "Create New User" button',
          'Enter user email address',
          'Set a temporary password',
          'Assign a role (Admin, Operator, or Viewer)',
          'Click "Create User"',
          'Share credentials securely with the new user',
        ],
      },
      {
        title: 'Change User Role',
        steps: [
          'Find the user in the table',
          'Click the edit icon',
          'Select the new role from dropdown',
          'Save changes',
        ],
      },
    ],
    tips: [
      'Follow least-privilege principle for role assignment',
      'Regularly review user access',
      'Deactivate accounts of departed employees promptly',
    ],
    permissions: 'Admin only can manage users.',
  },
  {
    id: 'meters',
    title: 'Metering & Calibration',
    icon: Gauge,
    color: 'from-sky-500 to-cyan-600',
    overview: 'Track and manage all measurement devices including flow meters, tank gauges, and custody transfer meters. Maintain calibration records and proving results.',
    features: [
      'Meter inventory management',
      'Meter readings recording',
      'Calibration scheduling and tracking',
      'Meter proving results',
      'Accuracy and drift monitoring',
    ],
    howTo: [
      {
        title: 'Add a New Meter',
        steps: [
          'Navigate to Meters module',
          'Click "Add Meter" button',
          'Enter meter name and serial number',
          'Select meter type and facility',
          'Enter accuracy and measurement range',
          'Save the meter',
        ],
      },
      {
        title: 'Record Calibration',
        steps: [
          'Go to Calibrations tab',
          'Click "Record Calibration"',
          'Select the meter and enter calibration date',
          'Record before/after values and meter factor',
          'Set next calibration due date',
          'Save calibration record',
        ],
      },
    ],
    tips: [
      'Schedule calibrations before due dates',
      'Track meter drift over time',
      'Document all proving results',
      'Maintain calibration certificates',
    ],
    permissions: 'Admin and Operator can manage meters. Viewer has read-only access.',
  },
  {
    id: 'tanks',
    title: 'Tank/Inventory Management',
    icon: Building2,
    color: 'from-amber-500 to-yellow-600',
    overview: 'Manage storage tanks, record gauging measurements, and track stock movements between facilities.',
    features: [
      'Tank inventory management',
      'Tank gauging records',
      'Stock movement tracking',
      'Inventory reconciliation',
      'Tank status monitoring',
    ],
    howTo: [
      {
        title: 'Record Tank Gauging',
        steps: [
          'Navigate to Tanks module',
          'Go to Gaugings tab',
          'Click "Record Gauging"',
          'Select tank and enter measurement date/time',
          'Input liquid level, temperature, API gravity',
          'System calculates volumes automatically',
          'Save the gauging record',
        ],
      },
      {
        title: 'Track Stock Movement',
        steps: [
          'Go to Movements tab',
          'Click "Record Movement"',
          'Select source and destination tanks',
          'Enter volume and movement type',
          'Add reference number',
          'Save the movement',
        ],
      },
    ],
    tips: [
      'Gauge tanks before and after transfers',
      'Reconcile inventory daily',
      'Document all adjustments',
      'Monitor tank temperature for accuracy',
    ],
    permissions: 'Admin and Operator can manage tanks. Viewer has read-only access.',
  },
  {
    id: 'custody-transfer',
    title: 'Custody Transfer',
    icon: FileText,
    color: 'from-indigo-500 to-blue-600',
    overview: 'Manage fiscal metering points and custody transfer transactions for sales and purchase accounting.',
    features: [
      'Fiscal metering point management',
      'Custody transfer recording',
      'Volume correction factors',
      'Transfer ticket generation',
      'Counterparty tracking',
    ],
    howTo: [
      {
        title: 'Record Custody Transfer',
        steps: [
          'Navigate to Custody Transfer module',
          'Go to Transfers tab',
          'Click "Record Transfer"',
          'Select fiscal metering point',
          'Enter transfer date and gross volume',
          'Input temperature, pressure, density',
          'System applies corrections automatically',
          'Review and save transfer',
        ],
      },
    ],
    tips: [
      'Verify meter factors before each transfer',
      'Reconcile with buyer/seller promptly',
      'Archive all correction factor documentation',
      'Review discrepancies within 24 hours',
    ],
    permissions: 'Admin and Operator can manage transfers. Viewer has read-only access.',
  },
  {
    id: 'reconciliation',
    title: 'Balance Reconciliation',
    icon: PieChart,
    color: 'from-teal-500 to-emerald-600',
    overview: 'Perform material balance reconciliation to identify and investigate volume discrepancies.',
    features: [
      'Period-based reconciliation',
      'Material balance calculations',
      'Imbalance tracking and categorization',
      'Investigation workflow',
      'Tolerance monitoring',
    ],
    howTo: [
      {
        title: 'Create Reconciliation',
        steps: [
          'Navigate to Reconciliation module',
          'Click "New Reconciliation"',
          'Select facility and date range',
          'Enter opening/closing inventory',
          'Input receipts and disposals',
          'System calculates imbalance',
          'Investigate and document any discrepancies',
          'Save reconciliation',
        ],
      },
    ],
    tips: [
      'Perform daily reconciliations for active facilities',
      'Investigate imbalances exceeding 0.5%',
      'Document all adjusting entries',
      'Maintain audit trail for adjustments',
    ],
    permissions: 'Admin and Operator can create reconciliations. Viewer has read-only access.',
  },
  {
    id: 'nominations',
    title: 'Nominations & Lifting',
    icon: Droplet,
    color: 'from-blue-500 to-indigo-600',
    overview: 'Manage cargo nominations, vessel schedules, and lifting operations for crude oil exports.',
    features: [
      'Lifting agreement management',
      'Cargo nomination workflow',
      'Lifting operations tracking',
      'Vessel and B/L documentation',
      'Volume variance tracking',
    ],
    howTo: [
      {
        title: 'Create Nomination',
        steps: [
          'Navigate to Nominations module',
          'Click "New Nomination"',
          'Select lifting agreement',
          'Enter nominated volume and loading period',
          'Specify vessel preference',
          'Submit nomination',
        ],
      },
      {
        title: 'Record Lifting',
        steps: [
          'Go to Liftings tab',
          'Click "Record Lifting"',
          'Link to nomination',
          'Enter vessel details and B/L information',
          'Record loaded volume and quality',
          'Save lifting record',
        ],
      },
    ],
    tips: [
      'Submit nominations within deadlines',
      'Verify vessel vetting before acceptance',
      'Reconcile B/L with shore tanks',
      'Track demurrage exposure',
    ],
    permissions: 'Admin and Operator can manage nominations. Viewer has read-only access.',
  },
  {
    id: 'regulatory',
    title: 'Regulatory Compliance',
    icon: Shield,
    color: 'from-red-500 to-rose-600',
    overview: 'Generate and submit regulatory reports required by DPR, NNPC, and environmental authorities.',
    features: [
      'Regulatory report templates',
      'Auto-population from operational data',
      'Submission workflow tracking',
      'Deadline management',
      'Compliance monitoring',
    ],
    howTo: [
      {
        title: 'Generate Regulatory Report',
        steps: [
          'Navigate to Regulatory module',
          'Click "New Report"',
          'Select report type (DPR, NNPC, etc.)',
          'Choose reporting period',
          'System auto-populates data',
          'Review and edit if needed',
          'Submit for approval',
        ],
      },
    ],
    tips: [
      'Generate draft reports early',
      'Verify data accuracy before submission',
      'Track submission deadlines',
      'Document agency correspondence',
    ],
    permissions: 'Admin and Operator can create reports. Viewer has read-only access.',
  },
  {
    id: 'losses',
    title: 'Loss Accounting',
    icon: Activity,
    color: 'from-orange-500 to-red-600',
    overview: 'Track and report hydrocarbon losses including flaring, venting, spillage, theft, and shrinkage.',
    features: [
      'Loss event recording',
      'Flaring volume tracking',
      'Shrinkage factor monitoring',
      'Severity classification',
      'Root cause analysis',
    ],
    howTo: [
      {
        title: 'Record Loss Event',
        steps: [
          'Navigate to Loss Accounting module',
          'Click "Record Event"',
          'Select loss type and severity',
          'Enter event date and location',
          'Input loss volume',
          'Add description and root cause',
          'Save event',
        ],
      },
      {
        title: 'Record Flaring',
        steps: [
          'Go to Flaring tab',
          'Click "Record Flaring"',
          'Select facility and date',
          'Enter flared volume',
          'Specify flaring reason',
          'Save record',
        ],
      },
    ],
    tips: [
      'Report all loss events within 24 hours',
      'Investigate high-severity events immediately',
      'Track root causes for recurring issues',
      'Monitor flaring against targets',
    ],
    permissions: 'Admin and Operator can manage loss records. Viewer has read-only access.',
  },
  {
    id: 'decline-analysis',
    title: 'Decline Curve Analysis',
    icon: TrendingUp,
    color: 'from-purple-500 to-violet-600',
    overview: 'Analyze well production decline and forecast future production using various decline models.',
    features: [
      'Exponential, hyperbolic, harmonic decline models',
      'EUR (Estimated Ultimate Recovery) calculation',
      'Remaining reserves estimation',
      'Production forecasting',
      'Scenario comparison',
    ],
    howTo: [
      {
        title: 'Create Decline Analysis',
        steps: [
          'Navigate to Decline Analysis module',
          'Click "New Analysis"',
          'Select well and analysis period',
          'Choose decline model type',
          'Enter initial rate and decline rate',
          'View calculated EUR and reserves',
          'Save analysis',
        ],
      },
      {
        title: 'Generate Production Forecast',
        steps: [
          'Go to Forecasts tab',
          'Click "New Forecast"',
          'Select well and analysis',
          'Define forecast period',
          'Choose scenario type',
          'Generate and review forecast',
        ],
      },
    ],
    tips: [
      'Use sufficient production history',
      'Validate model with actual data',
      'Update analyses monthly',
      'Document assumptions',
    ],
    permissions: 'Admin and Operator can create analyses. Viewer has read-only access.',
  },
  {
    id: 'injection-wells',
    title: 'Injection Wells',
    icon: Droplet,
    color: 'from-cyan-500 to-teal-600',
    overview: 'Manage injection well operations including water injection, gas injection, and enhanced oil recovery programs.',
    features: [
      'Injection well management',
      'Daily injection data recording',
      'Injectivity testing',
      'Cumulative injection tracking',
      'Pressure monitoring',
    ],
    howTo: [
      {
        title: 'Record Injection Data',
        steps: [
          'Navigate to Injection Wells module',
          'Go to Injection Data tab',
          'Click "Record Injection"',
          'Select injection well',
          'Enter date and injection volume',
          'Record wellhead pressure',
          'Add notes if needed',
          'Save data',
        ],
      },
      {
        title: 'Record Injectivity Test',
        steps: [
          'Go to Tests tab',
          'Click "Record Test"',
          'Select well and test date',
          'Enter test parameters',
          'Calculate injectivity index',
          'Save test results',
        ],
      },
    ],
    tips: [
      'Monitor injection rates vs targets',
      'Track pressure trends',
      'Perform regular injectivity tests',
      'Document water quality',
    ],
    permissions: 'Admin and Operator can manage injection wells. Viewer has read-only access.',
  },
  {
    id: 'audit-log',
    title: 'Audit Trail',
    icon: Activity,
    color: 'from-slate-500 to-gray-600',
    overview: 'Comprehensive logging of all system activities for compliance, security, and troubleshooting.',
    features: [
      'Complete activity logging',
      'User action tracking',
      'Change history (before/after values)',
      'Advanced filtering',
      'Export capability',
    ],
    howTo: [
      {
        title: 'View Audit Logs',
        steps: [
          'Navigate to Audit Log module',
          'Use filters to narrow results',
          'Filter by date range, user, or action',
          'Click on entry to see details',
          'View JSON diff for changes',
        ],
      },
      {
        title: 'Export Audit Data',
        steps: [
          'Apply desired filters',
          'Click "Export" button',
          'Select export format',
          'Download audit data file',
        ],
      },
    ],
    tips: [
      'Review logs regularly',
      'Investigate unusual patterns',
      'Archive per retention policy',
      'Use for troubleshooting',
    ],
    permissions: 'Admin only can view full audit logs.',
  },
];

export default function HelpPage() {
  const [downloading, setDownloading] = useState(false);
  const [activeModule, setActiveModule] = useState<string>('dashboard');

  const downloadManual = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/USER_MANUAL.pdf');
      if (!response.ok) throw new Error('Manual not found');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FinTrak_HASS_User_Manual.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('User manual downloaded successfully');
    } catch (error) {
      console.error('Error downloading manual:', error);
      toast.error('Failed to download user manual. Please contact support.');
    } finally {
      setDownloading(false);
    }
  };

  const selectedModule = moduleHelpData.find(m => m.id === activeModule) || moduleHelpData[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Documentation"
        description="Comprehensive guide to using FinTrak HASS - Click any module for detailed instructions"
      />

      {/* User Manual Download Section */}
      <Card className="border-2 border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Complete User Manual</CardTitle>
                <CardDescription className="text-xs">Download PDF for offline reference</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={downloadManual} disabled={downloading} size="sm">
                <Download className="w-4 h-4 mr-2" />
                {downloading ? 'Downloading...' : 'Download PDF'}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/USER_MANUAL.pdf" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View in Browser
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Interactive Module Help */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Module Selector Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" />
              Modules
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {moduleHelpData.map((module) => {
                const Icon = module.icon;
                const isActive = module.id === activeModule;
                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveModule(module.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className={`w-8 h-8 bg-gradient-to-br ${module.color} rounded-md flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                      {module.title}
                    </span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto text-blue-500" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Module Details */}
        <div className="lg:col-span-3 space-y-4">
          {/* Module Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${selectedModule.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <selectedModule.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{selectedModule.title}</CardTitle>
                  <CardDescription className="mt-1">{selectedModule.overview}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Module Content Tabs */}
          <Tabs defaultValue="howto" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="howto" className="text-xs sm:text-sm">
                <ListChecks className="w-4 h-4 mr-1 sm:mr-2" />
                How-To
              </TabsTrigger>
              <TabsTrigger value="features" className="text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 mr-1 sm:mr-2" />
                Features
              </TabsTrigger>
              <TabsTrigger value="tips" className="text-xs sm:text-sm">
                <Lightbulb className="w-4 h-4 mr-1 sm:mr-2" />
                Tips
              </TabsTrigger>
              <TabsTrigger value="access" className="text-xs sm:text-sm">
                <Shield className="w-4 h-4 mr-1 sm:mr-2" />
                Access
              </TabsTrigger>
            </TabsList>

            {/* How-To Tab */}
            <TabsContent value="howto" className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                {selectedModule.howTo.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                          {index + 1}
                        </div>
                        <span className="font-medium">{item.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-11 space-y-3">
                        {item.steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="flex items-start gap-3">
                            <ArrowRight className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{step}</span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedModule.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tips Tab */}
            <TabsContent value="tips">
              <Card>
                <CardContent className="pt-6 space-y-3">
                  {selectedModule.tips.map((tip, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <span className="text-sm">{tip}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Access Tab */}
            <TabsContent value="access">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Shield className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-700 dark:text-blue-300 mb-2">Permission Requirements</p>
                      <p className="text-sm text-muted-foreground">{selectedModule.permissions}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Role Definitions</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Admin</Badge>
                        <span className="text-sm">Full system access - can manage users, settings, and all data</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Operator</Badge>
                        <span className="text-sm">Can view and edit production data, tests, and allocations</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Viewer</Badge>
                        <span className="text-sm">Read-only access to all features and reports</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Quick Navigate */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ready to use this feature?</span>
                <Button asChild>
                  <a href={`/${selectedModule.id === 'dashboard' ? 'dashboard' : selectedModule.id}`}>
                    Go to {selectedModule.title}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="faq-1">
              <AccordionTrigger>How do I reset my password?</AccordionTrigger>
              <AccordionContent>
                Contact your system administrator to reset your password. They can update your credentials from the User Management section.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2">
              <AccordionTrigger>Why can't I edit certain records?</AccordionTrigger>
              <AccordionContent>
                Edit permissions depend on your user role. Viewers have read-only access. Contact your administrator if you need elevated permissions.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-3">
              <AccordionTrigger>How are production allocations calculated?</AccordionTrigger>
              <AccordionContent>
                Allocations can use three methods: Test-based (using latest well test rates), Pro-rata (equal distribution), or Manual (custom factors). The system calculates allocated volumes based on the selected method and total commingled production.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-4">
              <AccordionTrigger>Can I import data from other systems?</AccordionTrigger>
              <AccordionContent>
                Yes! Production data can be imported via Excel/CSV files. Download the template from the Production page, fill in your data, and use the Import function. Report templates can also be imported/exported as CSV files.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-5">
              <AccordionTrigger>What do the alert severity levels mean?</AccordionTrigger>
              <AccordionContent>
                Info alerts are informational notices. Warning alerts indicate potential issues that should be monitored. Critical alerts require immediate attention and action.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Support Section */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Need More Help?</p>
                <p className="text-sm text-muted-foreground">Contact your system administrator for assistance</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Version Info & Logo */}
      <div className="flex flex-col items-center gap-4 pt-6 border-t">
        <div className="text-center text-sm text-muted-foreground">
          <p>FinTrak HASS - Version 4.0</p>
          <p>Last Updated: January 2026</p>
        </div>
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
  );
}
