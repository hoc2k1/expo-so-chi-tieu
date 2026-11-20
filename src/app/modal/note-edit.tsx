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
import { SavedNote } from '../../models/types';
import { CategoryNoteFormModal } from '../../components/CategoryNoteFormModal';
import { DraggableReorderList } from '../../components/DraggableReorderList';
import { ConfirmModal } from '../../components/ConfirmModal';
import { SpringPressable } from '../../components/Motion';
import { RowActionButtons } from '../../components/ui/RowActionButtons';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  TouchTarget,
} from '../../constants/theme';

export default function NoteEditModal() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    notes,
    categories,
    addNote,
    updateNote,
    deleteNote,
    reorderNotes,
    showToast,
  } = useApp();

  const [isDragging, setIsDragging] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<SavedNote | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<SavedNote | null>(null);

  const handleOpenAdd = () => {
    setEditingNote(null);
    setModalVisible(true);
  };

  const handleStartEdit = (n: SavedNote) => {
    setEditingNote(n);
    setModalVisible(true);
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
    if (!noteToDelete) return;
    await deleteNote(noteToDelete.id);
    showToast(`Đã xóa ghi chú "${noteToDelete.text}"!`, 'info');
    setNoteToDelete(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        scrollEnabled={!isDragging}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Danh sách Ghi chú hiện có ({notes.length})
              </Text>
              <Text style={styles.dragHint}>Kéo ☰ để đổi vị trí</Text>
            </View>
            <SpringPressable style={styles.addBtn} onPress={handleOpenAdd}>
              <Ionicons name="add" size={18} color={colors.onPrimary} />
              <Text style={styles.addBtnText}>Thêm</Text>
            </SpringPressable>
          </View>

          <DraggableReorderList
            items={notes}
            itemHeight={60}
            itemGap={8}
            onScrollLockChange={setIsDragging}
            onReorder={(ordered) => reorderNotes(ordered)}
            renderContent={(n) => {
              const linkedCat = categories.find((c) => c.id === n.categoryId);
              return (
                <View style={styles.noteInner}>
                  <View style={styles.noteTexts}>
                    <Text style={styles.noteText} numberOfLines={1}>
                      {n.text}
                    </Text>
                    <Text style={styles.noteCategory} numberOfLines={1}>
                      {linkedCat ? `Phân loại: ${linkedCat.name}` : 'Dùng chung'}
                    </Text>
                  </View>
                  <RowActionButtons
                    onEdit={() => handleStartEdit(n)}
                    onDelete={() => setNoteToDelete(n)}
                    editLabel={`Sửa ${n.text}`}
                    deleteLabel={`Xóa ${n.text}`}
                  />
                </View>
              );
            }}
          />
        </View>
      </ScrollView>

      <CategoryNoteFormModal
        visible={modalVisible}
        mode="note"
        editingNote={editingNote}
        categories={categories}
        onClose={() => setModalVisible(false)}
        onSaveCategory={async () => false}
        onSaveNote={handleSaveNote}
      />

      <ConfirmModal
        visible={!!noteToDelete}
        title="Xác nhận xóa ghi chú"
        message={
          noteToDelete
            ? `Bạn có chắc muốn xóa ghi chú "${noteToDelete.text}" không? Dữ liệu đã xóa không thể khôi phục.`
            : ''
        }
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        type="danger"
        onCancel={() => setNoteToDelete(null)}
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
      marginTop: 2,
    },
    addBtn: {
      minHeight: TouchTarget.minSize - 6,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.sm,
      gap: Spacing.xs,
    },
    addBtnText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    noteInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    noteTexts: {
      flex: 1,
      justifyContent: 'center',
    },
    noteText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    noteCategory: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
  });
