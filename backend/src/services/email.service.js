/**
 * Email service. Uses Nodemailer when SMTP credentials are configured; otherwise
 * falls back to logging the email to the console (handy for local development).
 */
const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;
if (env.mail.host && env.mail.user) {
  transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.port === 465,
    auth: { user: env.mail.user, pass: env.mail.pass },
  });
}

async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    logger.info(`[EMAIL:DEV] To: ${to} | Subject: ${subject}\n${text || html}`);
    return { mocked: true };
  }
  const info = await transporter.sendMail({ from: env.mail.from, to, subject, html, text });
  logger.info(`Email sent to ${to}: ${info.messageId}`);
  return info;
}

function passwordResetTemplate(name, resetUrl) {
  return {
    subject: 'HRMS - Reset your password',
    text: `Hi ${name}, reset your password using this link (valid 30 min): ${resetUrl}`,
    html: `<p>Hi ${name},</p><p>You requested a password reset. This link is valid for 30 minutes:</p>
           <p><a href="${resetUrl}">Reset Password</a></p>
           <p>If you didn't request this, you can ignore this email.</p>`,
  };
}

function welcomeTemplate(name, email, tempPassword, loginUrl) {
  return {
    subject: 'Welcome to HRMS',
    text: `Hi ${name}, your account is ready. Email: ${email} Temp password: ${tempPassword}. Login: ${loginUrl}`,
    html: `<p>Hi ${name},</p><p>Your HRMS account has been created.</p>
           <ul><li>Email: <b>${email}</b></li><li>Temporary password: <b>${tempPassword}</b></li></ul>
           <p><a href="${loginUrl}">Login here</a> and change your password.</p>`,
  };
}

module.exports = { sendEmail, passwordResetTemplate, welcomeTemplate };
