import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { UpdateHistoryItem } from '../models/types';
import { formatDateTime } from '../utils/formatters';
import { GardenSprouts } from './GardenDecor';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  Typography,
  TouchTarget,
} from '../constants/theme';

interface OtaHistoryModalProps {
  visible: boolean;
  updateHistory: UpdateHistoryItem[];
  onClose: () => void;
  onCheckUpdate: () => void;
}

export const OtaHistoryModal: React.FC<OtaHistoryModalProps> = ({
  visible,
  updateHistory,
  onClose,
  onCheckUpdate,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <GardenSprouts variant="modal" />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Lịch sử cập nhật OTA</Text>
            <Pressable
              style={styles.modalCloseBtn}
              onPress={onClose}
              hitSlop={TouchTarget.hitSlop}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.currentBuildBox}>
            <Text style={styles.currentBuildTitle}>Phiên bản đang chạy</Text>
            <Text style={styles.currentBuildDetail}>
              • Kênh: {Updates.channel || 'preview'}
            </Text>
            <Text style={styles.currentBuildDetail}>
              • Runtime Version: {Updates.runtimeVersion || '1.0.0'}
            </Text>
            <Text style={styles.currentBuildDetail}>
              • Update ID: {Updates.updateId || 'Embedded (Bản gốc)'}
            </Text>
            <Text style={styles.currentBuildDetail}>
              • Khởi chạy từ APK gốc: {Updates.isEmbeddedLaunch ? 'Có' : 'Không (OTA)'}
            </Text>
          </View>

          <Text style={styles.historySectionTitle}>
            Các bản cập nhật đã tải ({updateHistory.length})
          </Text>

          <ScrollView style={styles.historyList}>
            {updateHistory.length === 0 ? (
              <Text style={styles.emptyHistoryText}>
                Chưa có lịch sử bản cập nhật OTA nào trên thiết bị này.
              </Text>
            ) : (
              updateHistory.map((item, idx) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyItemHeader}>
                    <Text style={styles.historyItemBadge}>
                      #{updateHistory.length - idx} • {item.channel}
                    </Text>
                    <Text style={styles.historyItemTime}>
                      {formatDateTime(item.appliedAt)}
                    </Text>
                  </View>
                  <Text style={styles.historyItemId}>ID: {item.updateId}</Text>
                  {item.note && <Text style={styles.historyItemNote}>{item.note}</Text>}
                </View>
              ))
            )}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.modalCheckBtn,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => {
              onClose();
              onCheckUpdate();
            }}
          >
            <Ionicons name="refresh" size={16} color={colors.onPrimary} />
            <Text style={styles.modalCheckBtnText}>Kiểm tra bản cập nhật mới</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '82%',
      backgroundColor: colors.surfaceElevated,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      ...Typography.title,
      color: colors.text,
    },
    modalCloseBtn: {
      width: TouchTarget.minSize,
      height: TouchTarget.minSize,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -Spacing.sm,
    },
    currentBuildBox: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      padding: Spacing.md,
      gap: Spacing.xs,
    },
    currentBuildTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 2,
    },
    currentBuildDetail: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    historySectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    historyList: {
      maxHeight: 220,
    },
    emptyHistoryText: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: Spacing.lg,
    },
    historyItem: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      gap: Spacing.xs,
    },
    historyItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    historyItemBadge: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    historyItemTime: {
      color: colors.textMuted,
      fontSize: 11,
    },
    historyItemId: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    historyItemNote: {
      color: colors.text,
      fontSize: 12,
    },
    modalCheckBtn: {
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      gap: 6,
    },
    modalCheckBtnText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
