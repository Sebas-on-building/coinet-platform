import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// --- Modular HTML Template Generators ---
function onboardingTemplate(userName: string, step: string, ctaLink: string) {
  return `<div style="font-family:SF Pro Display,Inter,Roboto,sans-serif;padding:2rem;background:#f9f9fb;border-radius:16px;max-width:520px;margin:auto;box-shadow:0 2px 24px rgba(0,0,0,0.10)">
    <h2 style="color:#0A84FF;margin-bottom:0.5rem">Welcome, ${userName}!</h2>
    <p style="font-size:1.1rem;color:#222">Step <b>${step}</b> of your Coinet onboarding is ready. Let's get you started with the best experience in crypto.</p>
    <a href="${ctaLink}" style="display:inline-block;padding:14px 28px;background:#0A84FF;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;margin:1.5rem 0;font-size:1rem;box-shadow:0 1px 8px #0A84FF22">Continue Onboarding</a>
    <p style="font-size:12px;color:#888">Need help? Our team is here for you 24/7.</p>
    <div style="margin-top:2rem;font-size:11px;color:#aaa">Coinet &copy; ${new Date().getFullYear()}</div>
  </div>`;
}

function referralTemplate(referrer: string, referralLink: string) {
  return `<div style="font-family:SF Pro Display,Inter,Roboto,sans-serif;padding:2rem;background:#e6f7ff;border-radius:16px;max-width:520px;margin:auto;box-shadow:0 2px 24px rgba(10,132,255,0.10)">
    <h2 style="color:#30C9A7">${referrer} invited you to Coinet!</h2>
    <p style="font-size:1.1rem;color:#222">Join Coinet and both of you will earn exclusive rewards. Experience the future of trading, analytics, and portfolio management.</p>
    <a href="${referralLink}" style="display:inline-block;padding:14px 28px;background:#30C9A7;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;margin:1.5rem 0;font-size:1rem;box-shadow:0 1px 8px #30C9A722">Accept Invite</a>
    <p style="font-size:12px;color:#888">Questions? Just reply to this email.</p>
    <div style="margin-top:2rem;font-size:11px;color:#aaa">Coinet &copy; ${new Date().getFullYear()}</div>
  </div>`;
}

function adminNotificationTemplate(subject: string, message: string) {
  return `<div style="font-family:SF Pro Display,Inter,Roboto,sans-serif;padding:2rem;background:#fffbe6;border-radius:16px;max-width:520px;margin:auto;box-shadow:0 2px 24px rgba(255,45,85,0.10)">
    <h2 style="color:#FF2D55">Admin Notification</h2>
    <h3 style="color:#222">${subject}</h3>
    <p style="font-size:1.1rem;color:#222">${message}</p>
    <div style="margin-top:2rem;font-size:11px;color:#aaa">Coinet &copy; ${new Date().getFullYear()}</div>
  </div>`;
}

function analyticsReportTemplate(userName: string, reportSummary: string, dashboardLink: string) {
  return `<div style="font-family:SF Pro Display,Inter,Roboto,sans-serif;padding:2rem;background:#f4f8fb;border-radius:16px;max-width:520px;margin:auto;box-shadow:0 2px 24px rgba(0,0,0,0.10)">
    <h2 style="color:#6366F1">Your Weekly Analytics Report</h2>
    <p style="font-size:1.1rem;color:#222">Hi ${userName}, here's a summary of your portfolio and trading analytics:</p>
    <div style="background:#fff;padding:1rem 1.5rem;border-radius:10px;margin:1rem 0;font-size:1rem;color:#333;box-shadow:0 1px 8px #6366F122">${reportSummary}</div>
    <a href="${dashboardLink}" style="display:inline-block;padding:14px 28px;background:#6366F1;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;margin:1.5rem 0;font-size:1rem;box-shadow:0 1px 8px #6366F122">View Full Dashboard</a>
    <p style="font-size:12px;color:#888">Want more insights? Explore your analytics dashboard.</p>
    <div style="margin-top:2rem;font-size:11px;color:#aaa">Coinet &copy; ${new Date().getFullYear()}</div>
  </div>`;
}

// --- Email Senders ---
export async function sendOnboardingEmail(to: string, userName: string, step: string, ctaLink: string) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@coinet.com',
    to,
    subject: `Welcome to Coinet: Onboarding Step ${step}`,
    html: onboardingTemplate(userName, step, ctaLink),
  });
}

export async function sendReferralEmail(to: string, referrer: string, referralLink: string) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@coinet.com',
    to,
    subject: `${referrer} invited you to Coinet!`,
    html: referralTemplate(referrer, referralLink),
  });
}

export async function sendAdminNotificationEmail(to: string, subject: string, message: string) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@coinet.com',
    to,
    subject: `Admin Notification: ${subject}`,
    html: adminNotificationTemplate(subject, message),
  });
}

export async function sendAnalyticsReportEmail(to: string, userName: string, reportSummary: string, dashboardLink: string) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@coinet.com',
    to,
    subject: `Your Weekly Analytics Report`,
    html: analyticsReportTemplate(userName, reportSummary, dashboardLink),
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@coinet.com',
    to,
    subject: 'Coinet Password Reset',
    html: `<div style="font-family:SF Pro Display,Inter,Roboto,sans-serif;padding:2rem;background:#f9f9fb;border-radius:12px;max-width:480px;margin:auto;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
      <h2 style="color:#0A84FF">Reset your Coinet password</h2>
      <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
      <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#0A84FF;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:1rem 0">Reset Password</a>
      <p style="font-size:12px;color:#888">If you did not request this, you can ignore this email.</p>
      <div style="margin-top:2rem;font-size:11px;color:#aaa">Coinet &copy; ${new Date().getFullYear()}</div>
    </div>`,
  });
  return info;
}

export async function sendWelcomeEmail(to: string, userName: string) {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@coinet.com',
    to,
    subject: 'Welcome to Coinet!',
    html: `<div style="font-family:SF Pro Display,Inter,Roboto,sans-serif;padding:2rem;background:#f9f9fb;border-radius:12px;max-width:480px;margin:auto;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
      <h2 style="color:#0A84FF">Welcome, ${userName}!</h2>
      <p>Thank you for joining <b>Coinet</b>. Your account is now active and you can start exploring all our features.</p>
      <a href="${process.env.FRONTEND_URL || 'https://coinet.com'}" style="display:inline-block;padding:12px 24px;background:#0A84FF;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:1rem 0">Go to Dashboard</a>
      <p style="font-size:12px;color:#888">If you have any questions, just reply to this email.</p>
      <div style="margin-top:2rem;font-size:11px;color:#aaa">Coinet &copy; ${new Date().getFullYear()}</div>
    </div>`,
  });
  return info;
}

export async function send2FAEmail(to: string, code: string) {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@coinet.com',
    to,
    subject: 'Your Coinet 2FA Code',
    html: `<div style="font-family:SF Pro Display,Inter,Roboto,sans-serif;padding:2rem;background:#f9f9fb;border-radius:12px;max-width:480px;margin:auto;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
      <h2 style="color:#0A84FF">Your 2FA Code</h2>
      <p>Use the following code to complete your login or security action:</p>
      <div style="font-size:2rem;font-weight:700;letter-spacing:0.2em;background:#fff;padding:1rem 2rem;border-radius:8px;border:1px solid #eee;display:inline-block;margin:1rem 0;color:#0A84FF">${code}</div>
      <p style="font-size:12px;color:#888">If you did not request this, you can ignore this email.</p>
      <div style="margin-top:2rem;font-size:11px;color:#aaa">Coinet &copy; ${new Date().getFullYear()}</div>
    </div>`,
  });
  return info;
}

export async function sendAlertEmail(to: string, subject: string, message: string) {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@coinet.com',
    to,
    subject: subject,
    html: `<div style="font-family:SF Pro Display,Inter,Roboto,sans-serif;padding:2rem;background:#fffbe6;border-radius:12px;max-width:480px;margin:auto;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
      <h2 style="color:#FF2D55">Alert from Coinet</h2>
      <p>${message}</p>
      <div style="margin-top:2rem;font-size:11px;color:#aaa">Coinet &copy; ${new Date().getFullYear()}</div>
    </div>`,
  });
  return info;
} 