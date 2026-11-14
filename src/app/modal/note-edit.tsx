import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { SavedNote } from '../../models/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';

export default function NoteEditModal() {
  const { notes, categories, addNote, updateNote, deleteNote, showToast } = useApp();

  const [newNoteText, setNewNoteText] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>(''); // empty = shared
  const [editingNote, setEditingNote] = useState<SavedNote | null>(null);

  const handleStartEdit = (n: SavedNote) => {
    setEditingNote(n);
    setNewNoteText(n.text);
    setSelectedCatId(n.categoryId || '');
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setNewNoteText('');
    setSelectedCatId('');
  };

  const handleSave = async () => {
    if (!newNoteText.trim()) {
      showToast('Vui lòng nhập nội dung ghi chú', 'error');
      return;
    }

    if (editingNote) {
      await updateNote({
        ...editingNote,
        text: newNoteText.trim(),
        categoryId: selectedCatId || undefined,
      });
      showToast(`Đã cập nhật ghi chú "${newNoteText.trim()}"!`, 'success');
      handleCancelEdit();
    } else {
      await addNote({
        text: newNoteText.trim(),
        categoryId: selectedCatId || undefined,
      });
      showToast(`Đã thêm ghi chú "${newNoteText.trim()}"!`, 'success');
      setNewNoteText('');
    }
  };

  const handleDelete = (n: SavedNote) => {
    Alert.alert('Xóa ghi chú', `Bạn có chắc muốn xóa "${n.text}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          if (editingNote?.id === n.id) {
            handleCancelEdit();
          }
          await deleteNote(n.id);
          showToast(`Đã xóa ghi chú "${n.text}"!`, 'info');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAwareScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Add / Edit note section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {editingNote ? `✏️ Chỉnh sửa: ${editingNote.text}` : '+ Thêm Ghi chú mẫu mới'}
            </Text>
            {editingNote && (
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditBtn}>
                <Text style={styles.cancelEditText}>Hủy sửa</Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={styles.textInput}
            placeholder="Nội dung ghi chú (VD: Ăn sáng, Đổ xăng...)"
            placeholderTextColor="#64748B"
            value={newNoteText}
            onChangeText={setNewNoteText}
          />

          <Text style={styles.label}>Gắn với Phân loại cụ thể:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            <TouchableOpacity
              style={[styles.catPill, !selectedCatId && styles.catPillActive]}
              onPress={() => setSelectedCatId('')}
            >
              <Text style={[styles.catPillText, !selectedCatId && styles.catPillTextActive]}>
                Dùng chung cho mọi loại
              </Text>
            </TouchableOpacity>

            {categories.map((c) => (
              <TouchableOpacity
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
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.addBtn, editingNote && styles.editSaveBtn]}
            onPress={handleSave}
          >
            <Ionicons name={editingNote ? 'checkmark' : 'add'} size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>
              {editingNote ? 'Lưu thay đổi ghi chú' : 'Thêm vào danh sách mẫu'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notes list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh sách Ghi chú hiện có ({notes.length})</Text>
          {notes.map((n) => {
            const linkedCat = categories.find((c) => c.id === n.categoryId);
            return (
              <View key={n.id} style={styles.noteRow}>
                <View style={styles.noteTexts}>
                  <Text style={styles.noteText}>{n.text}</Text>
                  <Text style={styles.noteCategory}>
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
          })}
        </View>
      </KeyboardAwareScrollView>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelEditBtn: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  cancelEditText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  label: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 6,
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catPillActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  catPillText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  catPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  editSaveBtn: {
    backgroundColor: '#3B82F6',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  noteTexts: {
    flex: 1,
  },
  noteText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  noteCategory: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    padding: 4,
  },
});
