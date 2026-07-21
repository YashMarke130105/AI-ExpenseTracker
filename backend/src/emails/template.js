/**
 * Ported from emails/template.jsx.
 * The original used @react-email/components (JSX) rendered by Resend's
 * `react` option. Express has no React renderer, so the same visual
 * structure/styles are reproduced here as a plain HTML string generator.
 * Call sites (`sendEmail({ to, subject, html })`) pass the returned string
 * instead of a React element.
 */

const styles = {
  body: "background-color:#f6f9fc;font-family:-apple-system, sans-serif;",
  container:
    "background-color:#ffffff;margin:0 auto;padding:20px;border-radius:5px;box-shadow:0 2px 4px rgba(0,0,0,0.1);max-width:600px;",
  title: "color:#1f2937;font-size:32px;font-weight:bold;text-align:center;margin:0 0 20px;",
  heading: "color:#1f2937;font-size:20px;font-weight:600;margin:0 0 16px;",
  text: "color:#4b5563;font-size:16px;margin:0 0 16px;",
  section:
    "margin-top:32px;padding:20px;background-color:#f9fafb;border-radius:5px;border:1px solid #e5e7eb;",
  statsContainer: "margin:32px 0;padding:20px;background-color:#f9fafb;border-radius:5px;",
  stat:
    "margin-bottom:16px;padding:12px;background-color:#fff;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,0.05);",
  row:
    "display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e5e7eb;",
  footer:
    "color:#6b7280;font-size:14px;text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;",
};

function monthlyReportTemplate(userName, data) {
  const { stats, month, insights } = data;
  const net = stats.totalIncome - stats.totalExpenses;

  const categoryRows = Object.entries(stats.byCategory || {})
    .map(
      ([category, amount]) =>
        `<div style="${styles.row}"><span style="${styles.text}">${category}</span><span style="${styles.text}">$${amount}</span></div>`
    )
    .join("");

  const insightRows = (insights || [])
    .map((insight) => `<p style="${styles.text}">• ${insight}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>Monthly Financial Report</title></head>
<body style="${styles.body}">
  <div style="${styles.container}">
    <h1 style="${styles.title}">Monthly Financial Report</h1>
    <p style="${styles.text}">Hello ${userName},</p>
    <p style="${styles.text}">Here's your financial summary for ${month}:</p>
    <div style="${styles.statsContainer}">
      <div style="${styles.stat}"><p style="${styles.text}">Total Income</p><p style="${styles.heading}">$${stats.totalIncome}</p></div>
      <div style="${styles.stat}"><p style="${styles.text}">Total Expenses</p><p style="${styles.heading}">$${stats.totalExpenses}</p></div>
      <div style="${styles.stat}"><p style="${styles.text}">Net</p><p style="${styles.heading}">$${net}</p></div>
    </div>
    <div style="${styles.section}">
      <h2 style="${styles.heading}">Expenses by Category</h2>
      ${categoryRows}
    </div>
    <div style="${styles.section}">
      <h2 style="${styles.heading}">Welth Insights</h2>
      ${insightRows}
    </div>
    <p style="${styles.footer}">Thank you for using Welth. Keep tracking your finances for better financial health!</p>
  </div>
</body>
</html>`;
}

function budgetAlertTemplate(userName, data) {
  const { percentageUsed, budgetAmount, totalExpenses } = data;
  const remaining = budgetAmount - totalExpenses;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>Budget Alert</title></head>
<body style="${styles.body}">
  <div style="${styles.container}">
    <h1 style="${styles.title}">Budget Alert</h1>
    <p style="${styles.text}">Hello ${userName},</p>
    <p style="${styles.text}">You've used ${Number(percentageUsed).toFixed(1)}% of your monthly budget.</p>
    <div style="${styles.statsContainer}">
      <div style="${styles.stat}"><p style="${styles.text}">Budget Amount</p><p style="${styles.heading}">$${budgetAmount}</p></div>
      <div style="${styles.stat}"><p style="${styles.text}">Spent So Far</p><p style="${styles.heading}">$${totalExpenses}</p></div>
      <div style="${styles.stat}"><p style="${styles.text}">Remaining</p><p style="${styles.heading}">$${remaining}</p></div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Equivalent of the default export `EmailTemplate({ userName, type, data })`.
 */
function renderEmailTemplate({ userName = "", type = "monthly-report", data = {} }) {
  if (type === "monthly-report") return monthlyReportTemplate(userName, data);
  if (type === "budget-alert") return budgetAlertTemplate(userName, data);
  return "";
}

module.exports = { renderEmailTemplate };
