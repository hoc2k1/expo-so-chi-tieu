import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { Category, SavedNote, TransactionType } from '../../models/types';
import { CategoryNoteFormModal } from '../../components/CategoryNoteFormModal';
import { DraggableReorderList } from '../../components/DraggableReorderList';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  Typography,
  TouchTarget,
  Shadows,
} from '../../constants/theme';

type ManageTab = 'category' | 'note';

export default function CategoriesManageScreen() {
  const {
    categories,
    notes,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    addNote,
    updateNote,
    deleteNote,
    reorderNotes,
    showToast,
  } = useApp();

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<ManageTab>('category');
  const [filterType, setFilterType] = useState<TransactionType>('expense');
  const [isDragging, setIsDragging] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingNote, setEditingNote] = useState<SavedNote | null>(null);

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'category' | 'note';
    id: string;
    name: string;
  } | null>(null);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === filterType),
    [categories, filterType]
  );

  const openAddModal = () => {
    setEditingCategory(null);
    setEditingNote(null);
    setModalVisible(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditingNote(null);
    setModalVisible(true);
  };

  const openEditNote = (note: SavedNote) => {
    setEditingNote(note);
    setEditingCategory(null);
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
      showToast('Vui lòng nhập tên phân loại', 'error');
      return false;
    }

    if (data.editing) {
      await updateCategory({
        ...data.editing,
        name: trimmed,
        color: data.color,
        icon: data.icon,
      });
      showToast(`Đã cập nhật phân loại "${trimmed}"!`, 'success');
    } else {
      await addCategory({
        name: trimmed,
        type: data.type,
        color: data.color,
        icon: data.icon,
      });
      showToast(`Đã thêm phân loại "${trimmed}"!`, 'success');
    }
    return true;
  };

  const handleSaveNote = async (data: {
    text: string;
    categoryId?: string;
    editing?: SavedNote | null;
  }) => {
    const trimmed = data.text.trim();
    if (!trimmed) {
      showToast('Vui lòng nhập nội dung ghi chú', 'error');
      return false;
    }

    if (data.editing) {
      await updateNote({
        ...data.editing,
        text: trimmed,
        categoryId: data.categoryId || undefined,
      });
      showToast(`Đã cập nhật ghi chú "${trimmed}"!`, 'success');
    } else {
      await addNote({
        text: trimmed,
        categoryId: data.categoryId || undefined,
      });
      showToast(`Đã thêm ghi chú "${trimmed}"!`, 'success');
    }
    return true;
  };

  const handleDeleteCategory = (cat: Category) => {
    setDeleteConfirmTarget({
      type: 'category',
      id: cat.id,
      name: cat.name,
    });
  };

  const handleDeleteNote = (note: SavedNote) => {
    setDeleteConfirmTarget({
      type: 'note',
      id: note.id,
      name: note.text,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.type === 'category') {
      await deleteCategory(deleteConfirmTarget.id);
      showToast(`Đã xóa phân loại "${deleteConfirmTarget.name}"!`, 'info');
    } else {
      await deleteNote(deleteConfirmTarget.id);
      showToast(`Đã xóa ghi chú "${deleteConfirmTarget.name}"!`, 'info');
    }
    setDeleteConfirmTarget(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Top Segmented Tabs + Add Button */}
      <View style={styles.topBar}>
        <View style={styles.segmentBar}>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'category' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('category')}
          >
            <Ionicons
              name="pricetags"
              size={15}
              color={activeTab === 'category' ? colors.onPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'category' && styles.segmentTextActive,
              ]}
            >
              Phân loại
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, activeTab === 'note' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('note')}
          >
            <Ionicons
              name="document-text"
              size={15}
              color={activeTab === 'note' ? colors.onPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'note' && styles.segmentTextActive,
              ]}
            >
              Ghi chú mẫu
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
          onPress={openAddModal}
        >
          <Ionicons name="add" size={18} color={colors.onPrimary} />
          <Text style={styles.addBtnText}>Thêm</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        scrollEnabled={!isDragging}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'category' ? (
          <>
            {/* Expense / Income Sub-switcher */}
            <View style={styles.typeSwitcher}>
              <Pressable
                style={[
                  styles.typeBtn,
                  filterType === 'expense' && styles.typeBtnActiveExpense,
                ]}
                onPress={() => setFilterType('expense')}
              >
                <Text
                  style={[
                    styles.typeText,
                    filterType === 'expense' && styles.typeTextActive,
                  ]}
                >
                  Chi tiêu ({categories.filter((c) => c.type === 'expense').length})
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.typeBtn,
                  filterType === 'income' && styles.typeBtnActiveIncome,
                ]}
                onPress={() => setFilterType('income')}
              >
                <Text
                  style={[
                    styles.typeText,
                    filterType === 'income' && styles.typeTextActive,
                  ]}
                >
                  Thu nhập ({categories.filter((c) => c.type === 'income').length})
                </Text>
              </Pressable>
            </View>

            <View style={styles.groupedCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Danh sách phân loại ({filteredCategories.length})
                </Text>
                <Text style={styles.dragHint}>Kéo ☰ để sắp xếp</Text>
              </View>

              {filteredCategories.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Chưa có phân loại nào.</Text>
                </View>
              ) : (
                <DraggableReorderList
                  items={filteredCategories}
                  itemHeight={60}
                  itemGap={8}
                  onScrollLockChange={setIsDragging}
                  onReorder={(ordered) => {
                    reorderCategories(filterType, ordered);
                  }}
                  renderContent={(cat) => (
                    <View style={styles.itemInner}>
                      <View
                        style={[
                          styles.catIconBox,
                          { backgroundColor: `${cat.color}1F` },
                        ]}
                      >
                        <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                      </View>
                      <Text style={styles.catName} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      <View style={styles.rowActions}>
                        <Pressable
                          onPress={() => openEditCategory(cat)}
                          style={({ pressed }) => [
                            styles.actionIconBtn,
                            pressed && { opacity: 0.65 },
                          ]}
                          hitSlop={TouchTarget.hitSlop}
                          accessibilityLabel={`Sửa ${cat.name}`}
                        >
                          <Ionicons name="create-outline" size={18} color={colors.info} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteCategory(cat)}
                          style={({ pressed }) => [
                            styles.actionIconBtn,
                            pressed && { opacity: 0.65 },
                          ]}
                          hitSlop={TouchTarget.hitSlop}
                          accessibilityLabel={`Xóa ${cat.name}`}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.expense} />
                        </Pressable>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </>
        ) : (
          <View style={styles.groupedCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Danh sách Ghi chú mẫu ({notes.length})
              </Text>
              <Text style={styles.dragHint}>Kéo ☰ để sắp xếp</Text>
            </View>

            {notes.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Chưa có ghi chú mẫu nào.</Text>
              </View>
            ) : (
              <DraggableReorderList
                items={notes}
                itemHeight={62}
                itemGap={8}
                onScrollLockChange={setIsDragging}
                onReorder={(ordered) => {
                  reorderNotes(ordered);
                }}
                renderContent={(n) => {
                  const linkedCat = categories.find((c) => c.id === n.categoryId);
                  return (
                    <View style={styles.itemInner}>
                      <View style={styles.noteTexts}>
                        <Text style={styles.noteTitle} numberOfLines={1}>
                          {n.text}
                        </Text>
                        <Text style={styles.noteCategory} numberOfLines={1}>
                          {linkedCat
                            ? `Phân loại: ${linkedCat.name}`
                            : 'Dùng chung mọi loại'}
                        </Text>
                      </View>
                      <View style={styles.rowActions}>
                        <Pressable
                          onPress={() => openEditNote(n)}
                          style={({ pressed }) => [
                            styles.actionIconBtn,
                            pressed && { opacity: 0.65 },
                          ]}
                          hitSlop={TouchTarget.hitSlop}
                          accessibilityLabel={`Sửa ghi chú ${n.text}`}
                        >
                          <Ionicons name="create-outline" size={18} color={colors.info} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteNote(n)}
                          style={({ pressed }) => [
                            styles.actionIconBtn,
                            pressed && { opacity: 0.65 },
                          ]}
                          hitSlop={TouchTarget.hitSlop}
                          accessibilityLabel={`Xóa ghi chú ${n.text}`}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.expense} />
                        </Pressable>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        )}

        {/* Grouped Automation Tools Card */}
        <View style={styles.groupedSection}>
          <Text style={styles.groupOverline}>CÔNG CỤ PHÂN LOẠI TỰ ĐỘNG</Text>
          <View style={styles.groupedCardCompact}>
            <Pressable
              style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.75 }]}
              onPress={() => router.push('/modal/rule-edit')}
            >
              <View style={[styles.navIconBox, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="flash" size={18} color={colors.warning} />
              </View>
              <Text style={styles.navTitle}>Quy tắc từ khóa gợi ý tự động</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navRow,
                styles.navRowLast,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => router.push('/modal/apps-manager')}
            >
              <View style={[styles.navIconBox, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="apps" size={18} color={colors.primary} />
              </View>
              <Text style={styles.navTitle}>Danh sách App Ngân hàng & Ví</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <CategoryNoteFormModal
        visible={modalVisible}
        mode={activeTab}
        categoryType={filterType}
        editingCategory={editingCategory}
        editingNote={editingNote}
        categories={categories}
        onClose={() => setModalVisible(false)}
        onSaveCategory={handleSaveCategory}
        onSaveNote={handleSaveNote}
      />

      <ConfirmModal
        visible={!!deleteConfirmTarget}
        title={
          deleteConfirmTarget?.type === 'category'
            ? 'Xác nhận xóa phân loại'
            : 'Xác nhận xóa ghi chú'
        }
        message={
          deleteConfirmTarget
            ? `Bạn có chắc muốn xóa "${deleteConfirmTarget.name}" không? Dữ liệu đã xóa không thể khôi phục.`
            : ''
        }
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        type="danger"
        onCancel={() => setDeleteConfirmTarget(null)}
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
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    segmentBar: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.sm,
      gap: 6,
    },
    segmentBtnActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    segmentTextActive: {
      color: colors.onPrimary,
      fontWeight: '700',
    },
    addBtn: {
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.base,
      borderRadius: Radius.md,
      gap: 4,
    },
    addBtnText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: Spacing.base,
      paddingBottom: Spacing.xxxl,
      gap: Spacing.base,
    },
    typeSwitcher: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    typeBtn: {
      flex: 1,
      minHeight: TouchTarget.minSize - 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.md,
    },
    typeBtnActiveExpense: {
      backgroundColor: colors.expense,
    },
    typeBtnActiveIncome: {
      backgroundColor: colors.income,
    },
    typeText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    typeTextActive: {
      color: '#FFFFFF',
    },
    groupedCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      padding: Spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.card,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    sectionTitle: {
      ...Typography.subtitle,
      color: colors.text,
    },
    dragHint: {
      ...Typography.caption,
      color: colors.textMuted,
    },
    emptyBox: {
      paddingVertical: Spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      ...Typography.body,
      color: colors.textSecondary,
    },
    itemInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    catIconBox: {
      width: 36,
      height: 36,
      borderRadius: Radius.sm + 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catName: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    noteTexts: {
      flex: 1,
      gap: 2,
    },
    noteTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    noteCategory: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionIconBtn: {
      width: TouchTarget.minSize - 4,
      height: TouchTarget.minSize - 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.sm,
    },
    groupedSection: {
      gap: Spacing.sm,
    },
    groupOverline: {
      ...Typography.overline,
      color: colors.textMuted,
      paddingHorizontal: Spacing.xs,
    },
    groupedCardCompact: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...Shadows.card,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      minHeight: TouchTarget.minSize + 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      gap: Spacing.md,
    },
    navRowLast: {
      borderBottomWidth: 0,
    },
    navIconBox: {
      width: 34,
      height: 34,
      borderRadius: Radius.sm + 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
  });
