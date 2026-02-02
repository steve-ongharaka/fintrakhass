// Production calculations for standardization

/**
 * Calculate Net Oil Volume
 * Net Oil = Gross Oil - (Gross Oil × S&W%)
 */
export function calculateNetOilVolume(
  grossOil: number | null | undefined,
  sandWaterPercentage: number | null | undefined
): number {
  const oil = grossOil ?? 0;
  const sw = sandWaterPercentage ?? 0;
  return oil - (oil * (sw / 100));
}

/**
 * Calculate Gas-Oil Ratio (GOR)
 * GOR = Gas Volume / Oil Volume (Mcf/bbl)
 */
export function calculateGOR(
  gasVolume: number | null | undefined,
  oilVolume: number | null | undefined
): number {
  const gas = gasVolume ?? 0;
  const oil = oilVolume ?? 0;
  if (oil === 0) return 0;
  return gas / oil;
}

/**
 * Calculate Water Cut
 * Water Cut = Water Volume / (Oil + Water Volume) × 100
 */
export function calculateWaterCut(
  waterVolume: number | null | undefined,
  oilVolume: number | null | undefined
): number {
  const water = waterVolume ?? 0;
  const oil = oilVolume ?? 0;
  const total = oil + water;
  if (total === 0) return 0;
  return (water / total) * 100;
}

/**
 * Calculate Production Efficiency
 * Efficiency = (Operating Hours / 24) × 100
 */
export function calculateProductionEfficiency(
  operatingHours: number | null | undefined
): number {
  const hours = operatingHours ?? 0;
  return (hours / 24) * 100;
}

/**
 * Standardize Gas Volume to standard conditions (60°F, 14.7 psia)
 * Using simplified correction factor
 */
export function standardizeGasVolume(
  fieldGasVolume: number | null | undefined,
  fieldTemperature: number | null | undefined,
  fieldPressure: number | null | undefined
): number {
  const gas = fieldGasVolume ?? 0;
  const temp = fieldTemperature ?? 60; // Default to standard if not provided
  const pressure = fieldPressure ?? 14.7;
  
  // Standard conditions
  const stdTemp = 60; // °F
  const stdPressure = 14.7; // psia
  
  // Convert temperatures to Rankine
  const fieldTempR = temp + 459.67;
  const stdTempR = stdTemp + 459.67;
  
  // Correction factor
  const correctionFactor = (pressure / stdPressure) * (stdTempR / fieldTempR);
  
  return gas * correctionFactor;
}

/**
 * Calculate all standardized values from FDC data
 */
export function calculateStandardizedProduction(fdcData: {
  grossOilVolume?: number | null;
  grossGasVolume?: number | null;
  grossWaterVolume?: number | null;
  sandWaterPercentage?: number | null;
  operatingHours?: number | null;
  temperature?: number | null;
  flowingTubingPressure?: number | null;
}) {
  const netOilVolume = calculateNetOilVolume(
    fdcData.grossOilVolume,
    fdcData.sandWaterPercentage
  );
  
  const stdGasVolume = standardizeGasVolume(
    fdcData.grossGasVolume,
    fdcData.temperature,
    fdcData.flowingTubingPressure
  );
  
  const stdWaterVolume = fdcData.grossWaterVolume ?? 0;
  
  const gor = calculateGOR(fdcData.grossGasVolume, netOilVolume);
  
  const waterCut = calculateWaterCut(fdcData.grossWaterVolume, netOilVolume);
  
  const productionEfficiency = calculateProductionEfficiency(
    fdcData.operatingHours
  );
  
  return {
    netOilVolume: Math.round(netOilVolume * 100) / 100,
    stdGasVolume: Math.round(stdGasVolume * 100) / 100,
    stdWaterVolume: Math.round(stdWaterVolume * 100) / 100,
    gor: Math.round(gor * 100) / 100,
    waterCut: Math.round(waterCut * 100) / 100,
    productionEfficiency: Math.round(productionEfficiency * 100) / 100,
  };
}
