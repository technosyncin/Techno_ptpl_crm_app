import { apiClient } from './client';

export interface ReminderItem {
  reminderId: number;
  companyId: number;
  userId: number;
  title: string;
  description?: string;
  priorityType: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  reminderDateTime: string;
  reminderType?: string;
  repeatType?: 'None' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | string;
  repeatInterval?: number;
  repeatDays?: string;
  repeatEndDate?: string | null;
  reminderBeforeMin?: number;
  status: 'Pending' | 'Completed' | string;
  isCompleted: boolean;
  completedDate?: string | null;
  isSnoozed?: boolean;
  snoozeTill?: string | null;
  isActive?: boolean;
  repeatCount?: number | null;
  maxOccurrences?: number | null;
  nextReminderDateTime?: string | null;
}

export const reminderService = {
  // GET ALL REMINDERS
  getAllReminders: async (companyId?: number): Promise<ReminderItem[]> => {
    try {
      const params = companyId ? { companyId } : {};
      const response = await apiClient.get('/Reminder', { params });

      if (response && response.data) {
        if (Array.isArray(response.data)) {
          return response.data;
        }
        if (response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
      }
      return [];
    } catch (error: any) {
      console.warn('Error fetching reminders:', error?.message);
      return [];
    }
  },

  // GET REMINDER BY ID
  getReminderById: async (id: number): Promise<ReminderItem | null> => {
    try {
      const response = await apiClient.get(`/Reminder/${id}`);
      return response.data || null;
    } catch (error: any) {
      console.warn('Error fetching reminder by id:', error?.message);
      return null;
    }
  },

  // SAVE REMINDER
  saveReminder: async (payload: Partial<ReminderItem>): Promise<any> => {
    try {
      const response = await apiClient.post('/Reminder', payload);
      return response.data;
    } catch (error: any) {
      console.error('Error saving reminder:', error?.response?.data || error?.message);
      throw error;
    }
  },

  // UPDATE REMINDER
  updateReminder: async (payload: Partial<ReminderItem>): Promise<any> => {
    try {
      const response = await apiClient.put('/Reminder', payload);
      return response.data;
    } catch (error: any) {
      console.error('Error updating reminder:', error?.response?.data || error?.message);
      throw error;
    }
  },

  // COMPLETE REMINDER
  completeReminder: async (id: number, completedBy: number = 1): Promise<any> => {
    try {
      const response = await apiClient.put(`/Reminder/complete/${id}`, {
        completedBy,
      });
      return response.data;
    } catch (error: any) {
      console.warn('PUT /Reminder/complete failed, falling back to PUT /Reminder', error?.message);
      // Fallback: full update with isCompleted: true
      return await apiClient.put('/Reminder', {
        reminderId: id,
        isCompleted: true,
        status: 'Completed',
        updatedBy: completedBy,
      });
    }
  },

  // DELETE REMINDER
  deleteReminder: async (id: number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/Reminder/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting reminder:', error?.response?.data || error?.message);
      throw error;
    }
  },
};
