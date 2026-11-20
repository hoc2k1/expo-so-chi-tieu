import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { TransactionType } from '../../models/types';
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewRef,
} from '../../components/KeyboardAwareScrollView';
import { GardenSprouts } from '../../components/GardenDecor';
import { SpringPressable } from '../../components/Motion';
import { CategoryPickerSection } from '../../components/CategoryPickerSection';
import { SaveTemplateCheckbox } from '../../components/ui/SaveTemplateCheckbox';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
} from '../../constants/theme';

export default function ClassifyModal() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);
  const params = useLocalSearchParams<{
    pendingId?: string;
    batchIds?: string;
  }>();

  const {
    pendingTransactions,
    categories,
    notes,
    classifyTransaction,
    batchClassify,
    showToast,
  } = useApp();

  const isBatch = Boolean(params.batchIds);
  const batchIdList: string[] = useMemo(() => {
    if (!params.batchIds) return [];
    try {
      return JSON.parse(params.batchIds);
    } catch {
      return [];
    }
  }, [params.batchIds]);

  const targetItem = useMemo(() => {
    if (isBatch) return null;
    return pendingTransactions.find((p) => p.id === params.pendingId);
  }, [isBatch, pendingTransactions, params.pendingId]);

  const batchItems = useMemo(() => {
    if (!isBatch) return [];
    return pendingTransactions.filter((p) => batchIdList.includes(p.id));
  }, [isBatch, pendingTransactions, batchIdList]);

  const txType: TransactionType = useMemo(() => {
    if (targetItem) return targetItem.type;
    if (batchItems.length > 0 && batchItems.every((i) => i.type === 'income')) {
      return 'income';
    }
    return 'expense';
  }, [targetItem, batchItems]);

  const [amountStr, setAmountStr] = useState(() =>
    targetItem ? targetItem.amount.toString() : ''
  );
  const [selectedCatId, setSelectedCatId] = useState<string>(() => {
    if (targetItem?.suggestedCategoryId) return targetItem.suggestedCategoryId;
    const firstMatch = categories.find((c) => c.type === txType);
    return firstMatch ? firstMatch.id : '';
  });
  const [selectedCatName, setSelectedCatName] = useState<string>(() => {
    if (targetItem?.suggestedCategoryName) return targetItem.suggestedCategoryName;
    const firstMatch = categories.find((c) => c.type === txType);
    return firstMatch ? firstMatch.name : '';
  });
  const [customCatName, setCustomCatName] = useState<string>('');
  const [saveCustomCat, setSaveCustomCat] = useState<boolean>(true);

  const [noteText, setNoteText] = useState<string>(() => targetItem?.suggestedNote || '');
  const [saveCustomNote, setSaveCustomNote] = useState<boolean>(false);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === txType),
    [categories, txType]
  );

  const relevantNotes = useMemo(
    () => notes.filter((n) => !n.categoryId || n.categoryId === selectedCatId),
    [notes, selectedCatId]
  );

  const trimmedNote = noteText.trim();
  const canSaveNote =
    trimmedNote.length > 0 &&
    !relevantNotes.some((n) => n.text.trim().toLowerCase() === trimmedNote.toLowerCase());

  const handleSave = async () => {
    let finalCatId = selectedCatId;
    let finalCatName = selectedCatName;

    if (customCatName.trim()) {
      finalCatId = `cat_custom_${Date.now()}`;
      finalCatName = customCatName.trim();
    }

    if (!finalCatName) {
      showToast('Vui lòng chọn hoặc nhập tên Phân loại.', 'error');
      return;
    }

    if (isBatch) {
      const count = batchIdList.length;
      await batchClassify(batchIdList, {
        categoryId: finalCatId,
        categoryName: finalCatName,
        note: trimmedNote || 'Phân loại hàng loạt',
        saveNewCategory: customCatName.trim().length > 0 && saveCustomCat,
        saveNewNote: canSaveNote && saveCustomNote,
      });
      showToast(`Đã phân loại thành công ${count} giao dịch!`, 'success');
      router.back();
      return;
    }

    if (!targetItem) {
      router.back();
      return;
    }

    const cleanAmount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || targetItem.amount;

    await classifyTransaction(targetItem.id, {
      categoryId: finalCatId,
      categoryName: finalCatName,
      note: trimmedNote || 'Không có ghi chú',
      amount: cleanAmount,
      type: txType,
      saveNewCategory: customCatName.trim().length > 0 && saveCustomCat,
      saveNewNote: canSaveNote && saveCustomNote,
    });

    showToast(`Đã phân loại "${finalCatName}" thành công!`, 'success');
    router.back();
  };

  const isIncome = txType === 'income';

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {isBatch ? (
          <View style={styles.batchInfoBanner}>
            <Ionicons name="layers" size={20} color={colors.primary} />
            <Text style={styles.batchInfoText}>
              Đang phân loại chung cho {batchIdList.length} giao dịch ({isIncome ? 'Thu nhập +' : 'Chi tiêu -'})
            </Text>
          </View>
        ) : targetItem ? (
          <View style={styles.txSourceBox}>
            <View style={styles.txSourceHeader}>
              <Text style={styles.txSourceTitle}>{targetItem.source}</Text>
              <View
                style={[
                  styles.detectedTypeBadge,
                  isIncome ? styles.detectedBadgeIncome : styles.detectedBadgeExpense,
                ]}
              >
                <Text
                  style={[
                    styles.detectedTypeText,
                    isIncome ? styles.detectedTextIncome : styles.detectedTextExpense,
                  ]}
                >
                  {isIncome ? '+ Thu nhập' : '- Chi tiêu'}
                </Text>
              </View>
            </View>
            <Text style={styles.txSourceRaw} numberOfLines={3}>
              {targetItem.rawContent}
            </Text>
          </View>
        ) : null}

        {!isBatch && (
          <View style={styles.section}>
            <Text style={styles.label}>
              Số tiền giao dịch ({isIncome ? 'Cộng tiền +' : 'Trừ tiền -'})
            </Text>
            <View style={styles.amountInputRow}>
              <Text
                style={[
                  styles.signPrefix,
                  isIncome ? styles.detectedTextIncome : styles.detectedTextExpense,
                ]}
              >
                {isIncome ? '+' : '-'}
              </Text>
              <TextInput
                style={[
                  styles.amountInput,
                  isIncome ? styles.detectedTextIncome : styles.detectedTextExpense,
                ]}
                keyboardType="numeric"
                value={amountStr}
                onChangeText={setAmountStr}
                placeholder="Nhập số tiền..."
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.currencySuffix}>VND</Text>
            </View>
          </View>
        )}

        <CategoryPickerSection
          txType={txType}
          categories={filteredCategories}
          selectedCatId={selectedCatId}
          customCatName={customCatName}
          saveCustomCat={saveCustomCat}
          onSelectCategory={(cat) => {
            setSelectedCatId(cat.id);
            setSelectedCatName(cat.name);
            setCustomCatName('');
          }}
          onChangeCustomCatName={(val) => {
            setCustomCatName(val);
            if (val.trim()) {
              setSelectedCatName(val.trim());
            }
          }}
          onToggleSaveCustomCat={() => setSaveCustomCat(!saveCustomCat)}
        />

        <View style={styles.section}>
          <Text style={styles.label}>Ghi chú giao dịch</Text>

          {relevantNotes.length > 0 && (
            <View style={styles.notePills}>
              {relevantNotes.slice(0, 12).map((n) => {
                const isSelected = noteText === n.text;
                return (
                  <Pressable
                    key={n.id}
                    style={[styles.notePill, isSelected && styles.notePillActive]}
                    onPress={() => setNoteText(n.text)}
                  >
                    <Text
                      style={[
                        styles.notePillText,
                        isSelected && styles.notePillTextActive,
                      ]}
                    >
                      {n.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <TextInput
            style={styles.textInput}
            placeholder="Nhập hoặc chọn ghi chú..."
            placeholderTextColor={colors.textMuted}
            value={noteText}
            onChangeText={setNoteText}
            onFocus={() =>
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150)
            }
          />

          {canSaveNote && (
            <SaveTemplateCheckbox
              checked={saveCustomNote}
              label="Lưu ghi chú này vào mẫu cho lần sau"
              onToggle={() => setSaveCustomNote(!saveCustomNote)}
            />
          )}
        </View>

        <SpringPressable style={styles.saveBtn} onPress={handleSave}>
          <GardenSprouts variant="chip" align="both" />
          <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
          <Text style={styles.saveBtnText}>
            {isBatch
              ? `Xác nhận phân loại ${batchIdList.length} giao dịch`
              : 'Lưu giao dịch'}
          </Text>
        </SpringPressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: Spacing.base,
      paddingBottom: Spacing.xxl,
    },
    batchInfoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      borderRadius: Radius.sm,
      padding: Spacing.md,
      marginBottom: Spacing.base,
      gap: Spacing.sm,
    },
    batchInfoText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
    },
    txSourceBox: {
      backgroundColor: colors.surface,
      borderRadius: Radius.sm,
      padding: Spacing.md,
      marginBottom: Spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    txSourceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    txSourceTitle: {
      color: colors.info,
      fontSize: 13,
      fontWeight: '700',
    },
    detectedTypeBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: 6,
    },
    detectedBadgeIncome: {
      backgroundColor: colors.incomeSoft,
    },
    detectedBadgeExpense: {
      backgroundColor: colors.expenseSoft,
    },
    detectedTypeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    detectedTextIncome: {
      color: colors.income,
    },
    detectedTextExpense: {
      color: colors.expense,
    },
    txSourceRaw: {
      color: colors.textSecondary,
      fontSize: 11,
      lineHeight: 16,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 10,
    },
    amountInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    signPrefix: {
      fontSize: 20,
      fontWeight: '800',
      marginRight: 6,
    },
    amountInput: {
      flex: 1,
      fontSize: 20,
      fontWeight: '800',
      paddingVertical: 10,
    },
    currencySuffix: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    textInput: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 13,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notePills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    notePill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.md,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notePillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    notePillText: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    notePillTextActive: {
      color: colors.onPrimary,
      fontWeight: '700',
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      paddingVertical: 14,
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    saveBtnText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
  });
