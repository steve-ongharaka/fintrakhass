import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const calculateStandardizedProduction = (fdcData: {
  grossOilVolume?: number | null;
  grossGasVolume?: number | null;
  grossWaterVolume?: number | null;
  sandWaterPercentage?: number | null;
  operatingHours?: number | null;
}) => {
  const grossOil = fdcData.grossOilVolume ?? 0;
  const sw = fdcData.sandWaterPercentage ?? 0;
  const netOilVolume = grossOil - (grossOil * (sw / 100));
  const gas = fdcData.grossGasVolume ?? 0;
  const water = fdcData.grossWaterVolume ?? 0;
  const gor = netOilVolume > 0 ? gas / netOilVolume : 0;
  const total = netOilVolume + water;
  const waterCut = total > 0 ? (water / total) * 100 : 0;
  const hours = fdcData.operatingHours ?? 0;
  const productionEfficiency = (hours / 24) * 100;

  return {
    netOilVolume: Math.round(netOilVolume * 100) / 100,
    stdGasVolume: Math.round(gas * 100) / 100,
    stdWaterVolume: Math.round(water * 100) / 100,
    gor: Math.round(gor * 100) / 100,
    waterCut: Math.round(waterCut * 100) / 100,
    productionEfficiency: Math.round(productionEfficiency * 100) / 100,
  };
};

async function main() {
  console.log('Starting seed...');

  // Clean existing data
  await prisma.productionStd.deleteMany();
  await prisma.productionFdc.deleteMany();
  await prisma.well.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleaned existing data');

  // Create users
  const hashedPassword = await bcrypt.hash('johndoe123', 12);
  const hashedOperatorPassword = await bcrypt.hash('Operator123!', 12);
  const hashedViewerPassword = await bcrypt.hash('Viewer123!', 12);

  const adminUser = await prisma.user.create({
    data: {
      email: 'john@doe.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
    },
  });

  const operatorUser = await prisma.user.create({
    data: {
      email: 'operator@fintrak.com',
      password: hashedOperatorPassword,
      firstName: 'Mike',
      lastName: 'Operator',
      role: 'operator',
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@fintrak.com',
      password: hashedViewerPassword,
      firstName: 'Sarah',
      lastName: 'Viewer',
      role: 'viewer',
    },
  });

  console.log('Created users');

  // Create facilities
  const facilities = await Promise.all([
    prisma.facility.create({
      data: {
        facilityName: 'Escravos Flow Station',
        facilityId: 'FAC-ESC-001',
        field: 'Escravos',
        facilityType: 'production',
        operator: 'Chevron Nigeria',
        location: 'Delta State, Nigeria',
        capacity: 150000,
        status: 'active',
      },
    }),
    prisma.facility.create({
      data: {
        facilityName: 'Bonny Terminal',
        facilityId: 'FAC-BON-001',
        field: 'Bonny',
        facilityType: 'processing',
        operator: 'Shell Nigeria',
        location: 'Rivers State, Nigeria',
        capacity: 200000,
        status: 'active',
      },
    }),
    prisma.facility.create({
      data: {
        facilityName: 'Forcados Storage',
        facilityId: 'FAC-FOR-001',
        field: 'Forcados',
        facilityType: 'storage',
        operator: 'Shell Nigeria',
        location: 'Delta State, Nigeria',
        capacity: 500000,
        status: 'active',
      },
    }),
    prisma.facility.create({
      data: {
        facilityName: 'Brass Terminal',
        facilityId: 'FAC-BRS-001',
        field: 'Brass',
        facilityType: 'production',
        operator: 'Eni Nigeria',
        location: 'Bayelsa State, Nigeria',
        capacity: 100000,
        status: 'active',
      },
    }),
    prisma.facility.create({
      data: {
        facilityName: 'Qua Iboe Terminal',
        facilityId: 'FAC-QIT-001',
        field: 'Qua Iboe',
        facilityType: 'processing',
        operator: 'ExxonMobil Nigeria',
        location: 'Akwa Ibom State, Nigeria',
        capacity: 180000,
        status: 'active',
      },
    }),
  ]);

  console.log('Created facilities');

  // Create products
  await Promise.all([
    prisma.product.create({
      data: {
        productName: 'Crude Oil',
        productCode: 'CRUDE',
        unitOfMeasurement: 'bbl',
        standardTemperature: 60,
        standardPressure: 14.7,
        density: 0.85,
        apiGravity: 35,
      },
    }),
    prisma.product.create({
      data: {
        productName: 'Natural Gas',
        productCode: 'NATGAS',
        unitOfMeasurement: 'Mcf',
        standardTemperature: 60,
        standardPressure: 14.7,
        density: 0.042,
      },
    }),
    prisma.product.create({
      data: {
        productName: 'Condensate',
        productCode: 'COND',
        unitOfMeasurement: 'bbl',
        standardTemperature: 60,
        standardPressure: 14.7,
        density: 0.75,
        apiGravity: 55,
      },
    }),
    prisma.product.create({
      data: {
        productName: 'Produced Water',
        productCode: 'WATER',
        unitOfMeasurement: 'bbl',
        standardTemperature: 60,
        standardPressure: 14.7,
        density: 1.02,
      },
    }),
    prisma.product.create({
      data: {
        productName: 'Natural Gas Liquids',
        productCode: 'NGL',
        unitOfMeasurement: 'bbl',
        standardTemperature: 60,
        standardPressure: 14.7,
        density: 0.55,
      },
    }),
  ]);

  console.log('Created products');

  // Create wells
  const wellsData = [
    { name: 'ESC-001', field: 'Escravos', facilityIndex: 0, type: 'oil', status: 'active' },
    { name: 'ESC-002', field: 'Escravos', facilityIndex: 0, type: 'oil', status: 'active' },
    { name: 'ESC-003', field: 'Escravos', facilityIndex: 0, type: 'gas', status: 'active' },
    { name: 'ESC-004', field: 'Escravos', facilityIndex: 0, type: 'oil', status: 'shut_in' },
    { name: 'BON-001', field: 'Bonny', facilityIndex: 1, type: 'oil', status: 'active' },
    { name: 'BON-002', field: 'Bonny', facilityIndex: 1, type: 'oil', status: 'active' },
    { name: 'BON-003', field: 'Bonny', facilityIndex: 1, type: 'gas', status: 'active' },
    { name: 'BON-004', field: 'Bonny', facilityIndex: 1, type: 'oil', status: 'inactive' },
    { name: 'FOR-001', field: 'Forcados', facilityIndex: 2, type: 'oil', status: 'active' },
    { name: 'FOR-002', field: 'Forcados', facilityIndex: 2, type: 'oil', status: 'active' },
    { name: 'FOR-003', field: 'Forcados', facilityIndex: 2, type: 'water_injection', status: 'active' },
    { name: 'FOR-004', field: 'Forcados', facilityIndex: 2, type: 'oil', status: 'active' },
    { name: 'BRS-001', field: 'Brass', facilityIndex: 3, type: 'oil', status: 'active' },
    { name: 'BRS-002', field: 'Brass', facilityIndex: 3, type: 'gas', status: 'active' },
    { name: 'BRS-003', field: 'Brass', facilityIndex: 3, type: 'oil', status: 'shut_in' },
    { name: 'QIT-001', field: 'Qua Iboe', facilityIndex: 4, type: 'oil', status: 'active' },
    { name: 'QIT-002', field: 'Qua Iboe', facilityIndex: 4, type: 'oil', status: 'active' },
    { name: 'QIT-003', field: 'Qua Iboe', facilityIndex: 4, type: 'gas', status: 'active' },
    { name: 'QIT-004', field: 'Qua Iboe', facilityIndex: 4, type: 'oil', status: 'active' },
    { name: 'QIT-005', field: 'Qua Iboe', facilityIndex: 4, type: 'oil', status: 'inactive' },
  ];

  const wells = [];
  for (const w of wellsData) {
    const well = await prisma.well.create({
      data: {
        wellName: `Well ${w.name}`,
        wellId: w.name,
        field: w.field,
        facilityId: facilities[w.facilityIndex].id,
        status: w.status as any,
        wellType: w.type as any,
        latitude: 5.5 + Math.random() * 2,
        longitude: 5.5 + Math.random() * 2,
        spudDate: new Date(2020, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        completionDate: new Date(2021, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      },
    });
    wells.push(well);
  }

  console.log('Created wells');

  // Create production data for the last 30 days
  const activeWells = wells.filter((w) => w.status === 'active');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log('Creating production data...');

  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const productionDate = new Date(today);
    productionDate.setDate(productionDate.getDate() - dayOffset);

    for (const well of activeWells) {
      const isOilWell = well.wellType === 'oil';
      const isGasWell = well.wellType === 'gas';

      // Generate realistic production values based on well type
      const baseOil = isOilWell ? 800 + Math.random() * 400 : isGasWell ? 50 + Math.random() * 50 : 0;
      const baseGas = isGasWell ? 5000 + Math.random() * 3000 : isOilWell ? baseOil * (2 + Math.random() * 2) : 0;
      const baseWater = isOilWell ? 200 + Math.random() * 300 : 50 + Math.random() * 100;

      // Add some daily variation
      const dailyVariation = 0.9 + Math.random() * 0.2;
      const grossOilVolume = Math.round(baseOil * dailyVariation * 100) / 100;
      const grossGasVolume = Math.round(baseGas * dailyVariation * 100) / 100;
      const grossWaterVolume = Math.round(baseWater * dailyVariation * 100) / 100;
      const operatingHours = Math.round((20 + Math.random() * 4) * 10) / 10;
      const sandWaterPercentage = Math.round(Math.random() * 5 * 100) / 100;
      const temperature = Math.round((150 + Math.random() * 30) * 10) / 10;
      const flowingTubingPressure = Math.round((500 + Math.random() * 500) * 10) / 10;
      const flowingCasingPressure = Math.round((200 + Math.random() * 200) * 10) / 10;
      const chokeSize = Math.round((0.25 + Math.random() * 0.5) * 100) / 100;

      const fdcData = {
        grossOilVolume,
        grossGasVolume,
        grossWaterVolume,
        operatingHours,
        sandWaterPercentage,
      };

      const stdValues = calculateStandardizedProduction(fdcData);

      await prisma.productionFdc.create({
        data: {
          productionDate,
          wellId: well.id,
          grossOilVolume,
          grossGasVolume,
          grossWaterVolume,
          operatingHours,
          flowingTubingPressure,
          flowingCasingPressure,
          chokeSize,
          sandWaterPercentage,
          temperature,
          createdById: operatorUser.id,
          productionStd: {
            create: {
              productionDate,
              wellId: well.id,
              ...stdValues,
            },
          },
        },
      });
    }
  }

  console.log('Created production data');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
