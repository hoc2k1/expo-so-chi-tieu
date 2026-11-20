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
import { ChibiCategoryBadge, SpringPressable } from '../../components/Motion';
import { GardenSprouts } from '../../components/GardenDecor';
import { TypeSwitcher } from '../../components/ui/TypeSwitcher';
import { RowActionButtons } from '../../components/ui/RowActionButtons';
import { SettingRow } from '../../components/ui/SettingRow';
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

  const expenseCount = useMemo(
    () => categories.filter((c) => c.type === 'expense').length,
    [categories]
  );
  const incomeCount = useMemo(
    () => categories.filter((c) => c.type === 'income').length,
    [categories]
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
          <GardenSprouts variant="chip" align="left" />
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

        <SpringPressable style={styles.addBtn} onPress={openAddModal}>
          <GardenSprouts variant="chip" align="right" />
          <Ionicons name="add" size={18} color={colors.onPrimary} />
          <Text style={styles.addBtnText}>Thêm</Text>
        </SpringPressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        scrollEnabled={!isDragging}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'category' ? (
          <>
            <TypeSwitcher
              value={filterType}
              onChange={setFilterType}
              expenseLabel={`Chi tiêu (${expenseCount})`}
              incomeLabel={`Thu nhập (${incomeCount})`}
            />

            <View style={styles.groupedCard}>
              <GardenSprouts variant="minimal" />
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
                  onReorder={(ordered) => reorderCategories(filterType, ordered)}
                  renderContent={(cat) => (
                    <View style={styles.itemInner}>
                      <ChibiCategoryBadge icon={cat.icon} color={cat.color} size={38} />
                      <Text style={styles.catName} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      <RowActionButtons
                        onEdit={() => openEditCategory(cat)}
                        onDelete={() =>
                          setDeleteConfirmTarget({
                            type: 'category',
                            id: cat.id,
                            name: cat.name,
                          })
                        }
                        editLabel={`Sửa ${cat.name}`}
                        deleteLabel={`Xóa ${cat.name}`}
                      />
                    </View>
                  )}
                />
              )}
            </View>
          </>
        ) : (
          <View style={styles.groupedCard}>
            <GardenSprouts variant="minimal" />
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
                onReorder={(ordered) => reorderNotes(ordered)}
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
                      <RowActionButtons
                        onEdit={() => openEditNote(n)}
                        onDelete={() =>
                          setDeleteConfirmTarget({
                            type: 'note',
                            id: n.id,
                            name: n.text,
                          })
                        }
                        editLabel={`Sửa ghi chú ${n.text}`}
                        deleteLabel={`Xóa ghi chú ${n.text}`}
                      />
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
          <View style={{ position: 'relative', overflow: 'visible' }}>
            <GardenSprouts variant="minimal" />
            <View style={styles.groupedCardCompact}>
              <SettingRow
                icon="flash"
                iconColor={colors.warning}
                iconBg={colors.warningSoft}
                title="Quy tắc từ khóa gợi ý tự động"
                onPress={() => router.push('/modal/rule-edit')}
                showChevron
              />
              <SettingRow
                icon="apps"
                iconColor={colors.primary}
                iconBg={colors.primarySoft}
                title="Danh sách App Ngân hàng & Ví"
                onPress={() => router.push('/modal/apps-manager')}
                showChevron
                isLast
              />
            </View>
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
      padding: Spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.xs,
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
      gap: Spacing.xs,
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
      gap: Spacing.sm,
    },
    catName: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    noteTexts: {
      flex: 1,
      justifyContent: 'center',
      gap: 2,
    },
    noteTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    noteCategory: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    groupedSection: {
      marginTop: Spacing.xs,
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
  });
