import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../models/types';
import { formatCurrency, formatDate, formatTime } from '../utils/formatters';
import { GardenSprouts } from './GardenDecor';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  Typography,
  TouchTarget,
} from '../constants/theme';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!transaction) return null;

  const isIncome = transaction.type === 'income';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.detailCard}>
          <GardenSprouts variant="modal" />
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>Chi tiết giao dịch</Text>
            <Pressable
              style={styles.modalCloseBtn}
              onPress={onClose}
              hitSlop={TouchTarget.hitSlop}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.detailAmountBox}>
            <Text
              style={[
                styles.detailAmount,
                { color: isIncome ? colors.income : colors.expense },
              ]}
            >
              {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
            </Text>
            <Text style={styles.detailCategory}>{transaction.categoryName}</Text>
          </View>

          <View style={styles.detailInfoList}>
            <View style={styles.detailNoteCard}>
              <View style={styles.detailNoteHeader}>
                <Ionicons name="document-text" size={15} color={colors.primary} />
                <Text style={styles.detailNoteLabel}>Ghi chú giao dịch</Text>
              </View>
              <Text style={styles.detailNoteText}>
                {transaction.note || '(Chưa có ghi chú)'}
              </Text>
            </View>

            <View style={styles.detailInfoRow}>
              <Text style={styles.detailLabel}>Thời gian</Text>
              <Text style={styles.detailValue}>
                {formatDate(transaction.timestamp)} lúc {formatTime(transaction.timestamp)}
              </Text>
            </View>

            <View style={styles.detailInfoRow}>
              <Text style={styles.detailLabel}>Nguồn tiền</Text>
              <Text style={styles.detailValue}>{transaction.source}</Text>
            </View>

            {transaction.referenceCode ? (
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailLabel}>Mã GD</Text>
                <Text style={styles.detailValue}>{transaction.referenceCode}</Text>
              </View>
            ) : null}

            {transaction.balanceAfter ? (
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailLabel}>Số dư sau GD</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(transaction.balanceAfter)}
                </Text>
              </View>
            ) : null}

            {transaction.rawContent ? (
              <View style={styles.rawBoxDetail}>
                <Text style={styles.rawBoxLabel}>Thông báo gốc</Text>
                <Text style={styles.rawBoxContent}>{transaction.rawContent}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.detailActionsRow}>
            <Pressable
              style={({ pressed }) => [styles.detailEditBtn, pressed && { opacity: 0.78 }]}
              onPress={() => onEdit(transaction)}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={styles.detailEditText}>Chỉnh sửa</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.detailDeleteBtn, pressed && { opacity: 0.78 }]}
              onPress={() => onDelete(transaction)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.expense} />
              <Text style={styles.detailDeleteText}>Xóa</Text>
            </Pressable>
          </View>
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
    detailCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surfaceElevated,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.lg,
    },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.base,
    },
    detailTitle: {
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
    detailAmountBox: {
      alignItems: 'center',
      paddingVertical: Spacing.base,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.lg,
      marginBottom: Spacing.base,
    },
    detailAmount: {
      ...Typography.display,
      fontVariant: ['tabular-nums'],
    },
    detailCategory: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
      marginTop: Spacing.xs,
    },
    detailInfoList: {
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    detailNoteCard: {
      backgroundColor: colors.primarySoft,
      padding: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
    },
    detailNoteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: Spacing.xs,
    },
    detailNoteLabel: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    detailNoteText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    detailInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    detailLabel: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    detailValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    rawBoxDetail: {
      backgroundColor: colors.surfaceSecondary,
      padding: Spacing.md,
      borderRadius: Radius.md,
      marginTop: Spacing.xs,
    },
    rawBoxLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: Spacing.xs,
    },
    rawBoxContent: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    detailActionsRow: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    detailEditBtn: {
      flex: 1,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      gap: 6,
    },
    detailEditText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    detailDeleteBtn: {
      flex: 1,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.expenseSoft,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.expenseBorder,
      gap: 6,
    },
    detailDeleteText: {
      color: colors.expense,
      fontSize: 14,
      fontWeight: '700',
    },
  });
