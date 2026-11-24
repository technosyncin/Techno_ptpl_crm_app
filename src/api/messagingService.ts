import { apiClient } from './client';
import { Linking, Alert, Platform } from 'react-native';

export interface MessageTemplate {
  templateID: number;
  templateName: string;
  templateContent: string;
  type: 'WhatsApp' | 'SMS' | 'Email';
  variables?: string[];
}

export const messagingService = {
  // Get WhatsApp Templates
  getWhatsAppTemplates: async (): Promise<MessageTemplate[]> => {
    try {
      const endpoints = ['/WhatsAppTemplate', '/whatsapptemplate', '/masters/templates/whatsapp'];
      for (const ep of endpoints) {
        try {
          const res = await apiClient.get(ep);
          if (res && res.data) {
            const raw = Array.isArray(res.data) ? res.data : res.data.data;
            if (Array.isArray(raw)) {
              return raw.map((t: any) => ({
                templateID: t.templateID || t.TemplateID || t.id,
                templateName: t.templateName || t.TemplateName || t.name,
                templateContent: t.templateContent || t.TemplateContent || t.content || '',
                type: 'WhatsApp',
              }));
            }
          }
        } catch {
          continue;
        }
      }
    } catch { }

    return [
      {
        templateID: 1,
        templateName: 'Lead Greeting & Introduction',
        templateContent: 'Hello {Name}, thank you for connecting with us regarding {Product}. How can we assist your business today?',
        type: 'WhatsApp',
      },
      {
        templateID: 2,
        templateName: 'Quotation Follow-up',
        templateContent: 'Hi {Name}, just checking in regarding the quotation sent for {Company}. Let us know if you need any adjustments or clarifications.',
        type: 'WhatsApp',
      },
      {
        templateID: 3,
        templateName: 'Payment Reminder',
        templateContent: 'Dear {Name}, friendly reminder regarding the pending balance of Rs. {Amount} due on {Date}. Please arrange payment at your earliest convenience.',
        type: 'WhatsApp',
      },
    ];
  },

  // Get SMS Templates
  getSMSTemplates: async (): Promise<MessageTemplate[]> => {
    try {
      const endpoints = ['/SMSTemplate', '/smstemplate', '/masters/templates/sms'];
      for (const ep of endpoints) {
        try {
          const res = await apiClient.get(ep);
          if (res && res.data) {
            const raw = Array.isArray(res.data) ? res.data : res.data.data;
            if (Array.isArray(raw)) {
              return raw.map((t: any) => ({
                templateID: t.templateID || t.TemplateID || t.id,
                templateName: t.templateName || t.TemplateName || t.name,
                templateContent: t.templateContent || t.TemplateContent || t.content || '',
                type: 'SMS',
              }));
            }
          }
        } catch {
          continue;
        }
      }
    } catch { }

    return [
      {
        templateID: 1,
        templateName: 'Meeting Reminder SMS',
        templateContent: 'Reminder: Scheduled meeting with Techno CRM on {Date} at {Time}. See you there!',
        type: 'SMS',
      },
      {
        templateID: 2,
        templateName: 'Payment Received Acknowledgment',
        templateContent: 'We have received your payment of Rs. {Amount} for Receipt {ReceiptNo}. Thank you for your business!',
        type: 'SMS',
      },
    ];
  },

  // Open WhatsApp
  sendWhatsApp: async (mobileNo: string, text: string): Promise<boolean> => {
    try {
      let cleanPhone = mobileNo.replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
      }
      const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        const webUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
        await Linking.openURL(webUrl);
        return true;
      }
    } catch {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp on this device.');
      return false;
    }
  },

  // Open Phone Dialer
  makePhoneCall: async (mobileNo: string): Promise<void> => {
    const cleanPhone = mobileNo.replace(/[^0-9+]/g, '');
    const url = Platform.OS === 'ios' ? `telprompt:${cleanPhone}` : `tel:${cleanPhone}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Call Error', 'Could not initiate phone call.');
    }
  },

  // Open SMS App
  sendSMS: async (mobileNo: string, text: string): Promise<void> => {
    const cleanPhone = mobileNo.replace(/[^0-9+]/g, '');
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${cleanPhone}${separator}body=${encodeURIComponent(text)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('SMS Error', 'Could not open messaging app.');
    }
  },

  // Open Email App
  sendEmail: async (email: string, subject: string, body: string): Promise<void> => {
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Email Error', 'Could not open email client.');
    }
  },
};
