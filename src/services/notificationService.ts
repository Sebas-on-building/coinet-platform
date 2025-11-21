import { toast } from "react-hot-toast";
import { emailService } from "./emailService";
import { firebaseService } from "./firebaseService";
import { twilioService } from "./twilioService";

export type NotificationType =
  | "push"
  | "email"
  | "sms"
  | "browser"
  | "telegram"
  | "discord"
  | "slack"
  | "teams";

export interface NotificationSettings {
  preferences: {
    push: NotificationPreferences;
    email: NotificationPreferences;
    sms: NotificationPreferences;
    browser: NotificationPreferences;
    telegram: NotificationPreferences;
    discord: NotificationPreferences;
    slack: NotificationPreferences;
    teams: NotificationPreferences;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  priority: {
    high: NotificationType[];
    medium: NotificationType[];
    low: NotificationType[];
  };
  severity: {
    critical: NotificationType[];
    important: NotificationType[];
    normal: NotificationType[];
  };
  pushToken?: string;
  email?: string;
  phoneNumber?: string;
  browserNotifications?: boolean;
  telegram: {
    enabled: boolean;
    chatId?: string;
  };
  discord: {
    enabled: boolean;
    webhookUrl?: string;
  };
}

export interface NotificationPreferences {
  enabled: boolean;
  beforeEvent: number;
  includePriceImpact: boolean;
  includeVolumeImpact: boolean;
  includeVolatilityImpact: boolean;
  includeSocialEngagement: boolean;
  includeComments: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  webhookUrl?: string;
  channelId?: string;
  teamId?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
}

interface ScheduledNotification {
  title: string;
  body: string;
  userId: string;
  type: NotificationType;
  data?: any;
  scheduledTime: Date;
}

class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings = {
    preferences: {
      push: {
        enabled: true,
        beforeEvent: 15,
        includePriceImpact: true,
        includeVolumeImpact: true,
        includeVolatilityImpact: true,
        includeSocialEngagement: true,
        includeComments: true,
        soundEnabled: true,
        vibrationEnabled: true,
      },
      email: {
        enabled: false,
        beforeEvent: 30,
        includePriceImpact: true,
        includeVolumeImpact: true,
        includeVolatilityImpact: true,
        includeSocialEngagement: true,
        includeComments: true,
        soundEnabled: false,
        vibrationEnabled: false,
      },
      sms: {
        enabled: false,
        beforeEvent: 5,
        includePriceImpact: true,
        includeVolumeImpact: false,
        includeVolatilityImpact: false,
        includeSocialEngagement: false,
        includeComments: false,
        soundEnabled: false,
        vibrationEnabled: true,
      },
      browser: {
        enabled: true,
        beforeEvent: 10,
        includePriceImpact: true,
        includeVolumeImpact: true,
        includeVolatilityImpact: true,
        includeSocialEngagement: true,
        includeComments: true,
        soundEnabled: true,
        vibrationEnabled: true,
      },
      telegram: {
        enabled: false,
        beforeEvent: 15,
        includePriceImpact: true,
        includeVolumeImpact: true,
        includeVolatilityImpact: true,
        includeSocialEngagement: true,
        includeComments: true,
        soundEnabled: false,
        vibrationEnabled: false,
      },
      discord: {
        enabled: false,
        beforeEvent: 15,
        includePriceImpact: true,
        includeVolumeImpact: true,
        includeVolatilityImpact: true,
        includeSocialEngagement: true,
        includeComments: true,
        soundEnabled: false,
        vibrationEnabled: false,
      },
      slack: {
        enabled: false,
        beforeEvent: 15,
        includePriceImpact: true,
        includeVolumeImpact: true,
        includeVolatilityImpact: true,
        includeSocialEngagement: true,
        includeComments: true,
        soundEnabled: false,
        vibrationEnabled: false,
      },
      teams: {
        enabled: false,
        beforeEvent: 15,
        includePriceImpact: true,
        includeVolumeImpact: true,
        includeVolatilityImpact: true,
        includeSocialEngagement: true,
        includeComments: true,
        soundEnabled: false,
        vibrationEnabled: false,
      },
    },
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
    },
    priority: {
      high: ["push", "sms"],
      medium: ["email", "browser", "telegram", "discord"],
      low: ["slack", "teams"],
    },
    severity: {
      critical: ["push", "sms", "email"],
      important: ["browser", "telegram", "discord"],
      normal: ["slack", "teams"],
    },
    telegram: {
      enabled: false,
    },
    discord: {
      enabled: false,
    },
  };

  private preferences: NotificationPreferences;

  private constructor() {
    // Initialize browser notifications
    if ("Notification" in window) {
      this.settings.browserNotifications =
        Notification.permission === "granted";
    }

    this.preferences = {
      enabled: true,
      beforeEvent: 10,
      includePriceImpact: true,
      includeVolumeImpact: true,
      includeVolatilityImpact: true,
      includeSocialEngagement: true,
      includeComments: true,
      soundEnabled: true,
      vibrationEnabled: true,
    };
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async getSettings(userId: string): Promise<NotificationSettings> {
    // In a real application, this would fetch from a database
    return this.settings;
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...settings,
      preferences: {
        ...this.settings.preferences,
        ...settings.preferences,
      },
      quietHours: {
        ...this.settings.quietHours,
        ...settings.quietHours,
      },
      priority: {
        ...this.settings.priority,
        ...settings.priority,
      },
      severity: {
        ...this.settings.severity,
        ...settings.severity,
      },
      telegram: {
        ...this.settings.telegram,
        ...settings.telegram,
      },
      discord: {
        ...this.settings.discord,
        ...settings.discord,
      },
    };

    // Save to backend
    try {
      await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.settings),
      });
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      toast.error("Failed to save notification settings");
    }
  }

  async updateNotificationPreferences(
    userId: string,
    type: NotificationType,
    preferences: Partial<NotificationSettings["preferences"][NotificationType]>,
  ): Promise<void> {
    this.settings.preferences[type] = {
      ...this.settings.preferences[type],
      ...preferences,
    };
  }

  async requestPushPermission(): Promise<string | null> {
    if (!("Notification" in window)) {
      toast.error("Push notifications are not supported in this browser");
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const token = await firebaseService.requestNotificationPermission();
        if (token) {
          await this.updateSettings({
            pushToken: token,
            preferences: {
              ...this.settings.preferences,
              push: {
                ...this.settings.preferences.push,
                enabled: true,
              },
            },
          });
        }
        return token;
      } else {
        toast.error("Push notification permission denied");
        return null;
      }
    } catch (error) {
      console.error("Error requesting push permission:", error);
      toast.error("Failed to request push notification permission");
      return null;
    }
  }

  private generateNotificationContent(
    title: string,
    body: string,
    data: any,
    preferences: NotificationPreferences,
  ): { title: string; body: string } {
    let content = { title, body };

    if (preferences.includePriceImpact && data.priceImpact) {
      content.body += `\nPrice Impact: ${data.priceImpact}%`;
    }

    if (preferences.includeVolumeImpact && data.volumeImpact) {
      content.body += `\nVolume Impact: ${data.volumeImpact}%`;
    }

    if (preferences.includeVolatilityImpact && data.volatilityImpact) {
      content.body += `\nVolatility Impact: ${data.volatilityImpact}%`;
    }

    if (preferences.includeSocialEngagement && data.socialEngagement) {
      content.body += `\nSocial Engagement: ${data.socialEngagement}`;
    }

    if (preferences.includeComments && data.comments) {
      content.body += `\nComments: ${data.comments.length}`;
    }

    return content;
  }

  async sendNotification(
    titleOrPayload: string | NotificationPayload,
    body?: string,
    data?: any,
    type: NotificationType = "push",
  ): Promise<void> {
    let title: string;
    let notificationBody: string;
    let notificationData: any;
    let notificationType: NotificationType;

    if (typeof titleOrPayload === "string") {
      title = titleOrPayload;
      notificationBody = body || "";
      notificationData = data;
      notificationType = type;
    } else {
      title = titleOrPayload.title;
      notificationBody = titleOrPayload.body;
      notificationData = titleOrPayload.data;
      notificationType = titleOrPayload.type;
    }

    const preferences = this.settings.preferences[notificationType];
    if (!preferences.enabled) {
      return;
    }

    if (this.isInQuietHours()) {
      const priority = this.getNotificationPriority(notificationType);
      if (priority !== "high") {
        return;
      }
    }

    const content = this.generateNotificationContent(
      title,
      notificationBody,
      notificationData,
      preferences,
    );

    switch (notificationType) {
      case "push":
        if (this.settings.pushToken) {
          // This would typically be handled by your backend
          console.log(
            "Push notification would be sent to:",
            this.settings.pushToken,
          );
        }
        break;
      case "email":
        if (this.settings.email) {
          await emailService.sendEventReminder(this.settings.email, {
            title: content.title,
            description: content.body,
            startTime: new Date(),
            endTime: new Date(),
          });
        }
        break;
      case "sms":
        if (this.settings.phoneNumber) {
          await twilioService.sendEventReminder(this.settings.phoneNumber, {
            title: content.title,
            description: content.body,
            startTime: new Date(),
            endTime: new Date(),
          });
        }
        break;
      case "browser":
        if (this.settings.browserNotifications && "Notification" in window) {
          const notification = new Notification(content.title, {
            body: content.body,
            icon: "/icon.png",
            badge: "/badge.png",
            data: notificationData,
            requireInteraction: true,
            silent: !this.settings.browserNotifications,
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
        break;
      case "telegram":
        if (this.settings.telegram.enabled && this.settings.telegram.chatId) {
          // In a real application, this would send a message through the Telegram Bot API
          console.log("Sending Telegram notification:", content);
        }
        break;
      case "discord":
        if (this.settings.discord.enabled && this.settings.discord.webhookUrl) {
          // In a real application, this would send a message through Discord's webhook
          console.log("Sending Discord notification:", content);
        }
        break;
      case "slack":
        if (preferences.webhookUrl && preferences.channelId) {
          await this.sendSlackNotification(
            content.title,
            content.body,
            notificationData,
            preferences.webhookUrl,
            preferences.channelId,
          );
        }
        break;
      case "teams":
        if (preferences.webhookUrl && preferences.teamId) {
          await this.sendTeamsNotification(
            content.title,
            content.body,
            notificationData,
            preferences.webhookUrl,
            preferences.teamId,
          );
        }
        break;
    }
  }

  private getNotificationPriority(
    type: NotificationType,
  ): "high" | "medium" | "low" {
    if (this.settings.priority.high.includes(type)) return "high";
    if (this.settings.priority.medium.includes(type)) return "medium";
    return "low";
  }

  private isInQuietHours(): boolean {
    const now = new Date();
    const quietHours = this.settings.quietHours;
    const start = new Date(
      now.toISOString().split("T")[0] + "T" + quietHours.start,
    );
    const end = new Date(
      now.toISOString().split("T")[0] + "T" + quietHours.end,
    );
    return now >= start && now <= end;
  }

  async sendSlackNotification(
    title: string,
    body: string,
    data: any,
    webhookUrl: string,
    channelId: string,
  ): Promise<void> {
    if (!this.settings.preferences.slack.enabled) {
      return;
    }

    try {
      const message = {
        channel: channelId,
        text: title,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: title,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: body,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Event Type: ${data.type}`,
              },
            ],
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error("Failed to send Slack notification");
      }
    } catch (error) {
      console.error("Error sending Slack notification:", error);
      toast.error("Failed to send Slack notification");
    }
  }

  async sendTeamsNotification(
    title: string,
    body: string,
    data: any,
    webhookUrl: string,
    teamId: string,
  ): Promise<void> {
    if (!this.settings.preferences.teams.enabled) {
      return;
    }

    try {
      const message = {
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              type: "AdaptiveCard",
              version: "1.0",
              body: [
                {
                  type: "TextBlock",
                  size: "Large",
                  weight: "Bolder",
                  text: title,
                },
                {
                  type: "TextBlock",
                  text: body,
                  wrap: true,
                },
                {
                  type: "FactSet",
                  facts: [
                    {
                      title: "Event Type",
                      value: data.type,
                    },
                  ],
                },
              ],
              actions: [
                {
                  type: "Action.OpenUrl",
                  title: "View Details",
                  url: data.url,
                },
              ],
            },
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error("Failed to send Teams notification");
      }
    } catch (error) {
      console.error("Error sending Teams notification:", error);
      toast.error("Failed to send Teams notification");
    }
  }
}

export const notificationService = NotificationService.getInstance();
