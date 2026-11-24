// Techno CRM Design Tokens - Lavender & Slate Theme (Matching Web CRM)
export const Colors = {
  // Primary - Web CRM Violet & Lavender Brand Identity (--primary-600, --primary-500)
  primary: '#7c3aed',
  primaryLight: '#8b5cf6',
  primaryDark: '#6d28d9',
  primaryMuted: '#f5f3ff',
  primarySoft: 'rgba(124, 58, 237, 0.12)',
  primaryGradient: ['#8b5cf6', '#7c3aed'],
  primaryCardGradient: ['#7c3aed', '#5b21b6'],

  // Secondary & Slate
  slate900: '#1a1a1a',
  slate800: '#2d3748',
  slate700: '#4a5568',
  slate600: '#757575',
  slate500: '#8a94a6',
  slate400: '#a0aec0',
  slate300: '#cbd5e1',
  slate200: '#e0e0e0',
  slate100: '#f1f5f9',
  slate50: '#f8f9fa',

  // Backgrounds & Surfaces
  background: '#f8f9fa',
  surface: '#ffffff',
  surfaceAlt: '#f2eef8',
  surfaceElevated: '#ffffff',
  card: '#ffffff',
  modalBackdrop: 'rgba(26, 26, 26, 0.6)',

  // Text
  text: '#0f172a',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textInverse: '#ffffff',
  textPlaceholder: '#94a3b8',

  // Status & Feedback
  error: '#ef4444',
  success: '#10b981',
  successLight: '#d1fae5',
  successDark: '#047857',

  warning: '#f59e0b',
  warningLight: '#fef3c7',
  warningDark: '#b45309',

  danger: '#ef4444',
  dangerLight: '#fee2e2',
  dangerDark: '#b91c1c',

  info: '#3b82f6',
  infoLight: '#dbeafe',
  infoDark: '#1d4ed8',

  // Accent & Quick Actions
  whatsapp: '#25D366',
  whatsappBg: '#dcf8c6',
  call: '#0284c7',
  callBg: '#e0f2fe',
  email: '#ea580c',
  emailBg: '#ffedd5',
  sms: '#8b5cf6',
  smsBg: '#f3e8ff',

  // Borders & Dividers
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderFocus: '#7c3aed',

  // Badges & Status Colors for CRM
  statusNew: '#3b82f6',
  statusContacted: '#f59e0b',
  statusQualified: '#8b5cf6',
  statusProposal: '#06b6d4',
  statusWon: '#10b981',
  statusLost: '#ef4444',
  statusPending: '#f97316',
};

export type ColorType = typeof Colors;
