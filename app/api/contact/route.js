import axios from 'axios';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Ensure this route runs on the Node.js runtime (required for Nodemailer)
export const runtime = 'nodejs';

// Create and configure Nodemailer transporter (deferred until used)
function getTransporter() {
  const user = process.env.EMAIL_ADDRESS;
  const pass = process.env.GMAIL_PASSKEY;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS on 587
    auth: { user, pass },
  });
}

// Helper function to send a message via Telegram
async function sendTelegramMessage(token, chat_id, message) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await axios.post(url, {
      text: message,
      chat_id,
    });
    return res.data.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error.response?.data || error.message);
    return false;
  }
};

// HTML email template
const generateEmailTemplate = (name, email, userMessage) => `
  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #007BFF;">New Message Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <blockquote style="border-left: 4px solid #007BFF; padding-left: 10px; margin-left: 0;">
        ${userMessage}
      </blockquote>
      <p style="font-size: 12px; color: #888;">Click reply to respond to the sender.</p>
    </div>
  </div>
`;

// Helper function to send an email via Nodemailer
async function sendEmail(payload, message) {
  const { name, email, message: userMessage } = payload;
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, reason: 'missing_email_env' };
  }

  const recipient = process.env.EMAIL_ADDRESS || 'amnas7571@gmail.com';
  const mailOptions = {
    from: `"Portfolio" <${process.env.EMAIL_ADDRESS}>`, 
    to: recipient, 
    subject: `New Message From ${name}`, 
    text: message, 
    html: generateEmailTemplate(name, email, userMessage), 
    replyTo: email, 
  };

  try {
    await transporter.sendMail(mailOptions);
    return { ok: true };
  } catch (error) {
    console.error('Error while sending email:', error.message);
    return { ok: false, reason: 'smtp_error', detail: error.message };
  }
};

export async function POST(request) {
  try {
    const payload = await request.json();
    const { name, email, message: userMessage } = payload || {};

    // Basic validation (server-side)
    if (!name || !email || !userMessage) {
      return NextResponse.json({
        success: false,
        message: 'Name, email, and message are required.',
      }, { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat_id = process.env.TELEGRAM_CHAT_ID;

    const message = `New message from ${name}\n\nEmail: ${email}\n\nMessage:\n\n${userMessage}\n\n`;

    // Try Telegram only if credentials exist
    let telegramSuccess = false;
    if (token && chat_id) {
      telegramSuccess = await sendTelegramMessage(token, chat_id, message);
    }

    // Attempt email if SMTP envs are configured
    const emailResult = await sendEmail(payload, message);
    const emailSuccess = !!emailResult?.ok;

    if (telegramSuccess || emailSuccess) {
      return NextResponse.json({
        success: true,
        message: 'Message sent successfully.',
        channels: { telegram: telegramSuccess, email: emailSuccess },
      }, { status: 200 });
    }

    // Provide actionable error if neither channel is configured/working
    const missingTelegram = !token || !chat_id;
    const missingEmail = emailResult?.reason === 'missing_email_env';
    const smtpError = emailResult?.reason === 'smtp_error' ? emailResult?.detail : undefined;

    let reason = 'Failed to send via Telegram and Email.';
    if (missingTelegram && missingEmail) {
      reason = 'No messaging channel configured. Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID or EMAIL_ADDRESS + GMAIL_PASSKEY.';
    } else if (smtpError) {
      reason = `Email send failed: ${smtpError}`;
    }

    return NextResponse.json({ success: false, message: reason }, { status: 500 });
  } catch (error) {
    console.error('API Error:', error.message);
    return NextResponse.json({
      success: false,
      message: 'Server error occurred.',
    }, { status: 500 });
  }
};
