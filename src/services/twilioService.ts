import twilio from "twilio";

class TwilioService {
  private static instance: TwilioService;
  private client: twilio.Twilio;

  private constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  static getInstance(): TwilioService {
    if (!TwilioService.instance) {
      TwilioService.instance = new TwilioService();
    }
    return TwilioService.instance;
  }

  async sendSMS(to: string, message: string): Promise<void> {
    try {
      await this.client.messages.create({
        body: message,
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
      });
    } catch (error) {
      console.error("Failed to send SMS:", error);
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
    const message =
      `Reminder: ${event.title}\n\n` +
      `Description: ${event.description}\n` +
      `Start: ${event.startTime.toLocaleString()}\n` +
      `End: ${event.endTime.toLocaleString()}\n` +
      (event.location ? `Location: ${event.location}\n` : "");

    await this.sendSMS(to, message);
  }
}

export const twilioService = TwilioService.getInstance();
