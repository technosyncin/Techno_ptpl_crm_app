// Utilities aligned with Web logic (Company & Users)

export const toTitleCase = (str: string): string => {
  if (!str || typeof str !== 'string') return str || '';
  return str.replace(/\b[a-z]/g, (char) => char.toUpperCase());
};

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Chandigarh',
  'Puducherry',
  'Jammu and Kashmir',
  'Ladakh',
];

export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Zz1-9A-Z]{1}[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateGST = (gst: string): { isValid: boolean; message?: string } => {
  const clean = gst.trim().toUpperCase();
  if (!clean) return { isValid: true };
  if (clean.length !== 15) {
    return {
      isValid: false,
      message: `GST Number must be exactly 15 characters long (currently ${clean.length})`,
    };
  }
  if (!GST_REGEX.test(clean)) {
    return {
      isValid: false,
      message: 'Invalid GST format. Example: 27ABCDE1234F1Z5',
    };
  }
  return { isValid: true };
};

export const validatePAN = (pan: string): { isValid: boolean; message?: string } => {
  const clean = pan.trim().toUpperCase();
  if (!clean) return { isValid: true };
  if (clean.length !== 10) {
    return {
      isValid: false,
      message: `PAN Number must be exactly 10 characters long (currently ${clean.length})`,
    };
  }
  if (!PAN_REGEX.test(clean)) {
    return {
      isValid: false,
      message: 'Invalid PAN format. Example: ABCDE1234F',
    };
  }
  return { isValid: true };
};

export const extractPanFromGst = (gst: string): string => {
  const clean = gst.trim().toUpperCase();
  if (clean.length >= 12) {
    return clean.substring(2, 12);
  }
  return '';
};
