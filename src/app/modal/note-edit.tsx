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

export default function NoteEditModal() {
  const { notes, categories, addNote, deleteNote } = useApp();

  const [newNoteText, setNewNoteText] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>(''); // empty = shared

  const handleAdd = async () => {
    if (!newNoteText.trim()) {
      Alert.alert('Chưa nhập ghi chú', 'Vui lòng nhập nội dung ghi chú.');
      return;
    }

    await addNote({
      text: newNoteText.trim(),
      categoryId: selectedCatId || undefined,
    });

    setNewNoteText('');
  };

  const handleDelete = (n: SavedNote) => {
    Alert.alert('Xóa ghi chú', `Bạn có chắc muốn xóa "${n.text}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteNote(n.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Add note section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>+ Thêm Ghi chú mẫu mới</Text>

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
              <Text style={[styles.catPillText, selectedCatId === c.id && styles.catPillTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Thêm vào danh sách mẫu</Text>
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
              <TouchableOpacity onPress={() => handleDelete(n)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
      </ScrollView>
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
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
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
});

