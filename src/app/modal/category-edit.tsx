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
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { Category, TransactionType } from '../../models/types';

const COLOR_PALETTE = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#64748B',
];

const ICON_LIST = [
  'restaurant',
  'car',
  'cart',
  'flash',
  'home',
  'film',
  'medkit',
  'book',
  'cash',
  'gift',
  'trending-up',
  'wallet',
  'airplane',
  'fitness',
  'cafe',
  'paw',
];

export default function CategoryEditModal() {
  const { categories, addCategory, deleteCategory } = useApp();

  const [filterType, setFilterType] = useState<TransactionType>('expense');
  const [newCatName, setNewCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICON_LIST[0]);

  const list = categories.filter((c) => c.type === filterType);

  const handleAdd = async () => {
    if (!newCatName.trim()) {
      Alert.alert('Chưa nhập tên', 'Vui lòng nhập tên danh mục.');
      return;
    }

    await addCategory({
      name: newCatName.trim(),
      type: filterType,
      color: selectedColor,
      icon: selectedIcon,
    });

    setNewCatName('');
  };

  const handleDelete = (cat: Category) => {
    Alert.alert('Xóa danh mục', `Bạn có chắc muốn xóa danh mục "${cat.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteCategory(cat.id),
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Type Toggle */}
      <View style={styles.typeSwitcher}>
        <TouchableOpacity
          style={[styles.typeBtn, filterType === 'expense' && styles.typeBtnActiveExpense]}
          onPress={() => setFilterType('expense')}
        >
          <Text style={[styles.typeText, filterType === 'expense' && styles.typeTextActive]}>
            Danh mục Chi tiêu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeBtn, filterType === 'income' && styles.typeBtnActiveIncome]}
          onPress={() => setFilterType('income')}
        >
          <Text style={[styles.typeText, filterType === 'income' && styles.typeTextActive]}>
            Danh mục Thu nhập
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add New Category Box */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>+ Thêm danh mục mới</Text>

        <TextInput
          style={styles.textInput}
          placeholder="Tên danh mục (VD: Cà phê, Du lịch...)"
          placeholderTextColor="#64748B"
          value={newCatName}
          onChangeText={setNewCatName}
        />

        {/* Color Palette */}
        <Text style={styles.label}>Màu sắc nhận diện:</Text>
        <View style={styles.paletteRow}>
          {COLOR_PALETTE.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                selectedColor === c && styles.colorDotSelected,
              ]}
              onPress={() => setSelectedColor(c)}
            />
          ))}
        </View>

        {/* Icon Picker */}
        <Text style={styles.label}>Biểu tượng Icon:</Text>
        <View style={styles.iconGrid}>
          {ICON_LIST.map((ic) => (
            <TouchableOpacity
              key={ic}
              style={[
                styles.iconBtn,
                selectedIcon === ic && { backgroundColor: `${selectedColor}30`, borderColor: selectedColor },
              ]}
              onPress={() => setSelectedIcon(ic)}
            >
              <Ionicons
                name={ic as any}
                size={20}
                color={selectedIcon === ic ? selectedColor : '#94A3B8'}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Thêm vào danh sách</Text>
        </TouchableOpacity>
      </View>

      {/* Existing Categories List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danh sách hiện có ({list.length})</Text>
        {list.map((cat) => (
          <View key={cat.id} style={styles.catRow}>
            <View style={[styles.catIconBox, { backgroundColor: `${cat.color}25` }]}>
              <Ionicons name={cat.icon as any} size={18} color={cat.color} />
            </View>
            <Text style={styles.catName}>{cat.name}</Text>
            <TouchableOpacity onPress={() => handleDelete(cat)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
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
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnActiveExpense: {
    backgroundColor: '#EF4444',
  },
  typeBtnActiveIncome: {
    backgroundColor: '#10B981',
  },
  typeText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  typeTextActive: {
    color: '#FFFFFF',
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
    marginTop: 4,
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  catIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});

