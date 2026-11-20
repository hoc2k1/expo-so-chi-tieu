import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { AutoRule } from '../../models/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { ConfirmModal } from '../../components/ConfirmModal';
import { SpringPressable } from '../../components/Motion';
import { RowActionButtons } from '../../components/ui/RowActionButtons';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
} from '../../constants/theme';

export default function RuleEditModal() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { rules, categories, addRule, updateRule, deleteRule, showToast } = useApp();

  const [keyword, setKeyword] = useState('');
  const [selectedCatId, setSelectedCatId] = useState(categories[0]?.id || '');
  const [note, setNote] = useState('');
  const [editingRule, setEditingRule] = useState<AutoRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<AutoRule | null>(null);

  const handleStartEdit = (r: AutoRule) => {
    setEditingRule(r);
    setKeyword(r.keyword);
    setSelectedCatId(r.categoryId);
    setNote(r.note || '');
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
    setKeyword('');
    setSelectedCatId(categories[0]?.id || '');
    setNote('');
  };

  const handleSave = async () => {
    if (!keyword.trim()) {
      showToast('Vui lòng nhập từ khóa nhận diện trong thông báo', 'error');
      return;
    }

    const cat = categories.find((c) => c.id === selectedCatId);
    if (!cat) {
      showToast('Vui lòng chọn 1 danh mục phân loại', 'error');
      return;
    }

    const cleanKeyword = keyword.trim().toUpperCase();

    if (editingRule) {
      await updateRule({
        ...editingRule,
        keyword: cleanKeyword,
        categoryId: cat.id,
        categoryName: cat.name,
        note: note.trim() || cat.name,
      });
      showToast(`Đã cập nhật quy tắc "${cleanKeyword}"!`, 'success');
      handleCancelEdit();
    } else {
      await addRule({
        keyword: cleanKeyword,
        categoryId: cat.id,
        categoryName: cat.name,
        note: note.trim() || cat.name,
      });
      showToast(`Đã thêm quy tắc "${cleanKeyword}"!`, 'success');
      setKeyword('');
      setNote('');
    }
  };

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;
    if (editingRule?.id === ruleToDelete.id) {
      handleCancelEdit();
    }
    await deleteRule(ruleToDelete.id);
    showToast(`Đã xóa quy tắc "${ruleToDelete.keyword}"!`, 'info');
    setRuleToDelete(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAwareScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.introBox}>
          <Ionicons name="sparkles" size={18} color={colors.warning} />
          <Text style={styles.introText}>
            Khi thông báo ngân hàng chứa từ khóa khớp, hệ thống sẽ tự động gợi ý sẵn Phân loại và Ghi chú trong Hàng chờ.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {editingRule ? `Chỉnh sửa: ${editingRule.keyword}` : '+ Thêm Quy tắc từ khóa mới'}
            </Text>
            {editingRule && (
              <Pressable onPress={handleCancelEdit} style={styles.cancelEditBtn}>
                <Text style={styles.cancelEditText}>Hủy sửa</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.label}>Từ khóa nhận diện (VD: GRAB, SHOPEE, HIGHLANDS...):</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập từ khóa không dấu hoặc có dấu..."
            placeholderTextColor={colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Ánh xạ vào Phân loại:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {categories.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.catPill, selectedCatId === c.id && styles.catPillActive]}
                onPress={() => setSelectedCatId(c.id)}
              >
                <Text
                  style={[
                    styles.catPillText,
                    selectedCatId === c.id && styles.catPillTextActive,
                  ]}
                >
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Ghi chú gợi ý mặc định:</Text>
          <TextInput
            style={styles.textInput}
            placeholder="VD: Cà phê Highland, Grab Food..."
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
          />

          <SpringPressable
            style={[styles.addBtn, editingRule && styles.editSaveBtn]}
            onPress={handleSave}
          >
            <Ionicons name={editingRule ? 'checkmark' : 'add'} size={18} color={colors.onPrimary} />
            <Text style={styles.addBtnText}>
              {editingRule ? 'Lưu thay đổi quy tắc' : 'Lưu quy tắc gợi ý'}
            </Text>
          </SpringPressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quy tắc đang hoạt động ({rules.length})</Text>
          {rules.map((r) => (
            <View key={r.id} style={styles.ruleRow}>
              <View style={styles.ruleTexts}>
                <View style={styles.keywordBadge}>
                  <Text style={styles.keywordText}>{r.keyword}</Text>
                </View>
                <Text style={styles.ruleMapping}>
                  → {r.categoryName} {r.note ? `• ${r.note}` : ''}
                </Text>
              </View>
              <RowActionButtons
                onEdit={() => handleStartEdit(r)}
                onDelete={() => setRuleToDelete(r)}
                editLabel={`Sửa ${r.keyword}`}
                deleteLabel={`Xóa ${r.keyword}`}
              />
            </View>
          ))}
        </View>
      </KeyboardAwareScrollView>

      <ConfirmModal
        visible={!!ruleToDelete}
        title="Xác nhận xóa quy tắc"
        message={
          ruleToDelete
            ? `Bạn có chắc muốn xóa quy tắc gợi ý cho từ khóa "${ruleToDelete.keyword}" không?`
            : ''
        }
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        type="danger"
        onCancel={() => setRuleToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: Spacing.base,
      paddingBottom: Spacing.xxl,
    },
    introBox: {
      flexDirection: 'row',
      backgroundColor: colors.warningSoft,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      borderRadius: Radius.sm,
      padding: Spacing.md,
      marginBottom: Spacing.base,
      gap: Spacing.sm,
    },
    introText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 18,
      flex: 1,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    cancelEditBtn: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelEditText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    label: {
      color: colors.textSecondary,
      fontSize: 11,
      marginBottom: 6,
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
      marginBottom: Spacing.md,
    },
    catScroll: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    catPill: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      marginRight: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    catPillText: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    catPillTextActive: {
      color: colors.onPrimary,
      fontWeight: '700',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: Radius.sm,
      paddingVertical: Spacing.md,
      gap: 6,
    },
    editSaveBtn: {
      backgroundColor: colors.income,
    },
    addBtnText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    ruleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    ruleTexts: {
      flex: 1,
    },
    keywordBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primarySoft,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      marginBottom: Spacing.xs,
    },
    keywordText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    ruleMapping: {
      color: colors.textSecondary,
      fontSize: 12,
    },
  });
