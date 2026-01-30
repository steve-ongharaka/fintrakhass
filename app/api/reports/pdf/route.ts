import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportData, reportType, title } = await request.json();

    // Generate HTML from report data
    const html = generateReportHTML(reportData, reportType, title);

    // Step 1: Create the PDF generation request
    const createResponse = await fetch(
      'https://apps.abacus.ai/api/createConvertHtmlToPdfRequest',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deployment_token: process.env.ABACUSAI_API_KEY,
          html_content: html,
          pdf_options: {
            format: 'A4',
            print_background: true,
            margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
          },
          base_url: process.env.NEXTAUTH_URL || '',
        }),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse
        .json()
        .catch(() => ({ error: 'Failed to create PDF request' }));
      return NextResponse.json(
        { success: false, error: error.error },
        { status: 500 }
      );
    }

    const { request_id } = await createResponse.json();
    if (!request_id) {
      return NextResponse.json(
        { success: false, error: 'No request ID returned' },
        { status: 500 }
      );
    }

    // Step 2: Poll for status until completion
    const maxAttempts = 300; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await fetch(
        'https://apps.abacus.ai/api/getConvertHtmlToPdfStatus',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request_id: request_id,
            deployment_token: process.env.ABACUSAI_API_KEY,
          }),
        }
      );

      const statusResult = await statusResponse.json();
      const status = statusResult?.status || 'FAILED';
      const result = statusResult?.result || null;

      if (status === 'SUCCESS') {
        if (result && result.result) {
          const pdfBuffer = Buffer.from(result.result, 'base64');
          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${title || 'report'}.pdf"`,
            },
          });
        } else {
          return NextResponse.json(
            { success: false, error: 'PDF generation completed but no result data' },
            { status: 500 }
          );
        }
      } else if (status === 'FAILED') {
        const errorMsg = result?.error || 'PDF generation failed';
        return NextResponse.json(
          { success: false, error: errorMsg },
          { status: 500 }
        );
      }
      attempts++;
    }

    return NextResponse.json(
      { success: false, error: 'PDF generation timed out' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

function generateReportHTML(
  reportData: any,
  reportType: string,
  title: string
): string {
  const now = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let dataTableHTML = '';

  if (reportType === 'production_summary' && reportData.data) {
    dataTableHTML = `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Well</th>
            <th>Field</th>
            <th>Oil (bbl)</th>
            <th>Gas (scf)</th>
            <th>Water (bbl)</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.data.map((d: any) => `
            <tr>
              <td>${new Date(d.productionDate).toLocaleDateString()}</td>
              <td>${d.well.wellName}</td>
              <td>${d.well.field || 'N/A'}</td>
              <td>${Math.round(d.grossOilVolume || 0).toLocaleString()}</td>
              <td>${Math.round(d.grossGasVolume || 0).toLocaleString()}</td>
              <td>${Math.round(d.grossWaterVolume || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (reportType === 'well_performance' && reportData.data) {
    dataTableHTML = `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Well</th>
            <th>Efficiency (%)</th>
            <th>Uptime (hrs)</th>
            <th>Decline Rate (%)</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.data.map((d: any) => `
            <tr>
              <td>${new Date(d.metricDate).toLocaleDateString()}</td>
              <td>${d.well.wellName}</td>
              <td>${(d.efficiency || 0).toFixed(1)}</td>
              <td>${(d.uptime || 0).toFixed(1)}</td>
              <td>${(d.declineRate || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (reportType === 'field_analysis' && reportData.data) {
    dataTableHTML = `
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Wells</th>
            <th>Total Oil (bbl)</th>
            <th>Total Gas (scf)</th>
            <th>Total Water (bbl)</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.data.map((d: any) => `
            <tr>
              <td>${d.field}</td>
              <td>${d.wellCount}</td>
              <td>${d.totalOil.toLocaleString()}</td>
              <td>${d.totalGas.toLocaleString()}</td>
              <td>${d.totalWater.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1e40af;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .header .subtitle {
            color: #64748b;
            font-size: 14px;
          }
          .summary-box {
            background: #f1f5f9;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 20px 0;
          }
          .summary-box h3 {
            margin: 0 0 10px 0;
            color: #1e40af;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .summary-item {
            background: white;
            padding: 10px;
            border-radius: 5px;
          }
          .summary-item .label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
          }
          .summary-item .value {
            font-size: 20px;
            font-weight: bold;
            color: #1e40af;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background: linear-gradient(to right, #3b82f6, #6366f1);
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          tr:hover {
            background: #f8fafc;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title || 'FINTRAK HASS Report'}</h1>
          <div class="subtitle">Generated on ${now}</div>
        </div>

        ${reportData.summary ? `
          <div class="summary-box">
            <h3>Summary Statistics</h3>
            <div class="summary-grid">
              ${Object.entries(reportData.summary).map(([key, value]) => `
                <div class="summary-item">
                  <div class="label">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div class="value">${typeof value === 'number' ? value.toLocaleString() : value}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${dataTableHTML}

        <div class="footer">
          <p>FINTRAK HASS - Hydrocarbon Accounting & Surveillance System</p>
          <p>This is a system-generated report. For questions, contact your administrator.</p>
        </div>
      </body>
    </html>
  `;
}
