const { Resend } = require("resend");

// Ported 1:1 from actions/send-email.js. `react` (a React element) is
// replaced with `html` (a plain HTML string) since there's no React
// renderer in an Express backend - see src/emails/template.js.
async function sendEmail({ to, subject, html }) {
  const resend = new Resend(process.env.RESEND_API_KEY || "");

  try {
    const data = await resend.emails.send({
      from: "Finance App <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}

module.exports = { sendEmail };
