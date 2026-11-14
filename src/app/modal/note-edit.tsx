import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { SavedNote } from '../../models/types';
import { CategoryNoteFormModal } from '../../components/CategoryNoteFormModal';
import { DraggableReorderList } from '../../components/DraggableReorderList';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function NoteEditModal() {
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

  const handleDelete = (n: SavedNote) => {
    setNoteToDelete(n);
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
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Ionicons name="add" size={18} color="#0F172A" />
              <Text style={styles.addBtnText}>Thêm</Text>
            </TouchableOpacity>
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
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      onPress={() => handleStartEdit(n)}
                      style={styles.actionIconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="create-outline" size={18} color="#38BDF8" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(n)}
                      style={styles.actionIconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  dragHint: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    color: '#0F172A',
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
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  noteCategory: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconBtn: {
    padding: 4,
  },
});
