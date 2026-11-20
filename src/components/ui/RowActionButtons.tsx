import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Spacing, TouchTarget } from '../../constants/theme';

interface RowActionButtonsProps {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
}

export const RowActionButtons: React.FC<RowActionButtonsProps> = ({
  onEdit,
  onDelete,
  editLabel = 'Sửa',
  deleteLabel = 'Xóa',
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.65 }]}
        hitSlop={TouchTarget.hitSlop}
        accessibilityLabel={editLabel}
        accessibilityRole="button"
      >
        <Ionicons name="create-outline" size={18} color={colors.info} />
      </Pressable>
      <Pressable
        onPress={onDelete}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.65 }]}
        hitSlop={TouchTarget.hitSlop}
        accessibilityLabel={deleteLabel}
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={18} color={colors.expense} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  btn: {
    padding: Spacing.xs,
  },
});
