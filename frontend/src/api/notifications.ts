import { apiRequest } from "./client";

export interface NotificationItem {
  id: number;
  user_id?: number;
  bureau?: string;
  title: string;
  message: string;
  notification_type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  return apiRequest<NotificationItem[]>("/notifications");
}

export async function markNotificationAsRead(id: number): Promise<NotificationItem> {
  return apiRequest<NotificationItem>(`/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsAsRead(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/notifications/read-all", { method: "POST" });
}
