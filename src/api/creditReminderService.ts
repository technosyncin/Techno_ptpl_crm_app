import { apiClient } from './client';
import {
  ChannelSetting,
  SalesReminderStepItem,
  REMINDER_CHANNELS,
  REMINDER_TEMPLATES,
} from './salesReminderService';

export type CreditReminderStepItem = SalesReminderStepItem;

export const DEFAULT_CREDIT_REMINDER_FLOW: CreditReminderStepItem[] = [
  {
    stepID: 0,
    settingID: 0,
    stepNo: 1,
    stepName: 'Step 1: Invoice Created',
    subtitle: 'Fires immediately on invoice generation',
    daysOffset: 0,
    statusLabel: 'Invoice Issued',
    isTrigger: true,
    actionTitle: 'Send Automatic Invoice Payment Notice',
    isActive: true,
    channels: {
      whatsapp: { enabled: true, templateId: 'wa_1' },
      email: { enabled: true, templateId: 'em_1' },
      sms: { enabled: true, templateId: 'sms_1' },
      rcs: { enabled: true, templateId: 'rcs_1' },
      voiceCall: { enabled: true, templateId: 'vc_1' },
    },
  },
  {
    stepID: 0,
    settingID: 0,
    stepNo: 2,
    stepName: 'Additional Stage 1 Day Before Due Date',
    subtitle: 'Pre-due date reminder alert',
    daysOffset: 1,
    statusLabel: 'Due Soon',
    isTrigger: false,
    actionTitle: 'Send Pre-Due Date Payment Alert',
    isActive: true,
    channels: {
      whatsapp: { enabled: true, templateId: 'wa_2' },
      email: { enabled: true, templateId: 'em_2' },
      sms: { enabled: true, templateId: 'sms_2' },
      rcs: { enabled: true, templateId: 'rcs_1' },
      voiceCall: { enabled: true, templateId: 'vc_1' },
    },
  },
  {
    stepID: 0,
    settingID: 0,
    stepNo: 3,
    stepName: 'Step 3: On Due Date',
    subtitle: 'Due date notification & status update',
    daysOffset: 0,
    statusLabel: 'Payment Due Today',
    isTrigger: false,
    actionTitle: 'Send Due Date Payment Notice',
    isActive: true,
    channels: {
      whatsapp: { enabled: true, templateId: 'wa_3' },
      email: { enabled: true, templateId: 'em_3' },
      sms: { enabled: true, templateId: 'sms_1' },
      rcs: { enabled: true, templateId: 'rcs_1' },
      voiceCall: { enabled: true, templateId: 'vc_1' },
    },
  },
];

export const creditReminderService = {
  getSettings: async (companyId: number = 1): Promise<{ setting?: any; steps?: any[] }> => {
    try {
      const response = await apiClient.get('/CreditReminderSetting', {
        params: { companyId },
      });
      return response.data;
    } catch (error) {
      console.warn('Error fetching credit reminder settings, using defaults:', error);
      return { steps: DEFAULT_CREDIT_REMINDER_FLOW };
    }
  },

  saveSettings: async (payload: any): Promise<any> => {
    try {
      const response = await apiClient.post('/CreditReminderSetting/save', payload);
      return response.data;
    } catch (error) {
      console.error('Error saving credit reminder settings:', error);
      throw error;
    }
  },

  deleteStep: async (stepId: number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/CreditReminderSetting/steps/${stepId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting credit reminder step:', error);
      throw error;
    }
  },
};
