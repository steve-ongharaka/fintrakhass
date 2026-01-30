// Email Notification Utility for FinTrak HASS

interface SendNotificationParams {
  notificationId: string;
  subject: string;
  body: string;
  recipientEmail?: string;
  isHtml?: boolean;
}

interface NotificationResult {
  success: boolean;
  message?: string;
  notificationDisabled?: boolean;
}

export async function sendNotificationEmail(params: SendNotificationParams): Promise<NotificationResult> {
  const { notificationId, subject, body, recipientEmail, isHtml = true } = params;

  try {
    const appUrl = process.env.NEXTAUTH_URL || '';
    const appName = appUrl ? new URL(appUrl).hostname.split('.')[0] : 'FinTrak HASS';
    const senderEmail = appUrl ? `noreply@${new URL(appUrl).hostname}` : 'noreply@mail.abacusai.app';

    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: notificationId,
        subject,
        body,
        is_html: isHtml,
        recipient_email: recipientEmail || 'steve.ongharaka@fintraksoftware.com',
        sender_email: senderEmail,
        sender_alias: appName,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      if (result.notification_disabled) {
        console.log('Notification disabled by user, skipping email');
        return { success: true, notificationDisabled: true };
      }
      throw new Error(result.message || 'Failed to send notification');
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Production Alert Email Template
export function generateProductionAlertEmail(data: {
  alertType: string;
  wellName?: string;
  facilityName?: string;
  message: string;
  actualValue?: number;
  thresholdValue?: number;
  unit?: string;
  severity: string;
  timestamp: Date;
}): string {
  const severityColors: Record<string, string> = {
    critical: '#DC2626',
    warning: '#F59E0B',
    info: '#3B82F6',
  };

  const severityColor = severityColors[data.severity.toLowerCase()] || '#6B7280';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
      <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: ${severityColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ Production Alert</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.alertType.replace(/_/g, ' ').toUpperCase()}</p>
        </div>
        
        <div style="padding: 20px;">
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 0; font-size: 16px;"><strong>Message:</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 18px; color: #111827;">${data.message}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse;">
            ${data.wellName ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Well:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${data.wellName}</td></tr>` : ''}
            ${data.facilityName ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Facility:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${data.facilityName}</td></tr>` : ''}
            ${data.actualValue !== undefined ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Actual Value:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${data.actualValue} ${data.unit || ''}</td></tr>` : ''}
            ${data.thresholdValue !== undefined ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Threshold:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${data.thresholdValue} ${data.unit || ''}</td></tr>` : ''}
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Severity:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><span style="background: ${severityColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${data.severity.toUpperCase()}</span></td></tr>
            <tr><td style="padding: 8px 0;"><strong>Detected At:</strong></td><td style="padding: 8px 0;">${data.timestamp.toLocaleString()}</td></tr>
          </table>
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated alert from FinTrak HASS</p>
        </div>
      </div>
    </div>
  `;
}

// Scheduled Report Email Template
export function generateScheduledReportEmail(data: {
  reportName: string;
  reportType: string;
  generatedAt: Date;
  summary?: Record<string, any>;
  downloadUrl?: string;
}): string {
  let summaryHtml = '';
  if (data.summary && Object.keys(data.summary).length > 0) {
    const summaryItems = Object.entries(data.summary)
      .map(([key, value]) => `<tr><td style="padding: 8px; border: 1px solid #e5e7eb;">${key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}</td><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">${typeof value === 'number' ? value.toLocaleString() : value}</td></tr>`)
      .join('');
    summaryHtml = `
      <h3 style="color: #374151; margin: 20px 0 10px;">Report Summary</h3>
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
        ${summaryItems}
      </table>
    `;
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
      <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📊 Scheduled Report</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.reportName}</p>
        </div>
        
        <div style="padding: 20px;">
          <p style="color: #6b7280; margin: 0 0 15px;">Your scheduled report has been generated successfully.</p>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Report Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${data.reportType.replace(/_/g, ' ')}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Generated At:</strong></td><td style="padding: 8px 0;">${data.generatedAt.toLocaleString()}</td></tr>
          </table>
          
          ${summaryHtml}
          
          ${data.downloadUrl ? `
            <div style="text-align: center; margin-top: 20px;">
              <a href="${data.downloadUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Download Report</a>
            </div>
          ` : ''}
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated report from FinTrak HASS</p>
        </div>
      </div>
    </div>
  `;
}

// System Alert Email Template
export function generateSystemAlertEmail(data: {
  alertType: string;
  message: string;
  details?: string;
  timestamp: Date;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
      <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #1F2937; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🔔 System Alert</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.alertType.replace(/_/g, ' ').toUpperCase()}</p>
        </div>
        
        <div style="padding: 20px;">
          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
            <p style="margin: 0; font-size: 16px; color: #92400E;">${data.message}</p>
          </div>
          
          ${data.details ? `
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 15px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;"><strong>Details:</strong></p>
              <pre style="margin: 10px 0 0 0; font-size: 12px; color: #374151; white-space: pre-wrap;">${data.details}</pre>
            </div>
          ` : ''}
          
          <p style="margin: 15px 0 0; color: #6b7280; font-size: 14px;"><strong>Timestamp:</strong> ${data.timestamp.toLocaleString()}</p>
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated alert from FinTrak HASS</p>
        </div>
      </div>
    </div>
  `;
}
