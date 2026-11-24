import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { Colors } from '../../theme/colors';

interface MobileLoaderProps {
  message?: string;
  overlay?: boolean;
  size?: 'small' | 'large';
  color?: string;
}

export const MobileLoader: React.FC<MobileLoaderProps> = ({
  message = 'Loading...',
  overlay = false,
  size = 'large',
  color = Colors.primary,
}) => {
  if (overlay) {
    return (
      <Modal transparent visible animationType="fade">
        <View style={styles.overlayContainer}>
          <View style={styles.modalCard}>
            <ActivityIndicator size={size} color={color} />
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.inlineContainer}>
      <ActivityIndicator size={size} color={color} />
      {message ? <Text style={styles.inlineMessage}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  inlineContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineMessage: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.slate500,
    fontWeight: '500',
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: Colors.modalBackdrop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 160,
  },
  message: {
    marginTop: 14,
    fontSize: 14,
    color: Colors.slate800,
    fontWeight: '600',
    textAlign: 'center',
  },
});
