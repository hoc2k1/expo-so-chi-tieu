import React, { useState, useMemo } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { TransactionType } from '../../models/types';

export default function ClassifyModal() {
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
      Alert.alert('Chưa chọn phân loại', 'Vui lòng chọn hoặc nhập tên Phân loại.');
      return;
    }

    if (isBatch) {
      await batchClassify(batchIdList, {
        categoryId: finalCatId,
        categoryName: finalCatName,
        note: noteText.trim() || 'Phân loại hàng loạt',
      });
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

    router.back();
  };

  const isIncome = txType === 'income';

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header Info */}
        {isBatch ? (
          <View style={styles.batchInfoBanner}>
            <Ionicons name="layers" size={20} color="#A78BFA" />
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
                placeholderTextColor="#64748B"
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
                      isSelected && { color: '#FFFFFF', fontWeight: '700' },
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
              placeholderTextColor="#64748B"
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
                  color={saveCustomCat ? '#10B981' : '#64748B'}
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
            placeholderTextColor="#64748B"
            value={noteText}
            onChangeText={setNoteText}
          />

          {noteText.trim().length > 0 && (
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSaveCustomNote(!saveCustomNote)}
            >
              <Ionicons
                name={saveCustomNote ? 'checkbox' : 'square-outline'}
                size={18}
                color={saveCustomNote ? '#10B981' : '#64748B'}
              />
              <Text style={styles.checkboxLabel}>
                Lưu ghi chú này vào mẫu cho lần sau
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>
            {isBatch
              ? `Xác nhận phân loại ${batchIdList.length} giao dịch`
              : 'Lưu giao dịch'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    backgroundColor: '#8B5CF625',
    borderWidth: 1,
    borderColor: '#8B5CF660',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  batchInfoText: {
    color: '#DDD6FE',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  txSourceBox: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  txSourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  txSourceTitle: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  detectedTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detectedBadgeIncome: {
    backgroundColor: '#10B98120',
  },
  detectedBadgeExpense: {
    backgroundColor: '#EF444420',
  },
  detectedTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detectedTextIncome: {
    color: '#10B981',
  },
  detectedTextExpense: {
    color: '#EF4444',
  },
  txSourceRaw: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  subLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#94A3B8',
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
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  catItemName: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  customCatBox: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
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
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  checkboxLabel: {
    color: '#94A3B8',
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
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  notePillActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  notePillText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  notePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
