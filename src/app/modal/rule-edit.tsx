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
import { AutoRule } from '../../models/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';

export default function RuleEditModal() {
  const { rules, categories, addRule, deleteRule } = useApp();

  const [keyword, setKeyword] = useState('');
  const [selectedCatId, setSelectedCatId] = useState(categories[0]?.id || '');
  const [note, setNote] = useState('');

  const handleAdd = async () => {
    if (!keyword.trim()) {
      Alert.alert('Chưa nhập từ khóa', 'Vui lòng nhập từ khóa nhận diện trong thông báo.');
      return;
    }

    const cat = categories.find((c) => c.id === selectedCatId);
    if (!cat) {
      Alert.alert('Chưa chọn phân loại', 'Vui lòng chọn 1 danh mục phân loại.');
      return;
    }

    await addRule({
      keyword: keyword.trim().toUpperCase(),
      categoryId: cat.id,
      categoryName: cat.name,
      note: note.trim() || cat.name,
    });

    setKeyword('');
    setNote('');
  };

  const handleDelete = (r: AutoRule) => {
    Alert.alert('Xóa quy tắc', `Bạn có chắc muốn xóa quy tắc cho từ khóa "${r.keyword}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteRule(r.id),
      },
    ]);
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

      {/* Add rule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>+ Thêm Quy tắc từ khóa mới</Text>

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
              <Text style={[styles.catPillText, selectedCatId === c.id && styles.catPillTextActive]}>
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

        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Lưu quy tắc gợi ý</Text>
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
            <TouchableOpacity onPress={() => handleDelete(r)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
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
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
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
});

