import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import {
  sendNotificationEmail,
  generateProductionAlertEmail,
  generateSystemAlertEmail,
} from '@/lib/notifications';
import { z } from 'zod';

const sendNotificationSchema = z.object({
  type: z.enum(['production_alert', 'system_alert']),
  alertType: z.string(),
  wellId: z.string().optional(),
  facilityId: z.string().optional(),
  message: z.string(),
  actualValue: z.number().optional(),
  thresholdValue: z.number().optional(),
  unit: z.string().optional(),
  severity: z.enum(['critical', 'warning', 'info']).default('warning'),
  details: z.string().optional(),
  createWellAlert: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (!['admin', 'operator'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const data = sendNotificationSchema.parse(body);

    let emailBody: string;
    let subject: string;
    let notificationId: string;
    let wellName: string | undefined;
    let facilityName: string | undefined;

    // Get entity names if provided
    if (data.wellId) {
      const well = await prisma.well.findUnique({ where: { id: data.wellId } });
      wellName = well?.wellName;
    }
    if (data.facilityId) {
      const facility = await prisma.facility.findUnique({ where: { id: data.facilityId } });
      facilityName = facility?.facilityName;
    }

    if (data.type === 'production_alert') {
      notificationId = process.env.NOTIF_ID_PRODUCTION_ALERT || '';
      subject = `⚠️ Production Alert: ${data.alertType.replace(/_/g, ' ')}${wellName ? ` - ${wellName}` : ''}`;
      emailBody = generateProductionAlertEmail({
        alertType: data.alertType,
        wellName,
        facilityName,
        message: data.message,
        actualValue: data.actualValue,
        thresholdValue: data.thresholdValue,
        unit: data.unit,
        severity: data.severity,
        timestamp: new Date(),
      });

      // Optionally create a WellAlert record
      if (data.createWellAlert && data.wellId) {
        await prisma.wellAlert.create({
          data: {
            wellId: data.wellId,
            alertType: data.alertType as any,
            severity: data.severity as any,
            message: data.message,
            thresholdValue: data.thresholdValue,
            actualValue: data.actualValue,
          },
        });
      }
    } else {
      notificationId = process.env.NOTIF_ID_SYSTEM_ALERT || '';
      subject = `🔔 System Alert: ${data.alertType.replace(/_/g, ' ')}`;
      emailBody = generateSystemAlertEmail({
        alertType: data.alertType,
        message: data.message,
        details: data.details,
        timestamp: new Date(),
      });
    }

    // Send email notification
    const result = await sendNotificationEmail({
      notificationId,
      subject,
      body: emailBody,
    });

    // Log to audit
    await prisma.auditLog.create({
      data: {
        action: 'create',
        entityType: 'Notification',
        entityId: data.type,
        description: `${data.type} notification sent: ${data.alertType}`,
        userId: (session.user as any)?.id,
        userEmail: session.user?.email,
        newValues: JSON.stringify({ type: data.type, alertType: data.alertType, severity: data.severity }),
      },
    });

    return NextResponse.json({
      success: result.success,
      message: result.notificationDisabled ? 'Notification disabled by user' : 'Notification sent successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
