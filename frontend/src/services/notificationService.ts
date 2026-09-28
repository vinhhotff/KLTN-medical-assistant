import { api } from './api';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadataJson?: string;
  createdAt: string;
}

export const notificationService = {
  async getMyNotifications(): Promise<NotificationItem[]> {
    const res = await api.get('/notifications/my');
    return res.data.data || [];
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get('/notifications/unread-count');
    return res.data.data?.unreadCount || 0;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data.data;
  },

  async markAllAsRead(): Promise<number> {
    const res = await api.patch('/notifications/read-all');
    return res.data.data?.markedCount || 0;
  },
};
