const fs = require('fs');
const nodemailer = require('nodemailer');

function readJsonReport(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function buildEnvironmentSummary(envName, json) {
  if (!json) {
    return {
      status: '❌ FAILED',
      details: 'No test results found',
      passed: 0,
      failed: 1,
      total: 1,
    };
  }

  const stats = json?.stats || {};
  const passed = stats?.expected || 0;
  const failed = (stats?.unexpected || 0) + (stats?.flaky || 0);
  const total = passed + failed;

  return {
    status: failed === 0 ? '✅ PASSED' : '❌ FAILED',
    details: `${passed}/${total} tests passed`,
    passed,
    failed,
    total,
  };
}

function buildHealthCheckReport() {
  const {
    DEMO_URL = 'https://demo.certified.io',
    ETRAINING_URL = 'https://etraining45512.certified.io',
    ETRAINING_STAGE_URL = 'https://etraining-stage.certified.io',
    AIA_URL = 'https://aia45775.certified.io',
    AIA_STAGE_URL = 'https://aia-stage.certified.io',
    AIFT_URL = 'https://aift45665.certified.io',
    AIFT_STAGE_URL = 'https://aift-stage.certified.io',
  } = process.env;

  const environments = [
    {
      name: 'DEMO',
      file: 'report/demo-results.json',
      summaryFile: 'report/demo-summary.json',
      url: DEMO_URL,
      details: 'Validates 4 certification options in dropdown',
    },
    {
      name: 'ETRAINING',
      file: 'report/etraining-results.json',
      summaryFile: 'report/etraining-summary.json',
      url: ETRAINING_URL,
      details: 'Validates 3 certification cards (with subtitles)',
    },
    {
      name: 'ETRAINING-STAGE',
      file: 'report/etraining-stage-results.json',
      summaryFile: 'report/etraining-stage-summary.json',
      url: ETRAINING_STAGE_URL,
      details: 'Validates 3 certification cards (with subtitles)',
    },
    {
      name: 'AIA',
      file: 'report/aia-results.json',
      summaryFile: 'report/aia-summary.json',
      url: AIA_URL,
      details: 'Validates 6 certification options (BSB/CHC qualifications)',
    },
    {
      name: 'AIA-STAGE',
      file: 'report/aia-stage-results.json',
      summaryFile: 'report/aia-stage-summary.json',
      url: AIA_STAGE_URL,
      details: 'Validates 6 certification options (BSB/CHC qualifications)',
    },
    {
      name: 'AIFT',
      file: 'report/aift-results.json',
      summaryFile: 'report/aift-summary.json',
      url: AIFT_URL,
      details: 'Validates 4 certification options (Building & Construction)',
    },
    {
      name: 'AIFT-STAGE',
      file: 'report/aift-stage-results.json',
      summaryFile: 'report/aift-stage-summary.json',
      url: AIFT_STAGE_URL,
      details: 'Validates 4 certification options (Building & Construction)',
    },
  ];

  const results = environments.map((env) => {
    const json = readJsonReport(env.file);
    const summary = readJsonReport(env.summaryFile) || {};
    return {
      ...env,
      ...buildEnvironmentSummary(env.name, json),
      summary,
    };
  });

  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalTests = totalPassed + totalFailed;
  const overallStatus = totalFailed === 0 ? '✅ ALL SYSTEMS HEALTHY' : '❌ ISSUES DETECTED';

  const subject = `Certification Health Check (Frontend) - ${overallStatus} (${totalPassed}/${totalTests} tests passed)`;

  const html = `
    <h2>🔍 Daily Certification Health Check Report</h2>
    <p><strong>Overall Status:</strong> ${overallStatus}</p>
    <p><strong>Total Tests:</strong> ${totalTests} (${totalPassed} passed, ${totalFailed} failed)</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    
    <h3>Environment Status:</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <tr style="background-color: #f0f0f0;">
        <th>Environment</th>
        <th>Status</th>
        <th>Details</th>
        <th>URL</th>
        <th>Missing Certifications</th>
      </tr>
      ${results
        .map(
          (r) => `
        <tr>
          <td><strong>${r.name}</strong></td>
          <td>${r.status}</td>
          <td>${r.details}</td>
          <td>${r.url}</td>
          <td>${r.summary?.missingCertifications?.length ? r.summary.missingCertifications.join(', ') : 'None'}</td>
        </tr>
      `
        )
        .join('')}
    </table>
    
    <h3>Certification Validation Details:</h3>
    <ul>
      ${results
        .map(
          (r) => `
        <li>
          <strong>${r.name}:</strong> ${r.details}.<br/>
          Expected: ${r.summary?.expectedCertifications?.length || 0} |
          Detected: ${r.summary?.actualCertifications?.length || 0} |
          Missing: ${r.summary?.missingCertifications?.length || 0}<br/>
          ${
            r.summary?.missingCertifications?.length
              ? `<em>Missing certifications:</em> ${r.summary.missingCertifications.join(', ')}`
              : '<em>No missing certifications detected.</em>'
          }
        </li>
      `
        )
        .join('')}
    </ul>
    
    <p><em>This is an automated health check report. If any environment shows ❌ FAILED, please investigate the certification dropdown functionality.</em></p>
  `;

  return { subject, html, results };
}

async function main() {
  const { SMTP_HOST, SMTP_PORT = '587', SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_FROM || !MAIL_TO) {
    console.error('Missing SMTP or mail env vars.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const report = buildHealthCheckReport();

  const mailOptions = {
    from: MAIL_FROM,
    to: MAIL_TO.split(',').map((s) => s.trim()),
    subject: report.subject,
    html: report.html,
  };

  await transporter.sendMail(mailOptions);
  console.log('Health check report email sent');
  console.log('Summary:', report.results.map((r) => `${r.name}: ${r.status}`).join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
