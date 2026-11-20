import React, { useMemo } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category, TransactionType } from '../models/types';
import { SaveTemplateCheckbox } from './ui/SaveTemplateCheckbox';
import { useTheme, ThemeColors, Spacing, Radius } from '../constants/theme';

interface CategoryPickerSectionProps {
  txType: TransactionType;
  categories: Category[];
  selectedCatId: string;
  customCatName: string;
  saveCustomCat: boolean;
  onSelectCategory: (cat: Category) => void;
  onChangeCustomCatName: (val: string) => void;
  onToggleSaveCustomCat: () => void;
}

export function CategoryPickerSection({
  txType,
  categories,
  selectedCatId,
  customCatName,
  saveCustomCat,
  onSelectCategory,
  onChangeCustomCatName,
  onToggleSaveCustomCat,
}: CategoryPickerSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isIncome = txType === 'income';

  return (
    <View style={styles.section}>
      <Text style={styles.label}>
        Chọn Phân loại ({isIncome ? 'Thu nhập' : 'Chi tiêu'})
      </Text>
      <View style={styles.catGrid}>
        {categories.map((cat) => {
          const isSelected = selectedCatId === cat.id && !customCatName.trim();
          return (
            <Pressable
              key={cat.id}
              style={[
                styles.catItem,
                isSelected && {
                  borderColor: cat.color,
                  backgroundColor: `${cat.color}25`,
                },
              ]}
              onPress={() => onSelectCategory(cat)}
            >
              <Ionicons name={cat.icon as any} size={20} color={cat.color} />
              <Text
                style={[
                  styles.catItemName,
                  isSelected && { color: colors.text, fontWeight: '700' },
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.customCatBox}>
        <Text style={styles.subLabel}>Hoặc tự nhập Phân loại mới:</Text>
        <TextInput
          style={styles.textInput}
          placeholder="VD: Nuôi thú cưng, Sửa nhà..."
          placeholderTextColor={colors.textMuted}
          value={customCatName}
          onChangeText={onChangeCustomCatName}
        />
        {customCatName.trim().length > 0 && (
          <SaveTemplateCheckbox
            checked={saveCustomCat}
            label="Lưu vào danh sách mẫu để lần sau chọn nhanh"
            onToggle={onToggleSaveCustomCat}
          />
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 10,
    },
    subLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      marginBottom: 6,
    },
    catGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    catItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: Spacing.sm,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    catItemName: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    customCatBox: {
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 10,
    },
    textInput: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 13,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
