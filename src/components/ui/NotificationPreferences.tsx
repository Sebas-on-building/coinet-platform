import React from "react";
import { Card } from "./Card";

/**
 * NotificationPreferences lets users configure consent-related notifications.
 * Pixel-perfect, accessible, and extensible.
 */
export const NotificationPreferences: React.FC = () => (
  <Card className="p-4 rounded-2xl shadow-xl bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 mt-8">
    <h3 className="font-bold mb-2 text-yellow-900 dark:text-yellow-200">
      Notification Preferences
    </h3>
    <form className="space-y-3">
      <label className="flex items-center gap-2">
        <input type="checkbox" className="accent-yellow-500" />
        <span>Email me when a consent is expiring</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" className="accent-yellow-500" />
        <span>Push notification for revokes</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" className="accent-yellow-500" />
        <span>Weekly privacy summary</span>
      </label>
    </form>
  </Card>
);
