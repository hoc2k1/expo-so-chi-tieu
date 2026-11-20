import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { Category, TransactionType } from '../../models/types';
import { CategoryNoteFormModal } from '../../components/CategoryNoteFormModal';
import { DraggableReorderList } from '../../components/DraggableReorderList';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ChibiCategoryBadge, SpringPressable } from '../../components/Motion';
import { TypeSwitcher } from '../../components/ui/TypeSwitcher';
import { RowActionButtons } from '../../components/ui/RowActionButtons';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  TouchTarget,
} from '../../constants/theme';

export default function CategoryEditModal() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    showToast,
  } = useApp();

  const [filterType, setFilterType] = useState<TransactionType>('expense');
  const [isDragging, setIsDragging] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);

  const list = useMemo(
    () => categories.filter((c) => c.type === filterType),
    [categories, filterType]
  );

  const handleOpenAdd = () => {
    setEditingCat(null);
    setModalVisible(true);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCat(cat);
    setModalVisible(true);
  };

  const handleSaveCategory = async (data: {
    name: string;
    color: string;
    icon: string;
    type: TransactionType;
    editing?: Category | null;
  }) => {
    const trimmed = data.name.trim();
    if (!trimmed) {
      showToast('Vui lòng nhập tên danh mục', 'error');
      return false;
    }

    if (data.editing) {
      await updateCategory({
        ...data.editing,
        name: trimmed,
        color: data.color,
        icon: data.icon,
      });
      showToast(`Đã cập nhật danh mục "${trimmed}"!`, 'success');
    } else {
      await addCategory({
        name: trimmed,
        type: data.type,
        color: data.color,
        icon: data.icon,
      });
      showToast(`Đã thêm danh mục "${trimmed}"!`, 'success');
    }
    return true;
  };

  const handleConfirmDelete = async () => {
    if (!catToDelete) return;
    await deleteCategory(catToDelete.id);
    showToast(`Đã xóa danh mục "${catToDelete.name}"!`, 'info');
    setCatToDelete(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        scrollEnabled={!isDragging}
      >
        <View style={styles.topRow}>
          <TypeSwitcher
            value={filterType}
            onChange={setFilterType}
            showSprouts={false}
            style={{ flex: 1 }}
          />

          <SpringPressable style={styles.addBtn} onPress={handleOpenAdd}>
            <Ionicons name="add" size={18} color={colors.onPrimary} />
            <Text style={styles.addBtnText}>Thêm</Text>
          </SpringPressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Danh sách hiện có ({list.length})</Text>
            <Text style={styles.dragHint}>Kéo ☰ để đổi vị trí</Text>
          </View>

          <DraggableReorderList
            items={list}
            itemHeight={58}
            itemGap={8}
            onScrollLockChange={setIsDragging}
            onReorder={(ordered) => reorderCategories(filterType, ordered)}
            renderContent={(cat) => (
              <View style={styles.catInner}>
                <ChibiCategoryBadge icon={cat.icon} color={cat.color} size={36} />
                <Text style={styles.catName} numberOfLines={1}>
                  {cat.name}
                </Text>
                <RowActionButtons
                  onEdit={() => handleStartEdit(cat)}
                  onDelete={() => setCatToDelete(cat)}
                  editLabel={`Sửa ${cat.name}`}
                  deleteLabel={`Xóa ${cat.name}`}
                />
              </View>
            )}
          />
        </View>
      </ScrollView>

      <CategoryNoteFormModal
        visible={modalVisible}
        mode="category"
        categoryType={filterType}
        editingCategory={editingCat}
        categories={categories}
        onClose={() => setModalVisible(false)}
        onSaveCategory={handleSaveCategory}
        onSaveNote={async () => false}
      />

      <ConfirmModal
        visible={!!catToDelete}
        title="Xác nhận xóa phân loại"
        message={
          catToDelete
            ? `Bạn có chắc chắn muốn xóa phân loại "${catToDelete.name}" không? Dữ liệu đã xóa không thể khôi phục.`
            : ''
        }
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        type="danger"
        onCancel={() => setCatToDelete(null)}
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
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    addBtn: {
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      gap: Spacing.xs,
    },
    addBtnText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    dragHint: {
      color: colors.textMuted,
      fontSize: 11,
    },
    catInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    catName: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
  });
