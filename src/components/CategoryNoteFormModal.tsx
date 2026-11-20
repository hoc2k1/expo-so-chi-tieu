import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useTheme, ThemeColors } from '../constants/theme';
import { GardenSprouts } from './GardenDecor';

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

export interface CategoryNoteFormModalProps {
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
  mode: initialMode,
  categoryType: initialCategoryType = 'expense',
  editingCategory = null,
  editingNote = null,
  categories,
  onClose,
  onSaveCategory,
  onSaveNote,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isEditing = Boolean(editingCategory || editingNote);

  const [activeTab, setActiveTab] = useState<'category' | 'note'>(() => {
    if (editingCategory) return 'category';
    if (editingNote) return 'note';
    return initialMode;
  });

  const [currentCatType, setCurrentCatType] = useState<TransactionType>(() => {
    return editingCategory ? editingCategory.type : initialCategoryType;
  });

  // State for category form
  const [catName, setCatName] = useState(() => editingCategory?.name || '');
  const [selectedColor, setSelectedColor] = useState(
    () => editingCategory?.color || CATEGORY_COLOR_PALETTE[0]
  );
  const [selectedIcon, setSelectedIcon] = useState(
    () => editingCategory?.icon || CATEGORY_ICON_LIST[0]
  );

  // State for note form
  const [noteText, setNoteText] = useState(() => editingNote?.text || '');
  const [selectedCatId, setSelectedCatId] = useState<string>(
    () => editingNote?.categoryId || ''
  );

  const [isSaving, setIsSaving] = useState(false);

  const catInputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const noteInputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (isEditing) return;
    const timer = setTimeout(() => {
      if (activeTab === 'category') {
        catInputRef.current?.focus();
      } else {
        noteInputRef.current?.focus();
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [activeTab, isEditing]);

  const title =
    activeTab === 'category'
      ? editingCategory
        ? 'Chỉnh sửa phân loại'
        : 'Thêm phân loại mới'
      : editingNote
      ? 'Chỉnh sửa ghi chú mẫu'
      : 'Thêm ghi chú mẫu mới';

  const handleSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      let ok = false;
      if (activeTab === 'category') {
        ok = await onSaveCategory({
          name: catName,
          color: selectedColor,
          icon: selectedIcon,
          type: editingCategory ? editingCategory.type : currentCatType,
          editing: editingCategory,
        });
      } else {
        ok = await onSaveNote({
          text: noteText,
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
      <GardenSprouts variant="modal" />
      {/* Header with Title & Close button */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Segmented Top Tab (Phân loại / Ghi chú mẫu) */}
      {!isEditing && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'category' && styles.tabBtnActive]}
            onPress={() => setActiveTab('category')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="pricetags"
              size={14}
              color={activeTab === 'category' ? colors.onPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'category' && styles.tabBtnTextActive,
              ]}
            >
              Phân loại
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'note' && styles.tabBtnActive]}
            onPress={() => setActiveTab('note')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="document-text"
              size={14}
              color={activeTab === 'note' ? colors.onPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'note' && styles.tabBtnTextActive,
              ]}
            >
              Ghi chú mẫu
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.bodyScroll}
      >
        {activeTab === 'category' ? (
          <>
            {/* Category Type Switcher (Chi tiêu / Thu nhập) */}
            {!editingCategory && (
              <View style={styles.typeSwitcher}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    currentCatType === 'expense' && styles.typeBtnActiveExpense,
                  ]}
                  onPress={() => setCurrentCatType('expense')}
                >
                  <Text
                    style={[
                      styles.typeText,
                      currentCatType === 'expense' && styles.typeTextActive,
                    ]}
                  >
                    Chi tiêu
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    currentCatType === 'income' && styles.typeBtnActiveIncome,
                  ]}
                  onPress={() => setCurrentCatType('income')}
                >
                  <Text
                    style={[
                      styles.typeText,
                      currentCatType === 'income' && styles.typeTextActive,
                    ]}
                  >
                    Thu nhập
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>Tên phân loại</Text>
            <TextInput
              ref={catInputRef}
              autoFocus={!isEditing}
              style={styles.textInput}
              placeholder="VD: Cà phê, Du lịch, Mua sắm..."
              placeholderTextColor={colors.textMuted}
              value={catName}
              onChangeText={setCatName}
              returnKeyType="done"
            />

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
                    color={selectedIcon === ic ? selectedColor : colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>Nội dung ghi chú</Text>
            <TextInput
              ref={noteInputRef}
              autoFocus={!isEditing}
              style={styles.textInput}
              placeholder="VD: Ăn sáng, Đổ xăng, Cà phê..."
              placeholderTextColor={colors.textMuted}
              value={noteText}
              onChangeText={setNoteText}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <Text style={styles.label}>Gắn với Phân loại cụ thể</Text>
            <View style={styles.catWrap}>
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
            </View>
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
          <GardenSprouts variant="chip" align="right" />
          <Ionicons
            name={isEditing ? 'checkmark' : 'add'}
            size={18}
            color={colors.onPrimary}
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
      backgroundColor: colors.scrim,
    },
    card: {
      width: '100%',
      maxWidth: 440,
      maxHeight: '85%',
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      overflow: 'visible',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 10,
      padding: 3,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      gap: 6,
    },
    tabBtnActive: {
      backgroundColor: colors.primary,
    },
    tabBtnText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    tabBtnTextActive: {
      color: colors.onPrimary,
      fontWeight: '700',
    },
    typeSwitcher: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 8,
      padding: 3,
      marginBottom: 12,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeBtn: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: 6,
    },
    typeBtnActiveExpense: {
      backgroundColor: colors.expense,
    },
    typeBtnActiveIncome: {
      backgroundColor: colors.income,
    },
    typeText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    typeTextActive: {
      color: colors.onPrimary,
      fontWeight: '700',
    },
    bodyScroll: {
      flexGrow: 0,
    },
    label: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    paletteRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      padding: 3,
      marginBottom: 14,
    },
    colorDot: {
      width: 27,
      height: 27,
      borderRadius: 13.5,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorDotSelected: {
      borderColor: colors.text,
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
      backgroundColor: colors.surfaceSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    catWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
      marginBottom: 10,
    },
    catPill: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    catPillText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    catPillTextActive: {
      color: colors.onPrimary,
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
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    saveBtn: {
      flex: 2,
      flexDirection: 'row',
      paddingVertical: 12,
      borderRadius: 10,
      overflow: 'visible',
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    saveBtnEdit: {
      backgroundColor: colors.primary,
    },
    saveBtnText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
