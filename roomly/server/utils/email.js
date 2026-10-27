const nodemailer = require('nodemailer');

let transporter;
const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.EMAIL_HOST) return null;
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return transporter;
};

// Never throws: email problems must not break the booking flow.
module.exports = async ({ to, subject, html }) => {
  const t = getTransporter();
  if (!t) return console.log(`[email not configured] to=${to} subject="${subject}"`);
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM || 'Roomly <no-reply@roomly.test>', to, subject, html });
  } catch (e) {
    console.error('Email failed:', e.message);
  }
};
