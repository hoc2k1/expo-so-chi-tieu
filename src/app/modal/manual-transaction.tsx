import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { TransactionType, SavedNote } from '../../models/types';
import { SUPPORTED_APPS } from '../../constants/defaultData';
import { formatCurrency } from '../../utils/formatters';
import { DateRangePickerModal } from '../../components/DateRangePickerModal';
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewRef,
} from '../../components/KeyboardAwareScrollView';
import { useTheme, ThemeColors } from '../../constants/theme';
import { GardenSprouts } from '../../components/GardenDecor';

type SourceTypeGroup = 'cash' | 'bank' | 'wallet';

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function ManualTransactionModal() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { categories, notes, addManualTransaction, showToast } = useApp();
  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);

  const [amountStr, setAmountStr] = useState('');
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedCatName, setSelectedCatName] = useState('');
  const [noteText, setNoteText] = useState('');

  // Source selection states
  const [sourceGroup, setSourceGroup] = useState<SourceTypeGroup>('cash');
  const [selectedSource, setSelectedSource] = useState('Tiền mặt');
  const [customSource, setCustomSource] = useState('');
  const [isCustomSource, setIsCustomSource] = useState(false);

  // Date & Time states (Default is current moment)
  const [txDateTime, setTxDateTime] = useState<Date>(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === txType);

  // Relevant notes for the selected category + shared notes
  const relevantNotes = notes.filter(
    (n: SavedNote) => !n.categoryId || n.categoryId === selectedCatId
  );

  // Banks and Wallets from SUPPORTED_APPS
  const bankApps = SUPPORTED_APPS.filter((a) => a.category === 'bank');
  const walletApps = SUPPORTED_APPS.filter((a) => a.category === 'wallet');

  // Quick Amount Additions
  const addQuickAmount = (val: number) => {
    const curr = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;
    setAmountStr((curr + val).toString());
  };

  const handleSelectGroup = (group: SourceTypeGroup) => {
    setSourceGroup(group);
    setIsCustomSource(false);
    if (group === 'cash') {
      setSelectedSource('Tiền mặt');
    } else if (group === 'bank') {
      setSelectedSource(bankApps[0]?.name || 'Vietcombank (VCB Digibank)');
    } else if (group === 'wallet') {
      setSelectedSource(walletApps[0]?.name || 'Ví MoMo');
    }
  };

  // Date and Time helpers
  const setQuickDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(txDateTime.getHours(), txDateTime.getMinutes(), 0, 0);
    setTxDateTime(d);
  };

  const setNowTime = () => {
    setTxDateTime(new Date());
  };

  const adjustMinutes = (deltaMin: number) => {
    const d = new Date(txDateTime.getTime() + deltaMin * 60000);
    setTxDateTime(d);
  };

  const handleSave = async () => {
    const cleanAmount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
    if (!cleanAmount || cleanAmount <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ', 'error');
      return;
    }

    if (!selectedCatName) {
      showToast('Vui lòng chọn 1 danh mục phân loại', 'error');
      return;
    }

    const finalSource = isCustomSource
      ? customSource.trim() || (sourceGroup === 'bank' ? 'Ngân hàng khác' : 'Ví khác')
      : selectedSource;

    await addManualTransaction({
      amount: cleanAmount,
      type: txType,
      categoryId: selectedCatId,
      categoryName: selectedCatName,
      note: noteText.trim() || selectedCatName,
      source: finalSource,
      date: txDateTime.toISOString(),
      timestamp: txDateTime.getTime(),
    });

    showToast('Đã thêm giao dịch thành công!', 'success');
    router.back();
  };

  const numericAmount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;

  // Formatted date string for display
  const dayStr = `${padZero(txDateTime.getDate())}/${padZero(txDateTime.getMonth() + 1)}/${txDateTime.getFullYear()}`;
  const timeStr = `${padZero(txDateTime.getHours())}:${padZero(txDateTime.getMinutes())}`;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* 1. Amount Input & Type Toggle */}
        <View style={styles.section}>
          <Text style={styles.label}>Số tiền (VND)</Text>
          <View style={styles.amountInputRow}>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={amountStr}
              onChangeText={setAmountStr}
              autoFocus
            />
            {numericAmount > 0 && (
              <Text style={styles.amountPreview}>
                {formatCurrency(numericAmount)}
              </Text>
            )}
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmountRow}>
            <TouchableOpacity style={styles.quickAmountBtn} onPress={() => addQuickAmount(10000)}>
              <Text style={styles.quickAmountText}>+10k</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAmountBtn} onPress={() => addQuickAmount(20000)}>
              <Text style={styles.quickAmountText}>+20k</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAmountBtn} onPress={() => addQuickAmount(50000)}>
              <Text style={styles.quickAmountText}>+50k</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAmountBtn} onPress={() => addQuickAmount(100000)}>
              <Text style={styles.quickAmountText}>+100k</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAmountBtn} onPress={() => addQuickAmount(500000)}>
              <Text style={styles.quickAmountText}>+500k</Text>
            </TouchableOpacity>
          </View>

          {/* Type Toggle: Chi tiêu / Thu nhập */}
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                txType === 'expense' && styles.typeBtnActiveExpense,
              ]}
              onPress={() => {
                setTxType('expense');
                setSelectedCatId('');
                setSelectedCatName('');
              }}
            >
              <Ionicons
                name="arrow-down-circle"
                size={16}
                color={txType === 'expense' ? colors.onPrimary : colors.expense}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  txType === 'expense' && styles.typeBtnTextActive,
                ]}
              >
                Chi tiêu (-)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeBtn,
                txType === 'income' && styles.typeBtnActiveIncome,
              ]}
              onPress={() => {
                setTxType('income');
                setSelectedCatId('');
                setSelectedCatName('');
              }}
            >
              <Ionicons
                name="arrow-up-circle"
                size={16}
                color={txType === 'income' ? colors.onPrimary : colors.income}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  txType === 'income' && styles.typeBtnTextActive,
                ]}
              >
                Thu nhập (+)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Nguồn tiền / Hình thức thanh toán (Nằm ngay dưới số tiền) */}
        <View style={styles.section}>
          <Text style={styles.label}>Nguồn tiền / Hình thức thanh toán</Text>

          {/* Source Group Selector (3 Tabs) */}
          <View style={styles.sourceGroupTabs}>
            <TouchableOpacity
              style={[
                styles.sourceGroupTab,
                sourceGroup === 'cash' && styles.sourceGroupTabActive,
              ]}
              onPress={() => handleSelectGroup('cash')}
            >
              <Ionicons
                name="cash-outline"
                size={16}
                color={sourceGroup === 'cash' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.sourceGroupTabText,
                  sourceGroup === 'cash' && styles.sourceGroupTabTextActive,
                ]}
              >
                Tiền mặt
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sourceGroupTab,
                sourceGroup === 'bank' && styles.sourceGroupTabActive,
              ]}
              onPress={() => handleSelectGroup('bank')}
            >
              <Ionicons
                name="business-outline"
                size={16}
                color={sourceGroup === 'bank' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.sourceGroupTabText,
                  sourceGroup === 'bank' && styles.sourceGroupTabTextActive,
                ]}
              >
                Ngân hàng
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sourceGroupTab,
                sourceGroup === 'wallet' && styles.sourceGroupTabActive,
              ]}
              onPress={() => handleSelectGroup('wallet')}
            >
              <Ionicons
                name="wallet-outline"
                size={16}
                color={sourceGroup === 'wallet' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.sourceGroupTabText,
                  sourceGroup === 'wallet' && styles.sourceGroupTabTextActive,
                ]}
              >
                Ví điện tử
              </Text>
            </TouchableOpacity>
          </View>

          {/* Group 1: Cash View */}
          {sourceGroup === 'cash' && (
            <View style={styles.cashSelectedCard}>
              <View style={styles.cashBadge}>
                <Ionicons name="cash" size={24} color={colors.income} />
              </View>
              <View style={styles.cashTexts}>
                <Text style={styles.cashTitle}>Tiền mặt (Cash)</Text>
                <Text style={styles.cashSubtitle}>Thanh toán tiền mặt trực tiếp</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={colors.income} />
            </View>
          )}

          {/* Group 2: Bank View */}
          {sourceGroup === 'bank' && (
            <View style={styles.subSourceContainer}>
              <Text style={styles.subLabel}>Chọn ngân hàng:</Text>
              <View style={styles.appGrid}>
                {bankApps.map((app) => {
                  const isSelected = !isCustomSource && selectedSource === app.name;
                  return (
                    <TouchableOpacity
                      key={app.packageName}
                      style={[
                        styles.appCard,
                        isSelected && styles.appCardActive,
                      ]}
                      onPress={() => {
                        setSelectedSource(app.name);
                        setIsCustomSource(false);
                      }}
                    >
                      <View
                        style={[
                          styles.appIconBadge,
                          { backgroundColor: app.color || '#3B82F6' },
                        ]}
                      >
                        <Ionicons name="business" size={12} color="#FFFFFF" />
                      </View>
                      <Text
                        style={[
                          styles.appCardText,
                          isSelected && styles.appCardTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {app.shortName || app.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Other Bank option */}
                <TouchableOpacity
                  style={[
                    styles.appCard,
                    isCustomSource && styles.appCardActive,
                  ]}
                  onPress={() => setIsCustomSource(true)}
                >
                  <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.appCardText,
                      isCustomSource && styles.appCardTextActive,
                    ]}
                  >
                    Ngân hàng khác
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomSource && (
                <TextInput
                  style={styles.customInput}
                  placeholder="Nhập tên ngân hàng (VD: OCB, VIB, SeABank...)"
                  placeholderTextColor={colors.textMuted}
                  value={customSource}
                  onChangeText={setCustomSource}
                  autoFocus
                />
              )}
            </View>
          )}

          {/* Group 3: Wallet View */}
          {sourceGroup === 'wallet' && (
            <View style={styles.subSourceContainer}>
              <Text style={styles.subLabel}>Chọn ví điện tử:</Text>
              <View style={styles.appGrid}>
                {walletApps.map((app) => {
                  const isSelected = !isCustomSource && selectedSource === app.name;
                  return (
                    <TouchableOpacity
                      key={app.packageName}
                      style={[
                        styles.appCard,
                        isSelected && styles.appCardActive,
                      ]}
                      onPress={() => {
                        setSelectedSource(app.name);
                        setIsCustomSource(false);
                      }}
                    >
                      <View
                        style={[
                          styles.appIconBadge,
                          { backgroundColor: app.color || '#F59E0B' },
                        ]}
                      >
                        <Ionicons name="wallet" size={12} color="#FFFFFF" />
                      </View>
                      <Text
                        style={[
                          styles.appCardText,
                          isSelected && styles.appCardTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {app.shortName || app.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Other Wallet option */}
                <TouchableOpacity
                  style={[
                    styles.appCard,
                    isCustomSource && styles.appCardActive,
                  ]}
                  onPress={() => setIsCustomSource(true)}
                >
                  <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.appCardText,
                      isCustomSource && styles.appCardTextActive,
                    ]}
                  >
                    Ví khác
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomSource && (
                <TextInput
                  style={styles.customInput}
                  placeholder="Nhập tên ví điện tử..."
                  placeholderTextColor={colors.textMuted}
                  value={customSource}
                  onChangeText={setCustomSource}
                  autoFocus
                />
              )}
            </View>
          )}

          {/* Selected Source Indicator */}
          <View style={styles.sourceResultBox}>
            <Text style={styles.sourceResultLabel}>Nguồn đã chọn: </Text>
            <Text style={styles.sourceResultValue} numberOfLines={1}>
              {isCustomSource
                ? customSource.trim() || (sourceGroup === 'bank' ? 'Ngân hàng khác' : 'Ví khác')
                : selectedSource}
            </Text>
          </View>
        </View>

        {/* 3. Thời gian giao dịch (Mặc định là hiện tại) */}
        <View style={styles.section}>
          <Text style={styles.label}>Thời gian giao dịch</Text>

          {/* Date & Time display banner */}
          <View style={styles.dateTimeBanner}>
            <View style={styles.dateTimeBannerLeft}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.dateTimeDisplay}>
                {dayStr} lúc <Text style={styles.dateTimeBold}>{timeStr}</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dateTimeEditBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={styles.dateTimeEditText}>Đổi ngày</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Date Shortcuts */}
          <View style={styles.quickDateRow}>
            <TouchableOpacity
              style={styles.quickDatePill}
              onPress={() => setQuickDate(0)}
            >
              <Text style={styles.quickDateText}>Hôm nay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDatePill}
              onPress={() => setQuickDate(1)}
            >
              <Text style={styles.quickDateText}>Hôm qua</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDatePill}
              onPress={() => setQuickDate(2)}
            >
              <Text style={styles.quickDateText}>Hôm kia</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDatePill}
              onPress={setNowTime}
            >
              <Text style={styles.quickDateText}>Vừa xong</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Time Adjusters */}
          <View style={styles.timeAdjustRow}>
            <Text style={styles.subLabel}>Chỉnh giờ phút nhanh:</Text>
            <View style={styles.timeButtonsGroup}>
              <TouchableOpacity
                style={styles.timeAdjustBtn}
                onPress={() => adjustMinutes(-60)}
              >
                <Text style={styles.timeAdjustText}>-1 giờ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timeAdjustBtn}
                onPress={() => adjustMinutes(-15)}
              >
                <Text style={styles.timeAdjustText}>-15p</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timeAdjustBtn}
                onPress={() => adjustMinutes(15)}
              >
                <Text style={styles.timeAdjustText}>+15p</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timeAdjustBtn}
                onPress={() => adjustMinutes(60)}
              >
                <Text style={styles.timeAdjustText}>+1 giờ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 4. Chọn Phân loại */}
        <View style={styles.section}>
          <Text style={styles.label}>Chọn Phân loại</Text>
          <View style={styles.catGrid}>
            {filteredCategories.map((cat) => {
              const isSelected = selectedCatId === cat.id;
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
                  }}
                >
                  <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                  <Text
                    style={[
                      styles.catName,
                      isSelected && { color: colors.text, fontWeight: '700' },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 5. Ghi chú giao dịch (Tách riêng ra, có danh sách dạng thẻ như phân loại) */}
        <View style={styles.section}>
          <Text style={styles.label}>Ghi chú giao dịch</Text>
          <Text style={styles.subLabel}>Chọn nhanh từ danh sách ghi chú:</Text>

          {/* Notes Grid like Categories */}
          <View style={styles.notesGrid}>
            {relevantNotes.map((n) => {
              const isSelected = noteText === n.text;
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[
                    styles.noteCardItem,
                    isSelected && styles.noteCardItemActive,
                  ]}
                  onPress={() => setNoteText(n.text)}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'document-text-outline'}
                    size={16}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.noteCardText,
                      isSelected && styles.noteCardTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {n.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Note input field */}
          <Text style={[styles.subLabel, { marginTop: 12 }]}>
            Hoặc nhập ghi chú tùy chỉnh:
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="VD: Ăn sáng phở bò, Mua quà sinh nhật..."
            placeholderTextColor={colors.textMuted}
            value={noteText}
            onChangeText={setNoteText}
            onFocus={() =>
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150)
            }
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <GardenSprouts variant="chip" align="both" />
          <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
          <Text style={styles.saveBtnText}>Lưu giao dịch</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      {/* Date Picker Modal */}
      <DateRangePickerModal
        visible={showDatePicker}
        initialStart={dayStr}
        initialEnd={dayStr}
        onClose={() => setShowDatePicker(false)}
        onApply={(startStr) => {
          // Parse DD/MM/YYYY into date
          const parts = startStr.split(' ')[0].split('/');
          if (parts.length === 3) {
            const d = new Date(txDateTime);
            d.setDate(parseInt(parts[0], 10));
            d.setMonth(parseInt(parts[1], 10) - 1);
            d.setFullYear(parseInt(parts[2], 10));
            setTxDateTime(d);
          }
          setShowDatePicker(false);
        }}
      />
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
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
    },
    subLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      marginBottom: 8,
      fontWeight: '500',
    },
    amountInputRow: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    amountInput: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    amountPreview: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 4,
    },
    quickAmountRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 8,
    },
    quickAmountBtn: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
      paddingVertical: 6,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickAmountText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    typeRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    typeBtn: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    typeBtnActiveExpense: {
      backgroundColor: colors.expense,
      borderColor: colors.expense,
    },
    typeBtnActiveIncome: {
      backgroundColor: colors.income,
      borderColor: colors.income,
    },
    typeBtnText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    typeBtnTextActive: {
      color: colors.onPrimary,
    },
    sourceGroupTabs: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 10,
      padding: 3,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sourceGroupTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      gap: 5,
    },
    sourceGroupTabActive: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
    },
    sourceGroupTabText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    sourceGroupTabTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    cashSelectedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.incomeBorder,
    },
    cashBadge: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.incomeSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    cashTexts: {
      flex: 1,
    },
    cashTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    cashSubtitle: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    subSourceContainer: {
      marginTop: 4,
    },
    appGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    appCard: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    appCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    appIconBadge: {
      width: 20,
      height: 20,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appCardText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      flex: 1,
    },
    appCardTextActive: {
      color: colors.text,
      fontWeight: '700',
    },
    customInput: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: colors.text,
      fontSize: 13,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    sourceResultBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sourceResultLabel: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    sourceResultValue: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
      flex: 1,
    },
    dateTimeBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateTimeBannerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dateTimeDisplay: {
      color: colors.text,
      fontSize: 13,
    },
    dateTimeBold: {
      color: colors.primary,
      fontWeight: '700',
    },
    dateTimeEditBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
    },
    dateTimeEditText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '600',
    },
    quickDateRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 8,
    },
    quickDatePill: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
      paddingVertical: 6,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickDateText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    timeAdjustRow: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 8,
    },
    timeButtonsGroup: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
    timeAdjustBtn: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
      paddingVertical: 6,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeAdjustText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    catGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    catItem: {
      width: '31%',
      backgroundColor: colors.surfaceSecondary,
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    catName: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },
    notesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    noteCardItem: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    noteCardItemActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    noteCardText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '500',
      flex: 1,
    },
    noteCardTextActive: {
      color: colors.text,
      fontWeight: '700',
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
    saveBtn: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      gap: 8,
      marginTop: 8,
    },
    saveBtnText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
  });
