/**
 * Advanced Calculations Library for Hydrocarbon Accounting
 * Implements industry-standard volume corrections and conversions
 */

export interface CorrectionFactors {
  shrinkageFactor?: number;
  vcfFactor?: number;
  densityAt15C?: number;
  thermalExpansion?: number;
}

export interface ProductionVolumes {
  grossOil: number;
  grossGas: number;
  grossWater: number;
  bsw?: number; // Basic Sediment & Water percentage
  temperature?: number; // in Fahrenheit or Celsius
  pressure?: number; // in PSI or kPa
  gor?: number; // Gas-Oil Ratio
}

export interface CorrectedVolumes {
  netOil: number;
  stdGas: number;
  stdWater: number;
  netOilAfterShrinkage: number;
  correctedGas: number;
  correctedWater: number;
  gor: number;
  waterCut: number;
  appliedShrinkage: number;
  appliedVCF: number;
}

/**
 * Apply BSW correction to calculate net oil from gross oil
 * Formula: Net Oil = Gross Oil × (1 - BSW/100)
 */
export function applyBSWCorrection(grossOil: number, bsw: number): number {
  if (bsw < 0 || bsw > 100) {
    throw new Error('BSW must be between 0 and 100');
  }
  return grossOil * (1 - bsw / 100);
}

/**
 * Apply shrinkage factor to oil volume
 * Accounts for volume loss from reservoir to stock tank conditions
 * Formula: Corrected Volume = Volume × Shrinkage Factor
 */
export function applyShrinkage(
  volume: number,
  shrinkageFactor: number = 0.98
): number {
  if (shrinkageFactor <= 0 || shrinkageFactor > 1) {
    throw new Error('Shrinkage factor must be between 0 and 1');
  }
  return volume * shrinkageFactor;
}

/**
 * Apply Volume Correction Factor (VCF) for temperature correction
 * Converts observed volume to volume at standard conditions (60°F or 15°C)
 * Uses ASTM Table 6A methodology
 */
export function applyVCF(
  volume: number,
  observedTemp: number,
  standardTemp: number = 60,
  thermalExpansion: number = 0.0007
): number {
  const tempDiff = observedTemp - standardTemp;
  const vcf = 1 - thermalExpansion * tempDiff;
  return volume * vcf;
}

/**
 * Calculate API Gravity from specific gravity
 * Formula: API = (141.5 / SG at 60°F) - 131.5
 */
export function calculateAPIGravity(specificGravity: number): number {
  if (specificGravity <= 0) {
    throw new Error('Specific gravity must be positive');
  }
  return 141.5 / specificGravity - 131.5;
}

/**
 * Calculate specific gravity from API Gravity
 * Formula: SG = 141.5 / (API + 131.5)
 */
export function calculateSpecificGravity(apiGravity: number): number {
  if (apiGravity < 0) {
    throw new Error('API gravity must be non-negative');
  }
  return 141.5 / (apiGravity + 131.5);
}

/**
 * Calculate density at 15°C from API Gravity
 * Formula: Density (kg/m³) = SG × 999.016 (density of water at 15°C)
 */
export function calculateDensityAt15C(apiGravity: number): number {
  const sg = calculateSpecificGravity(apiGravity);
  return sg * 999.016; // Water density at 15°C in kg/m³
}

/**
 * Calculate associated gas volume from oil production and GOR
 * Formula: Gas Volume = Oil Volume × GOR
 */
export function calculateAssociatedGas(
  oilVolume: number,
  gor: number
): number {
  if (gor < 0) {
    throw new Error('GOR must be non-negative');
  }
  return oilVolume * gor;
}

/**
 * Calculate water cut percentage
 * Formula: Water Cut = (Water Volume / (Oil Volume + Water Volume)) × 100
 */
export function calculateWaterCut(
  oilVolume: number,
  waterVolume: number
): number {
  const totalLiquid = oilVolume + waterVolume;
  if (totalLiquid === 0) return 0;
  return (waterVolume / totalLiquid) * 100;
}

/**
 * Apply all corrections to production volumes
 * Returns corrected volumes with all applicable factors applied
 */
export function applyAllCorrections(
  volumes: ProductionVolumes,
  factors?: CorrectionFactors
): CorrectedVolumes {
  const {
    grossOil,
    grossGas,
    grossWater,
    bsw = 0,
    temperature = 60,
    gor = 0,
  } = volumes;

  const {
    shrinkageFactor = 0.98,
    vcfFactor = 1.0,
    thermalExpansion = 0.0007,
  } = factors || {};

  // Step 1: Apply BSW correction to get net oil
  const netOil = applyBSWCorrection(grossOil, bsw);

  // Step 2: Apply VCF for temperature correction
  const tempCorrectedOil = applyVCF(netOil, temperature, 60, thermalExpansion);

  // Step 3: Apply shrinkage factor
  const netOilAfterShrinkage = applyShrinkage(tempCorrectedOil, shrinkageFactor);

  // Step 4: Apply VCF to gas
  const correctedGas = applyVCF(grossGas, temperature, 60, thermalExpansion);

  // Step 5: Calculate associated gas if GOR is provided
  const totalGas = gor > 0 ? calculateAssociatedGas(netOilAfterShrinkage, gor) : correctedGas;

  // Step 6: Apply VCF to water
  const correctedWater = applyVCF(grossWater, temperature, 60, thermalExpansion);

  // Step 7: Calculate water cut
  const waterCut = calculateWaterCut(netOilAfterShrinkage, correctedWater);

  // Calculate effective GOR from corrected volumes
  const effectiveGOR = netOilAfterShrinkage > 0 ? totalGas / netOilAfterShrinkage : 0;

  return {
    netOil,
    stdGas: correctedGas,
    stdWater: correctedWater,
    netOilAfterShrinkage,
    correctedGas: totalGas,
    correctedWater,
    gor: effectiveGOR,
    waterCut,
    appliedShrinkage: shrinkageFactor,
    appliedVCF: vcfFactor,
  };
}

/**
 * Validate production data for calculation
 */
export function validateProductionData(volumes: ProductionVolumes): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (volumes.grossOil < 0) {
    errors.push('Gross oil volume cannot be negative');
  }

  if (volumes.grossGas < 0) {
    errors.push('Gross gas volume cannot be negative');
  }

  if (volumes.grossWater < 0) {
    errors.push('Gross water volume cannot be negative');
  }

  if (volumes.bsw !== undefined && (volumes.bsw < 0 || volumes.bsw > 100)) {
    errors.push('BSW must be between 0 and 100');
  }

  if (volumes.temperature !== undefined && volumes.temperature < -100) {
    errors.push('Temperature seems invalid');
  }

  if (volumes.pressure !== undefined && volumes.pressure < 0) {
    errors.push('Pressure cannot be negative');
  }

  if (volumes.gor !== undefined && volumes.gor < 0) {
    errors.push('GOR cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Convert temperature between Fahrenheit and Celsius
 */
export function convertTemperature(
  value: number,
  from: 'F' | 'C',
  to: 'F' | 'C'
): number {
  if (from === to) return value;
  
  if (from === 'F' && to === 'C') {
    return (value - 32) * (5 / 9);
  }
  
  return value * (9 / 5) + 32;
}

/**
 * Convert pressure between PSI and kPa
 */
export function convertPressure(
  value: number,
  from: 'PSI' | 'kPa',
  to: 'PSI' | 'kPa'
): number {
  if (from === to) return value;
  
  if (from === 'PSI' && to === 'kPa') {
    return value * 6.89476;
  }
  
  return value / 6.89476;
}
