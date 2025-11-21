import React, { createContext, useContext, ReactNode } from "react";
import { useMutation, useStorage } from "@liveblocks/react";
import { LiveMap, LiveList } from "@liveblocks/client";

export type NotificationType = "comment" | "reply" | "mention" | "resolve";

export type LsonNotification = {
  id: string;
  type: NotificationType;
  threadId: string;
  commentId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string | null;
  content: string;
  createdAt: number;
  read: boolean;
};

export interface NotificationContextValue {
  notifications: LsonNotification[];
  unreadCount: number;
  addNotification: (userId: string, notification: Omit<LsonNotification, "id" | "createdAt" | "read">) => void;
  markAsRead: (userId: string, notificationId: string) => void;
  clearAll: (userId: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider = ({ userId, children }: { userId: string; children: ReactNode }) => {
  // Notifications are stored in Liveblocks storage as { [userId]: LiveList<LsonNotification> }
  const notificationsMap = useStorage((root: { notifications?: LiveMap<string, LiveList<LsonNotification>> }) => root.notifications || new LiveMap());
  let notifications: LsonNotification[] = [];
  if (notificationsMap && typeof notificationsMap.get === "function") {
    const userList = notificationsMap.get(userId);
    if (userList && typeof (userList as any).toArray === "function") {
      notifications = (userList as LiveList<LsonNotification>).toArray();
    }
  }
  const unreadCount = notifications.filter((n: LsonNotification) => !n.read).length;

  // Add notification
  const addNotification = useMutation(({ storage }, userId: string, notification: Omit<LsonNotification, "id" | "createdAt" | "read">) => {
    const notifications = storage.get("notifications") as LiveMap<string, LiveList<LsonNotification>> | undefined;
    if (!notifications) return;
    let userList = notifications.get(userId);
    if (!userList) {
      userList = new LiveList<LsonNotification>([]);
      notifications.set(userId, userList);
    }
    userList.push({
      ...notification,
      id: Math.random().toString(36).slice(2),
      createdAt: Date.now(),
      read: false,
    });
  }, []);

  // Mark as read
  const markAsRead = useMutation(({ storage }, userId: string, notificationId: string) => {
    const notifications = storage.get("notifications") as LiveMap<string, LiveList<LsonNotification>> | undefined;
    if (!notifications) return;
    const userList = notifications.get(userId);
    if (!userList) return;
    const idx = userList.findIndex((n: LsonNotification) => n.id === notificationId);
    if (idx !== -1) {
      const notif = userList.get(idx);
      if (notif) {
        notif.read = true;
        userList.set(idx, notif);
      }
    }
  }, []);

  // Clear all
  const clearAll = useMutation(({ storage }, userId: string) => {
    const notifications = storage.get("notifications") as LiveMap<string, LiveList<LsonNotification>> | undefined;
    if (!notifications) return;
    const userList = notifications.get(userId);
    if (userList) {
      while (userList.length > 0) userList.delete(0);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext must be used within NotificationProvider");
  return ctx;
};

export const useNotifications = (userId: string) => {
  const ctx = useNotificationContext();
  return {
    notifications: ctx.notifications,
    unreadCount: ctx.unreadCount,
    addNotification: (notification) => ctx.addNotification(userId, notification),
    markAsRead: (notificationId) => ctx.markAsRead(userId, notificationId),
    clearAll: () => ctx.clearAll(userId),
  };
}; 