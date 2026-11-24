import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';
import { cleanPhoneForUrl } from './formatting';

// Make Direct Phone Call
export const makePhoneCall = async (phoneNumber?: string): Promise<void> => {
  if (!phoneNumber) {
    Alert.alert('No Phone Number', 'No phone number available for this contact.');
    return;
  }
  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
  const url = `tel:${cleanNumber}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported || Platform.OS === 'android') {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to initiate phone call on this device.');
    }
  } catch (err) {
    console.warn('Error opening phone dialer:', err);
    Alert.alert('Dialer Error', 'Could not open phone dialer.');
  }
};

// Send WhatsApp Message
export const sendWhatsAppMessage = async (phoneNumber?: string, message?: string): Promise<void> => {
  if (!phoneNumber) {
    Alert.alert('No Phone Number', 'No phone number available for WhatsApp.');
    return;
  }
  const cleanNumber = cleanPhoneForUrl(phoneNumber);
  const encodedMsg = message ? encodeURIComponent(message) : '';
  const url = `whatsapp://send?phone=${cleanNumber}&text=${encodedMsg}`;
  const webUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback to web WhatsApp URL
      await Linking.openURL(webUrl);
    }
  } catch (err) {
    try {
      await Linking.openURL(webUrl);
    } catch {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Please ensure it is installed.');
    }
  }
};

// Send SMS
export const sendSMS = async (phoneNumber?: string, body?: string): Promise<void> => {
  if (!phoneNumber) {
    Alert.alert('No Phone Number', 'No phone number available.');
    return;
  }
  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
  const url = `sms:${cleanNumber}${body ? `?body=${encodeURIComponent(body)}` : ''}`;
  try {
    await Linking.openURL(url);
  } catch (err) {
    Alert.alert('SMS Error', 'Could not open SMS application.');
  }
};

// Send Email
export const sendEmail = async (emailAddress?: string, subject?: string, body?: string): Promise<void> => {
  if (!emailAddress) {
    Alert.alert('No Email', 'No email address available.');
    return;
  }
  let url = `mailto:${emailAddress}`;
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }

  try {
    await Linking.openURL(url);
  } catch (err) {
    Alert.alert('Email Error', 'Could not open Mail client.');
  }
};
