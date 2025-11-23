import React, { useState, useEffect } from "react";
import { notificationService } from "../services/notificationService";
import { toast } from "react-hot-toast";
import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";

interface NotificationPreferencesProps {
  userId: string;
}

export const NotificationPreferences: React.FC<
  NotificationPreferencesProps
> = ({ userId }) => {
  const [settings, setSettings] = useState({
    email: "",
    phoneNumber: "",
    browserNotifications: false,
    pushNotifications: false,
    pushToken: "",
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const currentSettings = await notificationService.getSettings(userId);
      setSettings(currentSettings);
    } catch (error) {
      toast.error("Failed to load notification settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await notificationService.updateSettings(userId, settings);
      toast.success("Notification settings updated successfully");
    } catch (error) {
      toast.error("Failed to update notification settings");
    }
  };

  const handleRequestPushPermission = async () => {
    try {
      const token = await notificationService.requestPushPermission();
      if (token) {
        setSettings({ ...settings, pushToken: token, pushNotifications: true });
        toast.success("Push notifications enabled");
      }
    } catch (error) {
      toast.error("Failed to enable push notifications");
    }
  };

  const handleRequestBrowserPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setSettings({ ...settings, browserNotifications: true });
        toast.success("Browser notifications enabled");
      }
    } catch (error) {
      toast.error("Failed to enable browser notifications");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-6">Notification Preferences</h3>

      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium mb-2">Email Notifications</h4>
            <input
              type="email"
              value={settings.email}
              onChange={(e) =>
                setSettings({ ...settings, email: e.target.value })
              }
              placeholder="Enter your email address"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Smartphone className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium mb-2">SMS Notifications</h4>
            <input
              type="tel"
              value={settings.phoneNumber}
              onChange={(e) =>
                setSettings({ ...settings, phoneNumber: e.target.value })
              }
              placeholder="Enter your phone number"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Browser Notifications */}
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Bell className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium mb-2">Browser Notifications</h4>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRequestBrowserPermission}
                disabled={settings.browserNotifications}
                className={`px-4 py-2 rounded-md ${
                  settings.browserNotifications
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                }`}
              >
                {settings.browserNotifications ? "Enabled" : "Enable"}
              </button>
              {settings.browserNotifications && (
                <span className="text-sm text-green-600">✓ Enabled</span>
              )}
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <MessageSquare className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium mb-2">Push Notifications</h4>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRequestPushPermission}
                disabled={settings.pushNotifications}
                className={`px-4 py-2 rounded-md ${
                  settings.pushNotifications
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                }`}
              >
                {settings.pushNotifications ? "Enabled" : "Enable"}
              </button>
              {settings.pushNotifications && (
                <span className="text-sm text-green-600">✓ Enabled</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveSettings}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
