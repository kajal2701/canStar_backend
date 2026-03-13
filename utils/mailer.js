import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // TLS on port 587
  auth: {
    user: process.env.SMTP_USER || "notifications@canstarlights.ca",
    pass: process.env.SMTP_PASS || "tocz azws eune bcvm",
  },
});

/**
 * Send an email
 * @param {object} options
 * @param {string} options.to
 * @param {string} [options.cc]
 * @param {string} options.subject
 * @param {string} options.html
 */
export const sendMail = async ({ to, cc, subject, html }) => {
  const mailOptions = {
    from: '"CanStar Lights" <notifications@canstarlights.ca>',
    to,
    subject,
    html,
  };
  if (cc) mailOptions.cc = cc;
  const info = await transporter.sendMail(mailOptions);
  console.log(`[MAIL] Sent to=${to} subject="${subject}" messageId=${info.messageId}`);
  return info;
};

// Verify SMTP connection — call once on server start or from test route
export const verifyMailer = () =>
  transporter.verify().then(() => {
    console.log("[MAIL] SMTP connection OK");
    return true;
  });
