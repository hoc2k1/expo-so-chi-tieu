import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { Category, TransactionType } from '../../models/types';
import { CategoryNoteFormModal } from '../../components/CategoryNoteFormModal';
import { DraggableReorderList } from '../../components/DraggableReorderList';

export default function CategoryEditModal() {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    showToast,
  } = useApp();

  const [filterType, setFilterType] = useState<TransactionType>('expense');
  const [isDragging, setIsDragging] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const list = useMemo(
    () => categories.filter((c) => c.type === filterType),
    [categories, filterType]
  );

  const handleOpenAdd = () => {
    setEditingCat(null);
    setModalVisible(true);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCat(cat);
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
      showToast('Vui lòng nhập tên danh mục', 'error');
      return false;
    }

    if (data.editing) {
      await updateCategory({
        ...data.editing,
        name: trimmed,
        color: data.color,
        icon: data.icon,
      });
      showToast(`Đã cập nhật danh mục "${trimmed}"!`, 'success');
    } else {
      await addCategory({
        name: trimmed,
        type: data.type,
        color: data.color,
        icon: data.icon,
      });
      showToast(`Đã thêm danh mục "${trimmed}"!`, 'success');
    }
    return true;
  };

  const handleDelete = (cat: Category) => {
    Alert.alert('Xóa danh mục', `Bạn có chắc muốn xóa danh mục "${cat.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(cat.id);
          showToast(`Đã xóa danh mục "${cat.name}"!`, 'info');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        scrollEnabled={!isDragging}
      >
        <View style={styles.topRow}>
          <View style={styles.typeSwitcher}>
            <TouchableOpacity
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
                Chi tiêu
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
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
                Thu nhập
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
            <Ionicons name="add" size={18} color="#0F172A" />
            <Text style={styles.addBtnText}>Thêm</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Danh sách hiện có ({list.length})</Text>
            <Text style={styles.dragHint}>Kéo ☰ để đổi vị trí</Text>
          </View>

          <DraggableReorderList
            items={list}
            itemHeight={58}
            itemGap={8}
            onScrollLockChange={setIsDragging}
            onReorder={(ordered) => reorderCategories(filterType, ordered)}
            renderContent={(cat) => (
              <View style={styles.catInner}>
                <View style={[styles.catIconBox, { backgroundColor: `${cat.color}25` }]}>
                  <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                </View>
                <Text style={styles.catName} numberOfLines={1}>
                  {cat.name}
                </Text>
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
            )}
          />
        </View>
      </ScrollView>

      <CategoryNoteFormModal
        visible={modalVisible}
        mode="category"
        categoryType={filterType}
        editingCategory={editingCat}
        categories={categories}
        onClose={() => setModalVisible(false)}
        onSaveCategory={handleSaveCategory}
        onSaveNote={async () => false}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  typeSwitcher: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 4,
    gap: 6,
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
    fontSize: 13,
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
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
  },
  catInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  catName: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
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
