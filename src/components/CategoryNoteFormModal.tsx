import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category, SavedNote, TransactionType } from '../models/types';

export const CATEGORY_COLOR_PALETTE = [
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

export const CATEGORY_ICON_LIST = [
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

interface CategoryNoteFormModalProps {
  visible: boolean;
  mode: 'category' | 'note';
  categoryType?: TransactionType;
  editingCategory?: Category | null;
  editingNote?: SavedNote | null;
  categories: Category[];
  onClose: () => void;
  onSaveCategory: (data: {
    name: string;
    color: string;
    icon: string;
    type: TransactionType;
    editing?: Category | null;
  }) => Promise<boolean>;
  onSaveNote: (data: {
    text: string;
    categoryId?: string;
    editing?: SavedNote | null;
  }) => Promise<boolean>;
}

const CategoryNoteFormContent: React.FC<
  Omit<CategoryNoteFormModalProps, 'visible'>
> = ({
  mode,
  categoryType = 'expense',
  editingCategory = null,
  editingNote = null,
  categories,
  onClose,
  onSaveCategory,
  onSaveNote,
}) => {
  const [textValue, setTextValue] = useState(() =>
    mode === 'category'
      ? editingCategory?.name || ''
      : editingNote?.text || ''
  );
  const [selectedColor, setSelectedColor] = useState(
    () => editingCategory?.color || CATEGORY_COLOR_PALETTE[0]
  );
  const [selectedIcon, setSelectedIcon] = useState(
    () => editingCategory?.icon || CATEGORY_ICON_LIST[0]
  );
  const [selectedCatId, setSelectedCatId] = useState<string>(
    () => editingNote?.categoryId || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const isEditing =
    mode === 'category' ? Boolean(editingCategory) : Boolean(editingNote);

  const title =
    mode === 'category'
      ? editingCategory
        ? 'Chỉnh sửa phân loại'
        : `Thêm phân loại ${categoryType === 'expense' ? 'Chi tiêu' : 'Thu nhập'}`
      : editingNote
      ? 'Chỉnh sửa ghi chú mẫu'
      : 'Thêm ghi chú mẫu';

  const handleSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      let ok = false;
      if (mode === 'category') {
        ok = await onSaveCategory({
          name: textValue,
          color: selectedColor,
          icon: selectedIcon,
          type: editingCategory ? editingCategory.type : categoryType,
          editing: editingCategory,
        });
      } else {
        ok = await onSaveNote({
          text: textValue,
          categoryId: selectedCatId || undefined,
          editing: editingNote,
        });
      }
      if (ok) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.bodyScroll}
      >
        {/* Shared Text Input */}
        <Text style={styles.label}>
          {mode === 'category' ? 'Tên phân loại' : 'Nội dung ghi chú'}
        </Text>
        <TextInput
          autoFocus
          style={styles.textInput}
          placeholder={
            mode === 'category'
              ? 'VD: Cà phê, Du lịch...'
              : 'VD: Ăn sáng, Đổ xăng...'
          }
          placeholderTextColor="#64748B"
          value={textValue}
          onChangeText={setTextValue}
          returnKeyType="done"
          onSubmitEditing={mode === 'note' ? handleSubmit : undefined}
        />

        {mode === 'category' ? (
          <>
            <Text style={styles.label}>Màu sắc nhận diện</Text>
            <View style={styles.paletteRow}>
              {CATEGORY_COLOR_PALETTE.map((c) => (
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

            <Text style={styles.label}>Biểu tượng Icon</Text>
            <View style={styles.iconGrid}>
              {CATEGORY_ICON_LIST.map((ic) => (
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
          </>
        ) : (
          <>
            <Text style={styles.label}>Gắn với Phân loại cụ thể</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.catScroll}
            >
              <TouchableOpacity
                style={[styles.catPill, !selectedCatId && styles.catPillActive]}
                onPress={() => setSelectedCatId('')}
              >
                <Text
                  style={[
                    styles.catPillText,
                    !selectedCatId && styles.catPillTextActive,
                  ]}
                >
                  Dùng chung cho mọi loại
                </Text>
              </TouchableOpacity>

              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catPill,
                    selectedCatId === c.id && styles.catPillActive,
                  ]}
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
          </>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, isEditing && styles.saveBtnEdit]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          <Ionicons
            name={isEditing ? 'checkmark' : 'add'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.saveBtnText}>
            {isEditing ? 'Lưu thay đổi' : 'Thêm mới'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const CategoryNoteFormModal: React.FC<CategoryNoteFormModalProps> = ({
  visible,
  mode,
  categoryType = 'expense',
  editingCategory = null,
  editingNote = null,
  categories,
  onClose,
  onSaveCategory,
  onSaveNote,
}) => {
  const formKey = `${mode}-${categoryType}-${editingCategory?.id || 'new'}-${
    editingNote?.id || 'new'
  }`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {visible && (
          <CategoryNoteFormContent
            key={formKey}
            mode={mode}
            categoryType={categoryType}
            editingCategory={editingCategory}
            editingNote={editingNote}
            categories={categories}
            onClose={onClose}
            onSaveCategory={onSaveCategory}
            onSaveNote={onSaveNote}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  bodyScroll: {
    flexGrow: 0,
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.12 }],
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catPillActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  catPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  catPillTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnEdit: {
    backgroundColor: '#3B82F6',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
