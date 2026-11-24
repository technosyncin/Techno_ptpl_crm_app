import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionMenuProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  items: ActionMenuItem[];
  onClose: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  visible,
  title,
  subtitle,
  items,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View style={styles.handle} />

              {(title || subtitle) && (
                <View style={styles.header}>
                  {title && <Text style={styles.title}>{title}</Text>}
                  {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
              )}

              <View style={styles.itemsContainer}>
                {items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemRow}
                    onPress={() => {
                      onClose();
                      setTimeout(() => item.onPress(), 150);
                    }}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        item.destructive ? styles.iconCircleDestructive : null,
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={
                          item.destructive
                            ? Colors.danger
                            : item.iconColor || Colors.primary
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.itemLabel,
                        item.destructive ? styles.itemLabelDestructive : null,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalBackdrop,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.slate300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.slate900,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.slate500,
    marginTop: 2,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconCircleDestructive: {
    backgroundColor: Colors.dangerLight,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.slate800,
  },
  itemLabelDestructive: {
    color: Colors.danger,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: Colors.slate100,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate700,
  },
});
