// User types
export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: 'admin' | 'operator' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

// Well types
export interface Well {
  id: string;
  wellName: string;
  wellId: string;
  field?: string | null;
  facilityId?: string | null;
  facility?: Facility | null;
  status: 'active' | 'inactive' | 'shut_in';
  wellType: 'oil' | 'gas' | 'water_injection';
  latitude?: number | null;
  longitude?: number | null;
  spudDate?: Date | null;
  completionDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Facility types
export interface Facility {
  id: string;
  facilityName: string;
  facilityId: string;
  field?: string | null;
  facilityType: 'production' | 'processing' | 'storage';
  operator?: string | null;
  location?: string | null;
  capacity?: number | null;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  wells?: Well[];
}

// Product types
export interface Product {
  id: string;
  productName: string;
  productCode: string;
  unitOfMeasurement?: string | null;
  standardTemperature?: number | null;
  standardPressure?: number | null;
  density?: number | null;
  apiGravity?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Production FDC types
export interface ProductionFdc {
  id: string;
  productionDate: Date;
  wellId: string;
  well?: Well;
  grossOilVolume?: number | null;
  grossGasVolume?: number | null;
  grossWaterVolume?: number | null;
  operatingHours?: number | null;
  flowingTubingPressure?: number | null;
  flowingCasingPressure?: number | null;
  chokeSize?: number | null;
  sandWaterPercentage?: number | null;
  temperature?: number | null;
  comments?: string | null;
  createdById?: string | null;
  createdBy?: User;
  createdAt: Date;
  updatedAt: Date;
  productionStd?: ProductionStd;
}

// Production STD types
export interface ProductionStd {
  id: string;
  fdcId: string;
  productionDate: Date;
  wellId: string;
  well?: Well;
  netOilVolume?: number | null;
  stdGasVolume?: number | null;
  stdWaterVolume?: number | null;
  gor?: number | null;
  waterCut?: number | null;
  productionEfficiency?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard KPI types
export interface DashboardKPIs {
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

// Chart data types
export interface DailyProductionTrend {
  date: string;
  oil: number;
  gas: number;
  water: number;
}

export interface WellProduction {
  wellName: string;
  oil: number;
  gas: number;
  water: number;
}

export interface FieldProduction {
  field: string;
  value: number;
}

export interface WellStatusDistribution {
  status: string;
  count: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
