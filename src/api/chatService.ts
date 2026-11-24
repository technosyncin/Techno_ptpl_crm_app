import { apiClient } from './client';

export interface ChatUser {
  id: number;
  name: string;
  email: string;
  role: string;
  unreadCount: number;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  lastMessageSenderId?: number | null;
  lastMessageReceiverId?: number | null;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  timestamp: string;
  status: string;
  isRead: boolean;
  isDelivered: boolean;
}

export const chatService = {
  // Get all users with unread badge and last message
  getChatUsers: async (userId?: number): Promise<ChatUser[]> => {
    try {
      const params = userId ? { userId } : {};
      const res = await apiClient.get('/Chat/users', { params });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    } catch (err) {
      console.warn('Error fetching chat users:', err);
      return [];
    }
  },

  // Get message history with another user
  getMessages: async (otherUserId: number, currentUserId?: number): Promise<ChatMessage[]> => {
    try {
      const params = currentUserId ? { currentUserId } : {};
      const res = await apiClient.get(`/Chat/messages/${otherUserId}`, { params });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    } catch (err) {
      console.warn('Error fetching chat messages:', err);
      return [];
    }
  },

  // Send a chat message
  sendMessage: async (senderId: number, receiverId: number, message: string): Promise<ChatMessage | null> => {
    try {
      const res = await apiClient.post('/Chat/send', {
        senderId,
        receiverId,
        message,
      });
      return res.data?.data || null;
    } catch (err) {
      console.error('Error sending chat message:', err);
      throw err;
    }
  },

  // Mark conversation messages as read
  markAsRead: async (senderId: number, currentUserId?: number): Promise<void> => {
    try {
      const params = currentUserId ? { currentUserId } : {};
      await apiClient.post(`/Chat/mark-read/${senderId}`, {}, { params });
    } catch (err) {
      console.warn('Error marking messages as read:', err);
    }
  },
};
