import React, { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Filter,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Notification {
  id: string;
  type: "email" | "push" | "sms" | "browser";
  title: string;
  message: string;
  timestamp: Date;
  status: "sent" | "failed" | "pending";
  eventId?: string;
  eventTitle?: string;
}

interface NotificationHistoryProps {
  userId: string;
}

const NOTIFICATION_TYPES = ["all", "email", "push", "sms", "browser"] as const;
const STATUS_FILTERS = ["all", "sent", "failed", "pending"] as const;

export const NotificationHistory: React.FC<NotificationHistoryProps> = ({
  userId,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedType, setSelectedType] =
    useState<(typeof NOTIFICATION_TYPES)[number]>("all");
  const [selectedStatus, setSelectedStatus] =
    useState<(typeof STATUS_FILTERS)[number]>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const loadNotifications = async () => {
    try {
      // TODO: Replace with actual API call
      const mockNotifications: Notification[] = [
        {
          id: "1",
          type: "email",
          title: "Event Reminder",
          message: "Team meeting starts in 30 minutes",
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          status: "sent",
          eventId: "123",
          eventTitle: "Team Meeting",
        },
        {
          id: "2",
          type: "push",
          title: "Event Update",
          message: "Client call has been rescheduled",
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          status: "sent",
          eventId: "456",
          eventTitle: "Client Call",
        },
        {
          id: "3",
          type: "sms",
          title: "Event Cancellation",
          message: "Lunch break has been cancelled",
          timestamp: new Date(Date.now() - 1000 * 60 * 90),
          status: "failed",
          eventId: "789",
          eventTitle: "Lunch Break",
        },
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      toast.error("Failed to load notification history");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesType =
      selectedType === "all" || notification.type === selectedType;
    const matchesStatus =
      selectedStatus === "all" || notification.status === selectedStatus;
    const matchesSearch =
      searchQuery === "" ||
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.eventTitle
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    return matchesType && matchesStatus && matchesSearch;
  });

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "email":
        return <Mail className="w-5 h-5 text-blue-500" />;
      case "push":
        return <Bell className="w-5 h-5 text-purple-500" />;
      case "sms":
        return <Smartphone className="w-5 h-5 text-green-500" />;
      case "browser":
        return <MessageSquare className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: Notification["status"]) => {
    switch (status) {
      case "sent":
        return "text-green-600 bg-green-50";
      case "failed":
        return "text-red-600 bg-red-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Notification History</h3>
        <button
          onClick={loadNotifications}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
          <select
            value={selectedType}
            onChange={(e) =>
              setSelectedType(
                e.target.value as (typeof NOTIFICATION_TYPES)[number],
              )
            }
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {NOTIFICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(
                e.target.value as (typeof STATUS_FILTERS)[number],
              )
            }
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No notifications found
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-gray-50 rounded-lg">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(notification.status)}`}
                      >
                        {notification.status}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                  </div>
                  {notification.eventTitle && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Event: </span>
                      <span className="text-xs font-medium">
                        {notification.eventTitle}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
