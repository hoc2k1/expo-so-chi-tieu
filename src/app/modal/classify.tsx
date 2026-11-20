import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { useTheme, ThemeColors } from '../../constants/theme';
import { GardenSprouts } from '../../components/GardenDecor';

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

  // Type is automatically determined from the notification (+ is income, - is expense)
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

  // Categories filtered by detected txType
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === txType);
  }, [categories, txType]);

  // Relevant notes for the selected category + shared notes
  const relevantNotes = useMemo(() => {
    return notes.filter((n) => !n.categoryId || n.categoryId === selectedCatId);
  }, [notes, selectedCatId]);

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
        note: noteText.trim() || 'Phân loại hàng loạt',
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
      note: noteText.trim() || 'Không có ghi chú',
      amount: cleanAmount,
      type: txType,
      saveNewCategory: customCatName.trim().length > 0 && saveCustomCat,
      saveNewNote: noteText.trim().length > 0 && saveCustomNote,
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
        {/* Header Info */}
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

        {/* Amount (only for single classify, type is already fixed from +/- notification) */}
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

        {/* Categories Grid */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Chọn Phân loại ({isIncome ? 'Thu nhập' : 'Chi tiêu'})
          </Text>
          <View style={styles.catGrid}>
            {filteredCategories.map((cat) => {
              const isSelected = selectedCatId === cat.id && !customCatName.trim();
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catItem,
                    isSelected && {
                      borderColor: cat.color,
                      backgroundColor: `${cat.color}25`,
                    },
                  ]}
                  onPress={() => {
                    setSelectedCatId(cat.id);
                    setSelectedCatName(cat.name);
                    setCustomCatName('');
                  }}
                >
                  <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                  <Text
                    style={[
                      styles.catItemName,
                      isSelected && { color: colors.text, fontWeight: '700' },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Category Input */}
          <View style={styles.customCatBox}>
            <Text style={styles.subLabel}>Hoặc tự nhập Phân loại mới:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="VD: Nuôi thú cưng, Sửa nhà..."
              placeholderTextColor={colors.textMuted}
              value={customCatName}
              onChangeText={(val) => {
                setCustomCatName(val);
                if (val.trim()) {
                  setSelectedCatName(val.trim());
                }
              }}
            />
            {customCatName.trim().length > 0 && (
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setSaveCustomCat(!saveCustomCat)}
              >
                <Ionicons
                  name={saveCustomCat ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={saveCustomCat ? colors.primary : colors.textMuted}
                />
                <Text style={styles.checkboxLabel}>
                  Lưu vào danh sách mẫu để lần sau chọn nhanh
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Saved Notes Quick Pick & Note Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Ghi chú giao dịch</Text>

          {relevantNotes.length > 0 && (
            <View style={styles.notePills}>
              {relevantNotes.slice(0, 12).map((n) => {
                const isSelected = noteText === n.text;
                return (
                  <TouchableOpacity
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
                  </TouchableOpacity>
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

          {noteText.trim().length > 0 && (
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSaveCustomNote(!saveCustomNote)}
            >
              <Ionicons
                name={saveCustomNote ? 'checkbox' : 'square-outline'}
                size={18}
                color={saveCustomNote ? colors.primary : colors.textMuted}
              />
              <Text style={styles.checkboxLabel}>
                Lưu ghi chú này vào mẫu cho lần sau
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <GardenSprouts variant="chip" align="both" />
          <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
          <Text style={styles.saveBtnText}>
            {isBatch
              ? `Xác nhận phân loại ${batchIdList.length} giao dịch`
              : 'Lưu giao dịch'}
          </Text>
        </TouchableOpacity>
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
      padding: 16,
      paddingBottom: 40,
    },
    batchInfoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      gap: 8,
    },
    batchInfoText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
    },
    txSourceBox: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
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
      paddingHorizontal: 8,
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
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 10,
    },
    subLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      marginBottom: 6,
    },
    amountInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 10,
      paddingHorizontal: 12,
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
    catGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    catItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    catItemName: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    customCatBox: {
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 10,
    },
    textInput: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 13,
      borderWidth: 1,
      borderColor: colors.border,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 6,
    },
    checkboxLabel: {
      color: colors.textSecondary,
      fontSize: 11,
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
      borderRadius: 14,
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
      borderRadius: 14,
      paddingVertical: 14,
      gap: 8,
      marginTop: 8,
    },
    saveBtnText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
  });
