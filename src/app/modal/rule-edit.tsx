import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { AutoRule } from '../../models/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function RuleEditModal() {
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

  const handleDelete = (r: AutoRule) => {
    setRuleToDelete(r);
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
        {/* Intro */}
        <View style={styles.introBox}>
          <Ionicons name="sparkles" size={18} color="#F59E0B" />
          <Text style={styles.introText}>
            Khi thông báo ngân hàng chứa từ khóa khớp, hệ thống sẽ tự động gợi ý sẵn Phân loại và Ghi chú trong Hàng chờ.
          </Text>
        </View>

        {/* Add / Edit rule */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {editingRule ? `✏️ Chỉnh sửa: ${editingRule.keyword}` : '+ Thêm Quy tắc từ khóa mới'}
            </Text>
            {editingRule && (
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditBtn}>
                <Text style={styles.cancelEditText}>Hủy sửa</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.label}>Từ khóa nhận diện (VD: GRAB, SHOPEE, HIGHLANDS...):</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập từ khóa không dấu hoặc có dấu..."
            placeholderTextColor="#64748B"
            value={keyword}
            onChangeText={setKeyword}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Ánh xạ vào Phân loại:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
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

          <Text style={styles.label}>Ghi chú gợi ý mặc định:</Text>
          <TextInput
            style={styles.textInput}
            placeholder="VD: Cà phê Highland, Grab Food..."
            placeholderTextColor="#64748B"
            value={note}
            onChangeText={setNote}
          />

          <TouchableOpacity
            style={[styles.addBtn, editingRule && styles.editSaveBtn]}
            onPress={handleSave}
          >
            <Ionicons name={editingRule ? 'checkmark' : 'add'} size={18} color="#FFFFFF" />
            <Text style={[styles.addBtnText, editingRule && { color: '#FFFFFF' }]}>
              {editingRule ? 'Lưu thay đổi quy tắc' : 'Lưu quy tắc gợi ý'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rules list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quy tắc đang hoạt động ({rules.length})</Text>
          {rules.map((r) => (
            <View key={r.id} style={styles.ruleRow}>
              <View style={styles.ruleTexts}>
                <View style={styles.keywordBadge}>
                  <Text style={styles.keywordText}>{r.keyword}</Text>
                </View>
                <Text style={styles.ruleMapping}>
                  👉 {r.categoryName} {r.note ? `• ${r.note}` : ''}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  onPress={() => handleStartEdit(r)}
                  style={styles.actionIconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="create-outline" size={18} color="#38BDF8" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(r)}
                  style={styles.actionIconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  introBox: {
    flexDirection: 'row',
    backgroundColor: '#78350F25',
    borderWidth: 1,
    borderColor: '#F59E0B40',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  introText: {
    color: '#FDE68A',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
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
  label: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 6,
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
    marginBottom: 12,
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 12,
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
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  catPillText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  catPillTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  editSaveBtn: {
    backgroundColor: '#10B981',
  },
  addBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  ruleTexts: {
    flex: 1,
  },
  keywordBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#38BDF8',
    marginBottom: 4,
  },
  keywordText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  ruleMapping: {
    color: '#CBD5E1',
    fontSize: 12,
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
