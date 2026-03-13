import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.portal.canstarlight.ca",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true, // SSL on port 465
  auth: {
    user: process.env.SMTP_USER || "notification@portal.canstarlights.ca",
    pass: process.env.SMTP_PASS || "notification@portal.canstarlights.ca",
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
    from: '"CanStar Lights" <notification@portal.canstarlights.ca>',
    to,
    subject,
    html,
  };
  if (cc) mailOptions.cc = cc;
  return transporter.sendMail(mailOptions);
};
