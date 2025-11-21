import nodemailer from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;

  private constructor() {
    // Initialize with your email service configuration
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    });
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@coinet.com",
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }

  async sendEventReminder(
    to: string,
    event: {
      title: string;
      description: string;
      startTime: Date;
      endTime: Date;
      location?: string;
    },
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Event Reminder</h2>
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0;">${event.title}</h3>
          <p style="margin: 0 0 10px 0;">${event.description}</p>
          <div style="margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Start:</strong> ${event.startTime.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>End:</strong> ${event.endTime.toLocaleString()}</p>
            ${event.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${event.location}</p>` : ""}
          </div>
        </div>
        <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
          This is an automated reminder for your upcoming event.
        </p>
      </div>
    `;

    await this.sendEmail(to, `Reminder: ${event.title}`, html);
  }
}

export const emailService = EmailService.getInstance();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail({
  to,
  otp,
  expiry = 600,
}: {
  to: string;
  otp: string;
  expiry?: number;
}) {
  const subject = "Verify your Coinet account";
  const html = `
    <div style="font-family: 'Inter', 'San Francisco', Arial, sans-serif; background: linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%); padding: 32px; border-radius: 16px; max-width: 480px; margin: 0 auto; box-shadow: 0 8px 32px rgba(0,0,0,0.08);">
      <h2 style="color: #3b82f6; font-size: 2rem; margin-bottom: 8px;">Welcome to Coinet</h2>
      <p style="font-size: 1.1rem; color: #374151; margin-bottom: 24px;">To complete your registration, please verify your email address using the code below:</p>
      <div style="font-size: 2.5rem; font-weight: bold; letter-spacing: 0.3em; color: #6366f1; background: #f1f5f9; padding: 16px 0; border-radius: 12px; margin-bottom: 24px; text-align: center;">${otp}</div>
      <p style="color: #64748b; font-size: 1rem; margin-bottom: 16px;">This code will expire in <b>${Math.floor(expiry / 60)} minutes</b>. If you did not request this, you can safely ignore this email.</p>
      <a href="#" style="display: inline-block; background: linear-gradient(90deg, #6366f1 0%, #3b82f6 100%); color: #fff; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 1.1rem; margin-bottom: 24px;">Verify Now</a>
      <p style="color: #94a3b8; font-size: 0.95rem; margin-top: 32px;">Need help? <a href="mailto:support@coinet.com" style="color: #3b82f6; text-decoration: underline;">Contact support</a></p>
    </div>
  `;
  await transporter.sendMail({
    from: `Coinet <no-reply@coinet.com>`,
    to,
    subject,
    html,
  });
}
