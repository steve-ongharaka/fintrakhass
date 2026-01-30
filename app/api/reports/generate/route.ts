import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const generateReportSchema = z.object({
  reportType: z.enum([
    'production_summary',
    'well_test_report',
    'well_performance',
    'facilities_report',
    'field_analysis',
    'allocation_report',
    'decline_curve',
    'metering_report',
    'tank_inventory_report',
    'custody_transfer_report',
    'reconciliation_report',
    'nominations_lifting_report',
    'regulatory_report',
    'loss_accounting_report',
    'injection_wells_report',
    'audit_trail_report',
    'custom'
  ]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  wellId: z.string().optional(),
  field: z.string().optional(),
  facilityId: z.string().optional(),
  meterId: z.string().optional(),
  tankId: z.string().optional(),
  includeCharts: z.boolean().default(true),
  includeDataTable: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const filters = generateReportSchema.parse(body);

    let reportData: any = {};

    // Build date filter
    const dateFilter: any = {};
    if (filters.startDate) {
      dateFilter.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      dateFilter.lte = new Date(filters.endDate);
    }

    switch (filters.reportType) {
      case 'production_summary': {
        // Fetch production data
        const whereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          whereClause.productionDate = dateFilter;
        }
        if (filters.wellId) {
          whereClause.wellId = filters.wellId;
        }

        const production = await prisma.productionFdc.findMany({
          where: whereClause,
          include: {
            well: {
              select: {
                wellName: true,
                wellId: true,
                field: true,
              },
            },
          },
          orderBy: {
            productionDate: 'desc',
          },
        });

        // Calculate summary statistics
        const totalOil = production.reduce((sum: number, p: any) => sum + (p.grossOilVolume || 0), 0);
        const totalGas = production.reduce((sum: number, p: any) => sum + (p.grossGasVolume || 0), 0);
        const totalWater = production.reduce((sum: number, p: any) => sum + (p.grossWaterVolume || 0), 0);
        const avgOperatingHours = production.length > 0
          ? production.reduce((sum: number, p: any) => sum + (p.operatingHours || 0), 0) / production.length
          : 0;

        reportData = {
          summary: {
            totalOil: Math.round(totalOil),
            totalGas: Math.round(totalGas),
            totalWater: Math.round(totalWater),
            avgOperatingHours: Math.round(avgOperatingHours * 10) / 10,
            recordCount: production.length,
          },
          data: production,
        };
        break;
      }

      case 'well_test_report': {
        // Fetch well test data
        const wellTestWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          wellTestWhereClause.testDate = dateFilter;
        }
        if (filters.wellId) {
          wellTestWhereClause.wellId = filters.wellId;
        }

        const wellTests = await prisma.wellTest.findMany({
          where: wellTestWhereClause,
          include: {
            well: {
              select: {
                wellName: true,
                wellId: true,
                field: true,
              },
            },
          },
          orderBy: {
            testDate: 'desc',
          },
        });

        // Calculate summary statistics
        const avgOilRate = wellTests.length > 0
          ? wellTests.reduce((sum: number, t: any) => sum + (t.oilRate || 0), 0) / wellTests.length
          : 0;
        const avgGasRate = wellTests.length > 0
          ? wellTests.reduce((sum: number, t: any) => sum + (t.gasRate || 0), 0) / wellTests.length
          : 0;
        const avgWaterRate = wellTests.length > 0
          ? wellTests.reduce((sum: number, t: any) => sum + (t.waterRate || 0), 0) / wellTests.length
          : 0;
        const avgGor = wellTests.length > 0
          ? wellTests.reduce((sum: number, t: any) => sum + (t.gor || 0), 0) / wellTests.length
          : 0;
        const avgWaterCut = wellTests.length > 0
          ? wellTests.reduce((sum: number, t: any) => sum + (t.waterCut || 0), 0) / wellTests.length
          : 0;

        reportData = {
          summary: {
            totalTests: wellTests.length,
            avgOilRate: Math.round(avgOilRate * 10) / 10,
            avgGasRate: Math.round(avgGasRate * 10) / 10,
            avgWaterRate: Math.round(avgWaterRate * 10) / 10,
            avgGor: Math.round(avgGor),
            avgWaterCut: Math.round(avgWaterCut * 10) / 10,
          },
          data: wellTests,
        };
        break;
      }

      case 'well_performance': {
        // Fetch well performance metrics
        const whereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          whereClause.metricDate = dateFilter;
        }
        if (filters.wellId) {
          whereClause.wellId = filters.wellId;
        }

        const metrics = await prisma.performanceMetric.findMany({
          where: whereClause,
          include: {
            well: {
              select: {
                wellName: true,
                wellId: true,
                field: true,
                status: true,
              },
            },
          },
          orderBy: {
            metricDate: 'desc',
          },
        });

        // Calculate averages
        const avgEfficiency = metrics.length > 0
          ? metrics.reduce((sum: number, m: any) => sum + (m.efficiency || 0), 0) / metrics.length
          : 0;
        const avgUptime = metrics.length > 0
          ? metrics.reduce((sum: number, m: any) => sum + (m.uptime || 0), 0) / metrics.length
          : 0;

        reportData = {
          summary: {
            avgEfficiency: Math.round(avgEfficiency * 10) / 10,
            avgUptime: Math.round(avgUptime * 10) / 10,
            recordCount: metrics.length,
          },
          data: metrics,
        };
        break;
      }

      case 'facilities_report': {
        // Fetch facilities data
        const facilities = await prisma.facility.findMany({
          orderBy: { facilityName: 'asc' },
        });

        const activeCount = facilities.filter((f: any) => f.status === 'ACTIVE').length;
        const totalCapacity = facilities.reduce((sum: number, f: any) => sum + (f.capacity || 0), 0);

        // Group by type
        const byType = facilities.reduce((acc: any, f: any) => {
          acc[f.facilityType] = (acc[f.facilityType] || 0) + 1;
          return acc;
        }, {});

        reportData = {
          summary: {
            totalFacilities: facilities.length,
            activeFacilities: activeCount,
            totalCapacity: Math.round(totalCapacity),
            byType,
          },
          data: facilities,
        };
        break;
      }

      case 'field_analysis': {
        // Fetch production data grouped by field
        const whereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          whereClause.productionDate = dateFilter;
        }
        if (filters.field) {
          whereClause.well = {
            field: filters.field,
          };
        }

        const production = await prisma.productionFdc.findMany({
          where: whereClause,
          include: {
            well: {
              select: {
                wellName: true,
                wellId: true,
                field: true,
              },
            },
          },
        });

        // Group by field
        const fieldData: any = {};
        production.forEach((p: any) => {
          const field = p.well.field || 'Unknown';
          if (!fieldData[field]) {
            fieldData[field] = {
              field,
              totalOil: 0,
              totalGas: 0,
              totalWater: 0,
              wellCount: new Set(),
            };
          }
          fieldData[field].totalOil += p.grossOilVolume || 0;
          fieldData[field].totalGas += p.grossGasVolume || 0;
          fieldData[field].totalWater += p.grossWaterVolume || 0;
          fieldData[field].wellCount.add(p.wellId);
        });

        // Convert to array and format
        const fieldSummary = Object.values(fieldData).map((f: any) => ({
          field: f.field,
          totalOil: Math.round(f.totalOil),
          totalGas: Math.round(f.totalGas),
          totalWater: Math.round(f.totalWater),
          wellCount: f.wellCount.size,
        }));

        reportData = {
          summary: {
            fieldCount: fieldSummary.length,
            totalRecords: production.length,
          },
          data: fieldSummary,
          details: production,
        };
        break;
      }

      case 'allocation_report': {
        // Fetch allocation data
        const whereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          whereClause.allocationDate = dateFilter;
        }
        if (filters.facilityId) {
          whereClause.facilityId = filters.facilityId;
        }

        const allocations = await prisma.allocation.findMany({
          where: whereClause,
          include: {
            productionAllocations: {
              include: {
                well: {
                  select: {
                    wellName: true,
                    wellId: true,
                    field: true,
                  },
                },
              },
            },
          },
          orderBy: {
            allocationDate: 'desc',
          },
        });

        const totalAllocations = allocations.length;
        const totalWellsAllocated = new Set(
          allocations.flatMap((a: any) => a.productionAllocations.map((pa: any) => pa.wellId))
        ).size;

        reportData = {
          summary: {
            totalAllocations,
            totalWellsAllocated,
          },
          data: allocations,
        };
        break;
      }

      case 'decline_curve': {
        // Fetch performance metrics for decline analysis
        const whereClause: any = {};
        if (filters.wellId) {
          whereClause.wellId = filters.wellId;
        } else {
          return NextResponse.json(
            { error: 'Well ID is required for decline curve analysis' },
            { status: 400 }
          );
        }

        const metrics = await prisma.performanceMetric.findMany({
          where: whereClause,
          include: {
            well: {
              select: {
                wellName: true,
                wellId: true,
                field: true,
              },
            },
          },
          orderBy: {
            metricDate: 'asc',
          },
        });

        // Calculate decline rate (simplified)
        let avgDeclineRate = 0;
        if (metrics.length > 1) {
          const declineRates = metrics
            .filter((m: any) => m.declineRate !== null && m.declineRate !== 0)
            .map((m: any) => m.declineRate || 0);
          if (declineRates.length > 0) {
            avgDeclineRate = declineRates.reduce((sum: number, r: number) => sum + r, 0) / declineRates.length;
          }
        }

        reportData = {
          summary: {
            avgDeclineRate: Math.round(avgDeclineRate * 100) / 100,
            dataPoints: metrics.length,
            well: metrics[0]?.well,
          },
          data: metrics,
        };
        break;
      }

      case 'metering_report': {
        // Fetch meter readings and calibration data
        const meterWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          meterWhereClause.readingDate = dateFilter;
        }
        if (filters.meterId) {
          meterWhereClause.meterId = filters.meterId;
        }
        if (filters.facilityId) {
          meterWhereClause.meter = { facilityId: filters.facilityId };
        }

        const readings = await prisma.meterReading.findMany({
          where: meterWhereClause,
          include: {
            meter: {
              select: { meterName: true, meterType: true, serialNumber: true, facilityId: true },
            },
          },
          orderBy: { readingDate: 'desc' },
        });

        const calibrations = await prisma.meterCalibration.findMany({
          where: filters.meterId ? { meterId: filters.meterId } : {},
          include: {
            meter: { select: { meterName: true, meterType: true } },
          },
          orderBy: { calibrationDate: 'desc' },
          take: 50,
        });

        const totalVolume = readings.reduce((sum: number, r: any) => sum + (r.volume || 0), 0);
        
        reportData = {
          summary: {
            totalReadings: readings.length,
            totalVolume: Math.round(totalVolume),
            calibrationCount: calibrations.length,
          },
          data: { readings, calibrations },
        };
        break;
      }

      case 'tank_inventory_report': {
        // Fetch tank gaugings and stock movements
        const tankWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          tankWhereClause.gaugingDate = dateFilter;
        }
        if (filters.tankId) {
          tankWhereClause.tankId = filters.tankId;
        }
        if (filters.facilityId) {
          tankWhereClause.tank = { facilityId: filters.facilityId };
        }

        const gaugings = await prisma.tankGauging.findMany({
          where: tankWhereClause,
          include: {
            tank: {
              select: { tankName: true, tankType: true, nominalCapacity: true, facilityId: true },
            },
          },
          orderBy: { gaugingDate: 'desc' },
        });

        const movementWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          movementWhereClause.movementDate = dateFilter;
        }
        if (filters.tankId) {
          movementWhereClause.OR = [{ tankId: filters.tankId }, { destinationTankId: filters.tankId }];
        }

        const movements = await prisma.stockMovement.findMany({
          where: movementWhereClause,
          include: {
            tank: { select: { tankName: true } },
          },
          orderBy: { movementDate: 'desc' },
        });

        const latestLevels = gaugings.reduce((acc: any, g: any) => {
          if (!acc[g.tankId] || new Date(g.gaugingDate) > new Date(acc[g.tankId].gaugingDate)) {
            acc[g.tankId] = g;
          }
          return acc;
        }, {});

        const totalInventory = Object.values(latestLevels).reduce((sum: number, g: any) => sum + (g.grossObservedVolume || 0), 0);

        reportData = {
          summary: {
            totalGaugings: gaugings.length,
            totalMovements: movements.length,
            totalInventory: Math.round(totalInventory),
            tankCount: Object.keys(latestLevels).length,
          },
          data: { gaugings, movements },
        };
        break;
      }

      case 'custody_transfer_report': {
        // Fetch custody transfers
        const transferWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          transferWhereClause.transferDate = dateFilter;
        }

        const transfers = await prisma.custodyTransfer.findMany({
          where: transferWhereClause,
          include: {
            fiscalPoint: {
              select: { pointName: true, pointType: true, facilityId: true },
            },
          },
          orderBy: { transferDate: 'desc' },
        });

        const totalGross = transfers.reduce((sum: number, t: any) => sum + (t.grossVolume || 0), 0);
        const totalNet = transfers.reduce((sum: number, t: any) => sum + (t.netVolume || 0), 0);

        reportData = {
          summary: {
            totalTransfers: transfers.length,
            totalGrossVolume: Math.round(totalGross),
            totalNetVolume: Math.round(totalNet),
          },
          data: transfers,
        };
        break;
      }

      case 'reconciliation_report': {
        // Fetch imbalance records (no direct Reconciliation model)
        const imbalanceWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          imbalanceWhereClause.createdAt = dateFilter;
        }

        const imbalances = await prisma.imbalance.findMany({
          where: imbalanceWhereClause,
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        const totalImbalanceVolume = imbalances.reduce((sum: number, i: any) => sum + Math.abs(i.volume || 0), 0);

        reportData = {
          summary: {
            totalImbalances: imbalances.length,
            totalImbalanceVolume: Math.round(totalImbalanceVolume),
          },
          data: imbalances,
        };
        break;
      }

      case 'nominations_lifting_report': {
        // Fetch nominations and liftings
        const nominationWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          nominationWhereClause.nominationDate = dateFilter;
        }

        const nominations = await prisma.nomination.findMany({
          where: nominationWhereClause,
          orderBy: { nominationDate: 'desc' },
        });

        const liftingWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          liftingWhereClause.scheduledDate = dateFilter;
        }

        const liftings = await prisma.lifting.findMany({
          where: liftingWhereClause,
          include: {
            nomination: { select: { nominationNumber: true } },
          },
          orderBy: { scheduledDate: 'desc' },
        });

        const totalNominated = nominations.reduce((sum: number, n: any) => sum + (n.nominatedVolume || 0), 0);
        const totalLifted = liftings.reduce((sum: number, l: any) => sum + (l.loadedVolume || 0), 0);

        reportData = {
          summary: {
            totalNominations: nominations.length,
            totalLiftings: liftings.length,
            totalNominatedVolume: Math.round(totalNominated),
            totalLiftedVolume: Math.round(totalLifted),
          },
          data: { nominations, liftings },
        };
        break;
      }

      case 'regulatory_report': {
        // Fetch regulatory reports
        const regWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          regWhereClause.periodStart = dateFilter;
        }

        const regulatoryReports = await prisma.regulatoryReport.findMany({
          where: regWhereClause,
          orderBy: { periodStart: 'desc' },
        });

        const submitted = regulatoryReports.filter((r: any) => r.status === 'submitted').length;
        const pending = regulatoryReports.filter((r: any) => r.status === 'draft' || r.status === 'pending_review').length;

        reportData = {
          summary: {
            totalReports: regulatoryReports.length,
            submittedCount: submitted,
            pendingCount: pending,
          },
          data: regulatoryReports,
        };
        break;
      }

      case 'loss_accounting_report': {
        // Fetch loss events, flaring, and shrinkage records
        const lossWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          lossWhereClause.eventDate = dateFilter;
        }
        if (filters.facilityId) {
          lossWhereClause.facilityId = filters.facilityId;
        }

        const lossEvents = await prisma.lossEvent.findMany({
          where: lossWhereClause,
          orderBy: { eventDate: 'desc' },
        });

        const flaringWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          flaringWhereClause.recordDate = dateFilter;
        }
        if (filters.facilityId) {
          flaringWhereClause.facilityId = filters.facilityId;
        }

        const flaringRecords = await prisma.flaringRecord.findMany({
          where: flaringWhereClause,
          orderBy: { recordDate: 'desc' },
        });

        const shrinkageRecords = await prisma.shrinkageRecord.findMany({
          where: filters.facilityId ? { facilityId: filters.facilityId } : {},
          orderBy: { recordDate: 'desc' },
        });

        const totalLossVolume = lossEvents.reduce((sum: number, l: any) => sum + (l.volumeLost || 0), 0);
        const totalFlaredVolume = flaringRecords.reduce((sum: number, f: any) => sum + (f.volumeFlared || 0), 0);
        const totalShrinkageVolume = shrinkageRecords.reduce((sum: number, s: any) => sum + (s.shrinkageVolume || 0), 0);

        reportData = {
          summary: {
            totalLossEvents: lossEvents.length,
            totalLossVolume: Math.round(totalLossVolume),
            totalFlaringRecords: flaringRecords.length,
            totalFlaredVolume: Math.round(totalFlaredVolume),
            totalShrinkageRecords: shrinkageRecords.length,
            totalShrinkageVolume: Math.round(totalShrinkageVolume),
          },
          data: { lossEvents, flaringRecords, shrinkageRecords },
        };
        break;
      }

      case 'injection_wells_report': {
        // Fetch injection wells and data
        const injectionDataWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          injectionDataWhereClause.injectionDate = dateFilter;
        }
        if (filters.wellId) {
          injectionDataWhereClause.injectionWellId = filters.wellId;
        }

        const injectionData = await prisma.injectionData.findMany({
          where: injectionDataWhereClause,
          include: {
            injectionWell: {
              select: { wellName: true, wellId: true, injectionType: true, facilityId: true },
            },
          },
          orderBy: { injectionDate: 'desc' },
        });

        const injectionTests = await prisma.injectionTest.findMany({
          where: filters.wellId ? { injectionWellId: filters.wellId } : {},
          include: {
            injectionWell: { select: { wellName: true } },
          },
          orderBy: { testDate: 'desc' },
          take: 50,
        });

        const totalInjectedVolume = injectionData.reduce((sum: number, d: any) => sum + (d.injectionVolume || 0), 0);

        reportData = {
          summary: {
            totalRecords: injectionData.length,
            totalInjectedVolume: Math.round(totalInjectedVolume),
            totalTests: injectionTests.length,
          },
          data: { injectionData, injectionTests },
        };
        break;
      }

      case 'audit_trail_report': {
        // Fetch audit logs
        const auditWhereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
          auditWhereClause.timestamp = dateFilter;
        }

        const auditLogs = await prisma.auditLog.findMany({
          where: auditWhereClause,
          orderBy: { timestamp: 'desc' },
          take: 500,
        });

        const actionCounts = auditLogs.reduce((acc: any, log: any) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {});

        const entityCounts = auditLogs.reduce((acc: any, log: any) => {
          acc[log.entityType] = (acc[log.entityType] || 0) + 1;
          return acc;
        }, {});

        reportData = {
          summary: {
            totalEntries: auditLogs.length,
            actionCounts,
            entityCounts,
          },
          data: auditLogs,
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      reportType: filters.reportType,
      generatedAt: new Date().toISOString(),
      filters,
      ...reportData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
