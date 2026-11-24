import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

export interface SalesShortcutsDrawerProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  leadId?: number | string;
  leadName?: string;
  mobileNo?: string;
  companyName?: string;
}

interface ShortcutItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  route: string;
  params?: Record<string, any>;
}

export const SalesShortcutsDrawer: React.FC<SalesShortcutsDrawerProps> = ({
  visible,
  onClose,
  navigation,
  leadId,
  leadName,
  mobileNo,
  companyName,
}) => {
  // Ordered vertically from bottom to top
  const shortcuts: ShortcutItem[] = [
    {
      id: 'reminder',
      title: 'Sales Reminder',
      icon: 'notifications',
      iconColor: '#7c3aed',
      route: 'Reminder',
      params: { leadId, leadName },
    },
    {
      id: 'followup',
      title: 'Sales Follow Up',
      icon: 'git-network',
      iconColor: '#d97706',
      route: 'SalesFollowUp',
      params: { leadId, leadName, mobileNo },
    },
    {
      id: 'contact',
      title: 'Update Contact',
      icon: 'person-circle',
      iconColor: '#10b981',
      route: 'AddContact',
      params: { leadId, leadName, mobileNo, companyName, editContact: { leadId, leadID: leadId, companyName, contactPerson: leadName, mobileNo } },
    },
    {
      id: 'quotation',
      title: 'Quotation List',
      icon: 'document-text',
      iconColor: '#0284c7',
      route: 'Quotations',
      params: { leadId, leadName, companyName },
    },
  ];

  const handleNavigate = (shortcut: ShortcutItem) => {
    onClose();
    setTimeout(() => {
      navigation.navigate(shortcut.route, shortcut.params);
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.verticalStack}>
              {/* Vertical Stack of Icon Buttons with Labels */}
              {shortcuts.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.actionRow}
                  onPress={() => handleNavigate(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.labelBubble}>
                    <Text style={styles.labelText}>{item.title}</Text>
                  </View>
                  <View style={[styles.circleIconBtn, { backgroundColor: item.iconColor }]}>
                    <Ionicons name={item.icon} size={20} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              ))}

              {/* Close Button at bottom of vertical stack */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  verticalStack: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 34 : 24,
    alignItems: 'flex-end',
    gap: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-end',
  },
  labelBubble: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.slate900,
  },
  circleIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  closeBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.slate900,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
});
