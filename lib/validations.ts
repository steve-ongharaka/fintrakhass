import { z } from 'zod';

// User validations
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
}).transform((data) => ({
  ...data,
  // Only accept valid roles, default to viewer
  role: ['admin', 'operator', 'viewer'].includes(data.role || '') ? data.role : undefined,
}));

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Well validations
export const wellSchema = z.object({
  wellName: z.string().min(1, 'Well name is required'),
  wellId: z.string().min(1, 'Well ID is required'),
  field: z.string().optional().nullable(),
  facilityId: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'shut_in']).default('active'),
  wellType: z.enum(['oil', 'gas', 'water_injection']).default('oil'),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  spudDate: z.coerce.date().optional().nullable(),
  completionDate: z.coerce.date().optional().nullable(),
});

// Facility validations
export const facilitySchema = z.object({
  facilityName: z.string().min(1, 'Facility name is required'),
  facilityId: z.string().min(1, 'Facility ID is required'),
  field: z.string().optional().nullable(),
  facilityType: z.enum(['production', 'processing', 'storage']).default('production'),
  operator: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  capacity: z.coerce.number().positive().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
});

// Product validations
export const productSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  productCode: z.string().min(1, 'Product code is required'),
  unitOfMeasurement: z.string().optional().nullable(),
  standardTemperature: z.coerce.number().optional().nullable().default(60),
  standardPressure: z.coerce.number().optional().nullable().default(14.7),
  density: z.coerce.number().positive().optional().nullable(),
  apiGravity: z.coerce.number().optional().nullable(),
});

// Production FDC validations
export const productionFdcSchema = z.object({
  productionDate: z.coerce.date({ required_error: 'Production date is required' }),
  wellId: z.string().min(1, 'Well is required'),
  grossOilVolume: z.coerce.number().min(0, 'Gross oil volume must be non-negative').optional().nullable().default(0),
  grossGasVolume: z.coerce.number().min(0, 'Gross gas volume must be non-negative').optional().nullable().default(0),
  grossWaterVolume: z.coerce.number().min(0, 'Gross water volume must be non-negative').optional().nullable().default(0),
  operatingHours: z.coerce.number().min(0).max(24, 'Operating hours must be between 0 and 24').optional().nullable().default(0),
  flowingTubingPressure: z.coerce.number().min(0).optional().nullable(),
  flowingCasingPressure: z.coerce.number().min(0).optional().nullable(),
  chokeSize: z.coerce.number().min(0).optional().nullable(),
  sandWaterPercentage: z.coerce.number().min(0).max(100, 'S&W% must be between 0 and 100').optional().nullable().default(0),
  temperature: z.coerce.number().optional().nullable(),
  comments: z.string().optional().nullable(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type WellInput = z.infer<typeof wellSchema>;
export type FacilityInput = z.infer<typeof facilitySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductionFdcInput = z.infer<typeof productionFdcSchema>;
