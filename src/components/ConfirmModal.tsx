import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors, Radius, Spacing, Typography, TouchTarget } from '../constants/theme';
import { GardenSprouts } from './GardenDecor';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  singleButton?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'danger',
  singleButton = false,
  onConfirm,
  onCancel,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!visible) return null;

  const handleClose = () => {
    if (onCancel) {
      onCancel();
    } else {
      onConfirm();
    }
  };

  const iconName =
    type === 'danger'
      ? 'trash-outline'
      : type === 'warning'
      ? 'alert-circle-outline'
      : 'information-circle-outline';

  const iconColor =
    type === 'danger' ? colors.expense : type === 'warning' ? colors.warning : colors.info;

  const badgeBg =
    type === 'danger'
      ? colors.expenseSoft
      : type === 'warning'
      ? colors.warningSoft
      : colors.infoSoft;

  const confirmBtnBg =
    type === 'danger' ? colors.expense : type === 'warning' ? colors.warning : colors.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <GardenSprouts variant="modal" />
              <View style={[styles.iconBadge, { backgroundColor: badgeBg }]}>
                <Ionicons name={iconName} size={28} color={iconColor} />
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.buttonRow}>
                {!singleButton && onCancel && (
                  <Pressable
                    style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.75 }]}
                    onPress={onCancel}
                    accessibilityRole="button"
                  >
                    <Text style={styles.cancelBtnText}>{cancelText}</Text>
                  </Pressable>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    { backgroundColor: confirmBtnBg },
                    singleButton && { flex: 1 },
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={onConfirm}
                  accessibilityRole="button"
                >
                  <GardenSprouts variant="chip" align="right" />
                  <Text style={styles.confirmBtnText}>{confirmText}</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surfaceElevated,
      borderRadius: Radius.xl,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      overflow: 'visible',
      padding: Spacing.xl,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
      elevation: 12,
    },
    iconBadge: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.base,
    },
    title: {
      ...Typography.title,
      color: colors.text,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    message: {
      ...Typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: Spacing.md,
      width: '100%',
    },
    cancelBtn: {
      flex: 1,
      minHeight: TouchTarget.minSize,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
    },
    cancelBtnText: {
      ...Typography.subtitle,
      color: colors.textSecondary,
    },
    confirmBtn: {
      flex: 1,
      minHeight: TouchTarget.minSize,
      borderRadius: Radius.md,
      overflow: 'visible',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
    },
    confirmBtnText: {
      ...Typography.subtitle,
      color: colors.onPrimary,
      fontWeight: '700',
    },
  });
