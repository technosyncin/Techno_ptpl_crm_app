
import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing, BorderRadius, Shadows } from '../../theme/spacing';
import { Button } from '../common/Button';

interface QuickMessageModalProps {
    visible: boolean;
    onClose: () => void;
    recipientName: string;
    phoneNumber?: string;
    mobileNo?: string;
}

export const QuickMessageModal: React.FC<QuickMessageModalProps> = ({
    visible,
    onClose,
    recipientName,
    phoneNumber,
    mobileNo,
}) => {
    const targetPhone = mobileNo || phoneNumber || '';

    const handleWhatsApp = async () => {
        const phone = String(targetPhone).replace(/\D/g, '');

        if (!phone) {
            Alert.alert('WhatsApp', 'Mobile number is not available.');
            return;
        }

        // Add India country code if number has 10 digits
        const whatsappNumber =
            phone.length === 10 ? `91${phone}` : phone;

        const url = `https://wa.me/${whatsappNumber}`;

        try {
            await Linking.openURL(url);
            onClose();
        } catch {
            Alert.alert('Error', 'Unable to open WhatsApp.');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <View style={[styles.sheet, Shadows.lg]}>
                    <View style={styles.header}>
                        <View>
                            <Text style={[Typography.h3, styles.title]}>
                                WhatsApp
                            </Text>
                            <Text style={[Typography.caption, styles.subtitle]}>
                                Chat with {recipientName}
                            </Text>
                            <Text style={[Typography.caption, styles.subtitle]}>
                                {targetPhone}
                            </Text>
                        </View>

                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons
                                name="close"
                                size={22}
                                color={Colors.slate500}
                            />
                        </TouchableOpacity>
                    </View>

                    <Button
                        title="Open WhatsApp"
                        variant="primary"
                        icon="logo-whatsapp"
                        onPress={handleWhatsApp}
                        style={styles.whatsappButton}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: Colors.modalBackdrop,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        padding: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        color: Colors.slate900,
    },
    subtitle: {
        color: Colors.slate500,
        marginTop: 4,
    },
    closeBtn: {
        padding: Spacing.xs,
        backgroundColor: Colors.slate100,
        borderRadius: BorderRadius.full,
    },
    whatsappButton: {
        backgroundColor: Colors.whatsapp,
    },
});
