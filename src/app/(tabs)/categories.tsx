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
import { router } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { Category, SavedNote, TransactionType } from '../../models/types';
import { CategoryNoteFormModal } from '../../components/CategoryNoteFormModal';
import { DraggableReorderList } from '../../components/DraggableReorderList';

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

  const [activeTab, setActiveTab] = useState<ManageTab>('category');
  const [filterType, setFilterType] = useState<TransactionType>('expense');
  const [isDragging, setIsDragging] = useState(false);

  // Shared modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingNote, setEditingNote] = useState<SavedNote | null>(null);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === filterType),
    [categories, filterType]
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

  const handleDeleteCategory = (cat: Category) => {
    Alert.alert('Xóa phân loại', `Bạn có chắc muốn xóa phân loại "${cat.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(cat.id);
          showToast(`Đã xóa phân loại "${cat.name}"!`, 'info');
        },
      },
    ]);
  };

  const handleDeleteNote = (note: SavedNote) => {
    Alert.alert('Xóa ghi chú', `Bạn có chắc muốn xóa "${note.text}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(note.id);
          showToast(`Đã xóa ghi chú "${note.text}"!`, 'info');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Top Segmented Tabs + Add Button */}
      <View style={styles.topBar}>
        <View style={styles.segmentBar}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'category' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('category')}
          >
            <Ionicons
              name="pricetags"
              size={15}
              color={activeTab === 'category' ? '#0F172A' : '#94A3B8'}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'category' && styles.segmentTextActive,
              ]}
            >
              Phân loại
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'note' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('note')}
          >
            <Ionicons
              name="document-text"
              size={15}
              color={activeTab === 'note' ? '#0F172A' : '#94A3B8'}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'note' && styles.segmentTextActive,
              ]}
            >
              Ghi chú mẫu
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#0F172A" />
          <Text style={styles.addBtnText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        scrollEnabled={!isDragging}
      >
        {activeTab === 'category' ? (
          <>
            {/* Expense / Income Sub-switcher */}
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
                  Chi tiêu ({categories.filter((c) => c.type === 'expense').length})
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
                  Thu nhập ({categories.filter((c) => c.type === 'income').length})
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Danh sách phân loại ({filteredCategories.length})
                </Text>
                <Text style={styles.dragHint}>Kéo ☰ để đổi vị trí</Text>
              </View>

              {filteredCategories.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có phân loại nào.</Text>
              ) : (
                <DraggableReorderList
                  items={filteredCategories}
                  itemHeight={58}
                  itemGap={8}
                  onScrollLockChange={setIsDragging}
                  onReorder={(ordered) => {
                    reorderCategories(filterType, ordered);
                  }}
                  renderContent={(cat) => (
                    <View style={styles.itemInner}>
                      <View
                        style={[
                          styles.catIconBox,
                          { backgroundColor: `${cat.color}25` },
                        ]}
                      >
                        <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                      </View>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      <View style={styles.rowActions}>
                        <TouchableOpacity
                          onPress={() => openEditCategory(cat)}
                          style={styles.actionIconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="create-outline" size={18} color="#38BDF8" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteCategory(cat)}
                          style={styles.actionIconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Danh sách Ghi chú mẫu ({notes.length})
              </Text>
              <Text style={styles.dragHint}>Kéo ☰ để đổi vị trí</Text>
            </View>

            {notes.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có ghi chú mẫu nào.</Text>
            ) : (
              <DraggableReorderList
                items={notes}
                itemHeight={64}
                itemGap={8}
                onScrollLockChange={setIsDragging}
                onReorder={(ordered) => {
                  reorderNotes(ordered);
                }}
                renderContent={(n) => {
                  const linkedCat = categories.find((c) => c.id === n.categoryId);
                  return (
                    <View style={styles.itemInner}>
                      <View style={styles.noteTexts}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {n.text}
                        </Text>
                        <Text style={styles.noteCategory} numberOfLines={1}>
                          {linkedCat
                            ? `Phân loại: ${linkedCat.name}`
                            : 'Dùng chung mọi loại'}
                        </Text>
                      </View>
                      <View style={styles.rowActions}>
                        <TouchableOpacity
                          onPress={() => openEditNote(n)}
                          style={styles.actionIconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="create-outline" size={18} color="#38BDF8" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteNote(n)}
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
            )}
          </View>
        )}

        {/* Other Classification Tools */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>
            Công cụ phân loại tự động
          </Text>

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/modal/rule-edit')}
          >
            <View style={styles.navLeft}>
              <Ionicons name="flash" size={20} color="#F59E0B" />
              <Text style={styles.navTitle}>Quy tắc từ khóa gợi ý tự động</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navRow, { borderBottomWidth: 0, paddingBottom: 4 }]}
            onPress={() => router.push('/modal/apps-manager')}
          >
            <View style={styles.navLeft}>
              <Ionicons name="apps" size={20} color="#8B5CF6" />
              <Text style={styles.navTitle}>Danh sách App Ngân hàng & Ví</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Shared Add / Edit Modal for Category & Note */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  segmentBar: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#10B981',
  },
  segmentText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#0F172A',
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 32,
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
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
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
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
    fontWeight: '500',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  itemInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemTitle: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  noteTexts: {
    flex: 1,
    justifyContent: 'center',
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
    marginLeft: 8,
  },
  actionIconBtn: {
    padding: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
});
