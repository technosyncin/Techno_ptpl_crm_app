import { apiClient } from './client';

export interface ChannelSetting {
  enabled: boolean;
  templateId: string;
}

export interface SalesReminderStepItem {
  stepID?: number;
  settingID?: number;
  stepNo: number;
  stepName: string;
  subtitle?: string;
  daysOffset: number;
  statusLabel?: string;
  isTrigger: boolean;
  actionTitle?: string;
  isActive: boolean;
  channels: Record<string, ChannelSetting>;
}

export interface SalesReminderSettingData {
  settingID?: number;
  companyID: number;
  settingName?: string;
  isActive: boolean;
  steps: SalesReminderStepItem[];
}

export const REMINDER_TEMPLATES: Record<string, { id: string; name: string }[]> = {
  whatsapp: [
    { id: 'wa_1', name: 'Automatic Intro & Welcome Brochure (WA-001)' },
    { id: 'wa_2', name: 'Call Reminder & Status Update (WA-002)' },
    { id: 'wa_3', name: 'Follow-up Task Generator (WA-003)' },
  ],
  email: [
    { id: 'em_1', name: 'Automatic Introduction Email (EM-001)' },
    { id: 'em_2', name: 'Call Task & Follow-up Email (EM-002)' },
    { id: 'em_3', name: 'Next Day Generated Task Email (EM-003)' },
  ],
  sms: [
    { id: 'sms_1', name: 'Intro SMS Greeting (SMS-001)' },
    { id: 'sms_2', name: 'Call Task Reminder SMS (SMS-002)' },
  ],
  rcs: [
    { id: 'rcs_1', name: 'Interactive Intro Card (RCS-001)' },
  ],
  voiceCall: [
    { id: 'vc_1', name: 'Call Task Voice IVR Script (VC-001)' },
  ],
};

export const REMINDER_CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
  { key: 'email', label: 'Email', icon: 'mail', color: '#0d6efd' },
  { key: 'sms', label: 'SMS', icon: 'chatbox-ellipses', color: '#6f42c1' },
  { key: 'rcs', label: 'RCS', icon: 'chatbubbles', color: '#d63384' },
  { key: 'voiceCall', label: 'Voice Call Task', icon: 'call', color: '#fd7e14' },
] as const;

export const DEFAULT_SALES_REMINDER_FLOW: SalesReminderStepItem[] = [
  {
    stepID: 0,
    settingID: 0,
    stepNo: 1,
    stepName: 'Step 1: Lead Enrolled',
    subtitle: 'Fires immediately on enrollment',
    daysOffset: 0,
    statusLabel: 'New Lead Enrolled',
    isTrigger: true,
    actionTitle: 'Send Automatic Intro Email & Message',
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
    stepName: 'Additional Stage: Wait 2 Days',
    subtitle: 'Call task reminder & status change',
    daysOffset: 2,
    statusLabel: 'Call Scheduled',
    isTrigger: false,
    actionTitle: 'Generate Call Task & Update Status',
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
    stepName: 'Step 3: Wait Next Day',
    subtitle: 'Generate follow-up task & message',
    daysOffset: 1,
    statusLabel: 'Task Generated',
    isTrigger: false,
    actionTitle: 'Generate Next Day Task & Message',
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

export const salesReminderService = {
  getSettings: async (companyId: number = 1): Promise<{ setting?: any; steps?: any[] }> => {
    try {
      const response = await apiClient.get('/SalesReminderSetting', {
        params: { companyId },
      });
      return response.data;
    } catch (error) {
      console.warn('Error fetching sales reminder settings, using defaults:', error);
      return { steps: DEFAULT_SALES_REMINDER_FLOW };
    }
  },

  saveSettings: async (payload: any): Promise<any> => {
    try {
      const response = await apiClient.post('/SalesReminderSetting/save', payload);
      return response.data;
    } catch (error) {
      console.error('Error saving sales reminder settings:', error);
      throw error;
    }
  },

  deleteStep: async (stepId: number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/SalesReminderSetting/steps/${stepId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting sales reminder step:', error);
      throw error;
    }
  },
};
