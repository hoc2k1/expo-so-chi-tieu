import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { TransactionType, SavedNote } from '../../models/types';
import { SUPPORTED_APPS } from '../../constants/defaultData';
import { formatCurrency } from '../../utils/formatters';
import { DateTimePickerModal } from '../../components/DateTimePickerModal';
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewRef,
} from '../../components/KeyboardAwareScrollView';
import { GardenSprouts } from '../../components/GardenDecor';
import { SpringPressable } from '../../components/Motion';
import { TypeSwitcher } from '../../components/ui/TypeSwitcher';
import { CategoryPickerSection } from '../../components/CategoryPickerSection';
import { SaveTemplateCheckbox } from '../../components/ui/SaveTemplateCheckbox';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
} from '../../constants/theme';

type SourceTypeGroup = 'cash' | 'bank' | 'wallet';

const QUICK_AMOUNTS = [
  { label: '+10k', value: 10000 },
  { label: '+20k', value: 20000 },
  { label: '+50k', value: 50000 },
  { label: '+100k', value: 100000 },
  { label: '+500k', value: 500000 },
];

const SOURCE_TABS: { id: SourceTypeGroup; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'cash', label: 'Tiền mặt', icon: 'cash-outline' },
  { id: 'bank', label: 'Ngân hàng', icon: 'business-outline' },
  { id: 'wallet', label: 'Ví điện tử', icon: 'wallet-outline' },
];

const QUICK_DATES = [
  { label: 'Hôm nay', daysAgo: 0 },
  { label: 'Hôm qua', daysAgo: 1 },
  { label: 'Hôm kia', daysAgo: 2 },
];

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function resolveInitialSource(source?: string): {
  group: SourceTypeGroup;
  selected: string;
  isCustom: boolean;
  custom: string;
} {
  if (!source || source === 'Tiền mặt') {
    return { group: 'cash', selected: 'Tiền mặt', isCustom: false, custom: '' };
  }
  const bankMatch = SUPPORTED_APPS.find((a) => a.category === 'bank' && a.name === source);
  if (bankMatch) {
    return { group: 'bank', selected: bankMatch.name, isCustom: false, custom: '' };
  }
  const walletMatch = SUPPORTED_APPS.find((a) => a.category === 'wallet' && a.name === source);
  if (walletMatch) {
    return { group: 'wallet', selected: walletMatch.name, isCustom: false, custom: '' };
  }
  const looksLikeWallet = /ví|momo|zalopay|vnpay|shopeepay|viettel/i.test(source);
  return {
    group: looksLikeWallet ? 'wallet' : 'bank',
    selected: source,
    isCustom: true,
    custom: source,
  };
}

export default function ManualTransactionModal() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { txId } = useLocalSearchParams<{ txId?: string }>();
  const {
    transactions,
    categories,
    notes,
    addManualTransaction,
    updateTransaction,
    showToast,
  } = useApp();
  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);

  const editingTx = useMemo(
    () => (txId ? transactions.find((t) => t.id === txId) : undefined),
    [txId, transactions]
  );

  const initialSource = useMemo(
    () => resolveInitialSource(editingTx?.source),
    [editingTx?.source]
  );

  const [amountStr, setAmountStr] = useState(() =>
    editingTx ? editingTx.amount.toString() : ''
  );
  const [txType, setTxType] = useState<TransactionType>(
    () => editingTx?.type ?? 'expense'
  );
  const [selectedCatId, setSelectedCatId] = useState(() => {
    if (editingTx) return editingTx.categoryId;
    return categories.find((c) => c.type === 'expense')?.id ?? '';
  });
  const [selectedCatName, setSelectedCatName] = useState(() => {
    if (editingTx) return editingTx.categoryName;
    return categories.find((c) => c.type === 'expense')?.name ?? '';
  });
  const [customCatName, setCustomCatName] = useState(() => {
    if (editingTx && !categories.some((c) => c.id === editingTx.categoryId)) {
      return editingTx.categoryName;
    }
    return '';
  });
  const [saveCustomCat, setSaveCustomCat] = useState(true);
  const [noteText, setNoteText] = useState(() => editingTx?.note ?? '');
  const [saveCustomNote, setSaveCustomNote] = useState(false);

  const [sourceGroup, setSourceGroup] = useState<SourceTypeGroup>(initialSource.group);
  const [selectedSource, setSelectedSource] = useState(initialSource.selected);
  const [customSource, setCustomSource] = useState(initialSource.custom);
  const [isCustomSource, setIsCustomSource] = useState(initialSource.isCustom);

  const [txDateTime, setTxDateTime] = useState<Date>(() =>
    editingTx ? new Date(editingTx.timestamp || editingTx.date) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === txType);
  const relevantNotes = notes.filter(
    (n: SavedNote) => !n.categoryId || n.categoryId === selectedCatId
  );
  const trimmedNote = noteText.trim();
  const canSaveNote =
    trimmedNote.length > 0 &&
    !relevantNotes.some((n) => n.text.trim().toLowerCase() === trimmedNote.toLowerCase());

  const bankApps = SUPPORTED_APPS.filter((a) => a.category === 'bank');
  const walletApps = SUPPORTED_APPS.filter((a) => a.category === 'wallet');
  const activeGroupApps = sourceGroup === 'bank' ? bankApps : walletApps;

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
    } else {
      setSelectedSource(walletApps[0]?.name || 'Ví MoMo');
    }
  };

  const setQuickDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(txDateTime.getHours(), txDateTime.getMinutes(), 0, 0);
    setTxDateTime(d);
  };

  const handleSave = async () => {
    const cleanAmount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
    if (!cleanAmount || cleanAmount <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ', 'error');
      return;
    }

    let finalCatId = selectedCatId;
    let finalCatName = selectedCatName;

    if (customCatName.trim()) {
      finalCatId = '';
      finalCatName = customCatName.trim();
    }

    if (!finalCatName) {
      showToast('Vui lòng chọn hoặc nhập tên Phân loại.', 'error');
      return;
    }

    const finalSource = isCustomSource
      ? customSource.trim() || (sourceGroup === 'bank' ? 'Ngân hàng khác' : 'Ví khác')
      : selectedSource;

    const templateOptions = {
      saveNewCategory: customCatName.trim().length > 0 && saveCustomCat,
      saveNewNote: canSaveNote && saveCustomNote,
    };

    if (editingTx) {
      await updateTransaction(
        {
          ...editingTx,
          amount: cleanAmount,
          type: txType,
          categoryId: finalCatId,
          categoryName: finalCatName,
          note: trimmedNote || finalCatName,
          source: finalSource,
          date: txDateTime.toISOString().split('T')[0],
          timestamp: txDateTime.getTime(),
        },
        templateOptions
      );
      showToast('Đã cập nhật giao dịch thành công!', 'success');
      router.back();
      return;
    }

    await addManualTransaction({
      amount: cleanAmount,
      type: txType,
      categoryId: finalCatId,
      categoryName: finalCatName,
      note: trimmedNote || finalCatName,
      source: finalSource,
      date: txDateTime.toISOString(),
      timestamp: txDateTime.getTime(),
      ...templateOptions,
    });

    showToast('Đã thêm giao dịch thành công!', 'success');
    router.back();
  };

  const numericAmount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;
  const dayStr = `${padZero(txDateTime.getDate())}/${padZero(txDateTime.getMonth() + 1)}/${txDateTime.getFullYear()}`;
  const timeStr = `${padZero(txDateTime.getHours())}:${padZero(txDateTime.getMinutes())}`;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{ title: editingTx ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch' }}
      />
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
              autoFocus={!editingTx}
            />
            {numericAmount > 0 && (
              <Text style={styles.amountPreview}>{formatCurrency(numericAmount)}</Text>
            )}
          </View>

          <View style={styles.quickAmountRow}>
            {QUICK_AMOUNTS.map((item) => (
              <Pressable
                key={item.value}
                style={styles.quickAmountBtn}
                onPress={() => addQuickAmount(item.value)}
              >
                <Text style={styles.quickAmountText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <TypeSwitcher
            value={txType}
            onChange={(type) => {
              setTxType(type);
              const firstMatch = categories.find((c) => c.type === type);
              setSelectedCatId(firstMatch?.id ?? '');
              setSelectedCatName(firstMatch?.name ?? '');
              setCustomCatName('');
            }}
            expenseLabel="Chi tiêu (-)"
            incomeLabel="Thu nhập (+)"
            showIcons
            showSprouts={false}
            style={{ marginTop: Spacing.md, backgroundColor: colors.surfaceSecondary }}
          />
        </View>

        {/* 2. Nguồn tiền / Hình thức thanh toán */}
        <View style={styles.section}>
          <Text style={styles.label}>Nguồn tiền / Hình thức thanh toán</Text>

          <View style={styles.sourceGroupTabs}>
            {SOURCE_TABS.map((tab) => {
              const active = sourceGroup === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  style={[styles.sourceGroupTab, active && styles.sourceGroupTabActive]}
                  onPress={() => handleSelectGroup(tab.id)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={active ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.sourceGroupTabText,
                      active && styles.sourceGroupTabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {sourceGroup === 'cash' ? (
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
          ) : (
            <View style={styles.subSourceContainer}>
              <Text style={styles.subLabel}>
                {sourceGroup === 'bank' ? 'Chọn ngân hàng:' : 'Chọn ví điện tử:'}
              </Text>
              <View style={styles.appGrid}>
                {activeGroupApps.map((app) => {
                  const isSelected = !isCustomSource && selectedSource === app.name;
                  return (
                    <Pressable
                      key={app.packageName}
                      style={[styles.appCard, isSelected && styles.appCardActive]}
                      onPress={() => {
                        setSelectedSource(app.name);
                        setIsCustomSource(false);
                      }}
                    >
                      <View
                        style={[
                          styles.appIconBadge,
                          {
                            backgroundColor:
                              app.color || (sourceGroup === 'bank' ? colors.info : colors.warning),
                          },
                        ]}
                      >
                        <Ionicons
                          name={sourceGroup === 'bank' ? 'business' : 'wallet'}
                          size={12}
                          color={colors.onPrimary}
                        />
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
                    </Pressable>
                  );
                })}

                <Pressable
                  style={[styles.appCard, isCustomSource && styles.appCardActive]}
                  onPress={() => setIsCustomSource(true)}
                >
                  <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.appCardText,
                      isCustomSource && styles.appCardTextActive,
                    ]}
                  >
                    {sourceGroup === 'bank' ? 'Ngân hàng khác' : 'Ví khác'}
                  </Text>
                </Pressable>
              </View>

              {isCustomSource && (
                <TextInput
                  style={styles.customInput}
                  placeholder={
                    sourceGroup === 'bank'
                      ? 'Nhập tên ngân hàng (VD: OCB, VIB, SeABank...)'
                      : 'Nhập tên ví điện tử...'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={customSource}
                  onChangeText={setCustomSource}
                  autoFocus
                />
              )}
            </View>
          )}

          <View style={styles.sourceResultBox}>
            <Text style={styles.sourceResultLabel}>Nguồn đã chọn: </Text>
            <Text style={styles.sourceResultValue} numberOfLines={1}>
              {isCustomSource
                ? customSource.trim() || (sourceGroup === 'bank' ? 'Ngân hàng khác' : 'Ví khác')
                : selectedSource}
            </Text>
          </View>
        </View>

        {/* 3. Thời gian giao dịch */}
        <View style={styles.section}>
          <Text style={styles.label}>Thời gian giao dịch</Text>

          <Pressable
            style={styles.dateTimeBanner}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.dateTimeBannerLeft}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.dateTimeDisplay}>
                {dayStr} lúc <Text style={styles.dateTimeBold}>{timeStr}</Text>
              </Text>
            </View>
            <View style={styles.dateTimeEditBtn}>
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={styles.dateTimeEditText}>Chọn ngày & giờ</Text>
            </View>
          </Pressable>

          <View style={styles.quickDateRow}>
            {QUICK_DATES.map((d) => (
              <Pressable
                key={d.label}
                style={styles.quickDatePill}
                onPress={() => setQuickDate(d.daysAgo)}
              >
                <Text style={styles.quickDateText}>{d.label}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.quickDatePill}
              onPress={() => setTxDateTime(new Date())}
            >
              <Text style={styles.quickDateText}>Vừa xong</Text>
            </Pressable>
          </View>
        </View>

        {/* 4. Chọn Phân loại */}
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

        {/* 5. Ghi chú giao dịch */}
        <View style={styles.section}>
          <Text style={styles.label}>Ghi chú giao dịch</Text>
          <Text style={styles.subLabel}>Chọn nhanh từ danh sách ghi chú:</Text>

          <View style={styles.notesGrid}>
            {relevantNotes.map((n) => {
              const isSelected = noteText === n.text;
              return (
                <Pressable
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
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { marginTop: Spacing.md }]}>
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
            {editingTx ? 'Cập nhật giao dịch' : 'Lưu giao dịch'}
          </Text>
        </SpringPressable>
      </KeyboardAwareScrollView>

      <DateTimePickerModal
        visible={showDatePicker}
        value={txDateTime}
        onClose={() => setShowDatePicker(false)}
        onApply={(nextDate) => setTxDateTime(nextDate)}
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
      padding: Spacing.base,
      paddingBottom: Spacing.xxl,
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
      fontSize: 14,
      fontWeight: '700',
      marginBottom: Spacing.sm,
    },
    subLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      marginBottom: Spacing.sm,
      fontWeight: '500',
    },
    amountInputRow: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.md,
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
      marginTop: Spacing.xs,
    },
    quickAmountRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: Spacing.sm,
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
    sourceGroupTabs: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.sm,
      padding: Spacing.xs,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sourceGroupTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
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
      padding: Spacing.md,
      borderRadius: Radius.sm,
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
      marginTop: Spacing.xs,
    },
    appGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    appCard: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      paddingVertical: 9,
      paddingHorizontal: Spacing.sm,
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
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      color: colors.text,
      fontSize: 13,
      marginTop: Spacing.sm,
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
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateTimeBannerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
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
      gap: Spacing.xs,
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
      marginTop: Spacing.sm,
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
    notesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
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
      gap: Spacing.sm,
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
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.md,
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
      borderRadius: Radius.md,
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    saveBtnText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
  });
