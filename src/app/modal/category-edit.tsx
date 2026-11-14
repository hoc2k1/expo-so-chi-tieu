import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { Category, TransactionType } from '../../models/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';

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
  const { categories, addCategory, updateCategory, deleteCategory, showToast } = useApp();

  const [filterType, setFilterType] = useState<TransactionType>('expense');
  const [newCatName, setNewCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICON_LIST[0]);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const list = categories.filter((c) => c.type === filterType);

  const handleStartEdit = (cat: Category) => {
    setEditingCat(cat);
    setNewCatName(cat.name);
    setSelectedColor(cat.color || COLOR_PALETTE[0]);
    setSelectedIcon(cat.icon || ICON_LIST[0]);
  };

  const handleCancelEdit = () => {
    setEditingCat(null);
    setNewCatName('');
    setSelectedColor(COLOR_PALETTE[0]);
    setSelectedIcon(ICON_LIST[0]);
  };

  const handleSave = async () => {
    if (!newCatName.trim()) {
      showToast('Vui lòng nhập tên danh mục', 'error');
      return;
    }

    if (editingCat) {
      await updateCategory({
        ...editingCat,
        name: newCatName.trim(),
        color: selectedColor,
        icon: selectedIcon,
      });
      showToast(`Đã cập nhật danh mục "${newCatName.trim()}"!`, 'success');
      handleCancelEdit();
    } else {
      await addCategory({
        name: newCatName.trim(),
        type: filterType,
        color: selectedColor,
        icon: selectedIcon,
      });
      showToast(`Đã thêm danh mục "${newCatName.trim()}"!`, 'success');
      setNewCatName('');
    }
  };

  const handleDelete = (cat: Category) => {
    Alert.alert('Xóa danh mục', `Bạn có chắc muốn xóa danh mục "${cat.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          if (editingCat?.id === cat.id) {
            handleCancelEdit();
          }
          await deleteCategory(cat.id);
          showToast(`Đã xóa danh mục "${cat.name}"!`, 'info');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAwareScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Type Toggle */}
        <View style={styles.typeSwitcher}>
          <TouchableOpacity
            style={[styles.typeBtn, filterType === 'expense' && styles.typeBtnActiveExpense]}
            onPress={() => {
              setFilterType('expense');
              handleCancelEdit();
            }}
          >
            <Text style={[styles.typeText, filterType === 'expense' && styles.typeTextActive]}>
              Danh mục Chi tiêu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeBtn, filterType === 'income' && styles.typeBtnActiveIncome]}
            onPress={() => {
              setFilterType('income');
              handleCancelEdit();
            }}
          >
            <Text style={[styles.typeText, filterType === 'income' && styles.typeTextActive]}>
              Danh mục Thu nhập
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add / Edit Category Box */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {editingCat ? `✏️ Chỉnh sửa: ${editingCat.name}` : '+ Thêm danh mục mới'}
            </Text>
            {editingCat && (
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditBtn}>
                <Text style={styles.cancelEditText}>Hủy sửa</Text>
              </TouchableOpacity>
            )}
          </View>

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
                  selectedIcon === ic && {
                    backgroundColor: `${selectedColor}30`,
                    borderColor: selectedColor,
                  },
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

          <TouchableOpacity
            style={[styles.addBtn, editingCat && styles.editSaveBtn]}
            onPress={handleSave}
          >
            <Ionicons name={editingCat ? 'checkmark' : 'add'} size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>
              {editingCat ? 'Lưu thay đổi danh mục' : 'Thêm vào danh sách'}
            </Text>
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
              <View style={styles.rowActions}>
                <TouchableOpacity
                  onPress={() => handleStartEdit(cat)}
                  style={styles.actionIconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="create-outline" size={18} color="#38BDF8" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(cat)}
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
  editSaveBtn: {
    backgroundColor: '#10B981',
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
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    padding: 4,
  },
});
