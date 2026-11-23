import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GardenSprouts } from './GardenDecor';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  TouchTarget,
} from '../constants/theme';

interface DateTimePickerModalProps {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onApply: (date: Date) => void;
}

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const QUICK_MINUTES = [0, 15, 30, 45];

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function clampInt(raw: string, max: number, fallback: number): number {
  const parsed = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(0, Math.min(max, parsed));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DateTimePickerContent: React.FC<Omit<DateTimePickerModalProps, 'visible'>> = ({
  value,
  onClose,
  onApply,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(value));
  const [viewYear, setViewYear] = useState(() => value.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value.getMonth());
  const [hourStr, setHourStr] = useState(() => padZero(value.getHours()));
  const [minuteStr, setMinuteStr] = useState(() => padZero(value.getMinutes()));

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let offset = firstDay.getDay() - 1;
    if (offset === -1) offset = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: ({ day: number; date: Date } | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, date: new Date(viewYear, viewMonth, d) });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const selectQuickDay = (daysAgo: number, resetNow = false) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setSelectedDate(d);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    if (resetNow) {
      const now = new Date();
      setHourStr(padZero(now.getHours()));
      setMinuteStr(padZero(now.getMinutes()));
    }
  };

  const stepHour = (delta: number) => {
    const curr = clampInt(hourStr, 23, 0);
    setHourStr(padZero((curr + delta + 24) % 24));
  };

  const stepMinute = (delta: number) => {
    const curr = clampInt(minuteStr, 59, 0);
    setMinuteStr(padZero((curr + delta + 60) % 60));
  };

  const handleConfirm = () => {
    const h = clampInt(hourStr, 23, value.getHours());
    const m = clampInt(minuteStr, 59, value.getMinutes());
    const result = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      h,
      m,
      0,
      0
    );
    onApply(result);
    onClose();
  };

  const today = new Date();

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <GardenSprouts variant="modal" />
        <View style={styles.header}>
          <Text style={styles.title}>Chọn ngày & giờ</Text>
          <Pressable
            onPress={onClose}
            hitSlop={TouchTarget.hitSlop}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Quick Presets */}
          <View style={styles.quickRow}>
            {[
              { label: 'Hôm nay', daysAgo: 0 },
              { label: 'Hôm qua', daysAgo: 1 },
              { label: 'Hôm kia', daysAgo: 2 },
            ].map((item) => (
              <Pressable
                key={item.label}
                style={styles.quickPill}
                onPress={() => selectQuickDay(item.daysAgo)}
              >
                <Text style={styles.quickPillText}>{item.label}</Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.quickPill, styles.quickPillAccent]}
              onPress={() => selectQuickDay(0, true)}
            >
              <Text style={[styles.quickPillText, { color: colors.primary }]}>Bây giờ</Text>
            </Pressable>
          </View>

          {/* Calendar Month Header */}
          <View style={styles.monthHeader}>
            <Pressable
              style={styles.monthNavBtn}
              onPress={() => shiftMonth(-1)}
              hitSlop={TouchTarget.hitSlop}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
            <Text style={styles.monthLabel}>
              Tháng {padZero(viewMonth + 1)}/{viewYear}
            </Text>
            <Pressable
              style={styles.monthNavBtn}
              onPress={() => shiftMonth(1)}
              hitSlop={TouchTarget.hitSlop}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((wd) => (
              <Text key={wd} style={styles.weekDayText}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((cell, idx) => {
              if (!cell) return <View key={`empty_${idx}`} style={styles.dayCell} />;
              const selected = isSameDay(cell.date, selectedDate);
              const isToday = isSameDay(cell.date, today);
              return (
                <Pressable
                  key={cell.day}
                  style={[
                    styles.dayCell,
                    isToday && !selected && styles.dayCellToday,
                    selected && styles.dayCellSelected,
                  ]}
                  onPress={() => setSelectedDate(cell.date)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isToday && !selected && { color: colors.primary, fontWeight: '700' },
                      selected && styles.dayTextSelected,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Direct Time Picker */}
          <View style={styles.timeSection}>
            <Text style={styles.timeSectionLabel}>Giờ & Phút</Text>
            <View style={styles.timeStepperRow}>
              <View style={styles.timeUnitBox}>
                <Pressable style={styles.stepBtn} onPress={() => stepHour(-1)}>
                  <Ionicons name="remove" size={18} color={colors.text} />
                </Pressable>
                <TextInput
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                  value={hourStr}
                  onChangeText={(t) => setHourStr(t.replace(/[^0-9]/g, ''))}
                  onBlur={() => setHourStr(padZero(clampInt(hourStr, 23, 0)))}
                />
                <Pressable style={styles.stepBtn} onPress={() => stepHour(1)}>
                  <Ionicons name="add" size={18} color={colors.text} />
                </Pressable>
              </View>

              <Text style={styles.timeColon}>:</Text>

              <View style={styles.timeUnitBox}>
                <Pressable style={styles.stepBtn} onPress={() => stepMinute(-1)}>
                  <Ionicons name="remove" size={18} color={colors.text} />
                </Pressable>
                <TextInput
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                  value={minuteStr}
                  onChangeText={(t) => setMinuteStr(t.replace(/[^0-9]/g, ''))}
                  onBlur={() => setMinuteStr(padZero(clampInt(minuteStr, 59, 0)))}
                />
                <Pressable style={styles.stepBtn} onPress={() => stepMinute(1)}>
                  <Ionicons name="add" size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <View style={styles.quickMinRow}>
              {QUICK_MINUTES.map((m) => {
                const active = clampInt(minuteStr, 59, -1) === m;
                return (
                  <Pressable
                    key={m}
                    style={[styles.quickMinChip, active && styles.quickMinChipActive]}
                    onPress={() => setMinuteStr(padZero(m))}
                  >
                    <Text
                      style={[
                        styles.quickMinText,
                        active && { color: colors.onPrimary, fontWeight: '700' },
                      ]}
                    >
                      :{padZero(m)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Hủy</Text>
          </Pressable>
          <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
            <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
            <Text style={styles.confirmBtnText}>Xác nhận</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export const DateTimePickerModal: React.FC<DateTimePickerModalProps> = ({
  visible,
  value,
  onClose,
  onApply,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    {visible && <DateTimePickerContent value={value} onClose={onClose} onApply={onApply} />}
  </Modal>
);

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'center',
      padding: Spacing.base,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      padding: Spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    closeBtn: {
      padding: 4,
    },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: Spacing.md,
    },
    quickPill: {
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: Spacing.sm + 2,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickPillAccent: {
      borderColor: `${colors.primary}55`,
      backgroundColor: `${colors.primary}12`,
    },
    quickPillText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    monthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    monthNavBtn: {
      padding: 6,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.sm,
    },
    monthLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    weekDayText: {
      width: '14.28%',
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: Spacing.md,
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1.15,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.sm,
    },
    dayCellToday: {
      borderWidth: 1,
      borderColor: colors.primary,
    },
    dayCellSelected: {
      backgroundColor: colors.primary,
    },
    dayText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    dayTextSelected: {
      color: colors.onPrimary,
      fontWeight: '800',
    },
    timeSection: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: Spacing.md,
    },
    timeSectionLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    timeStepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    timeUnitBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    stepBtn: {
      paddingHorizontal: Spacing.sm + 2,
      paddingVertical: Spacing.sm,
      backgroundColor: colors.surface,
    },
    timeInput: {
      width: 44,
      textAlign: 'center',
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      paddingVertical: 6,
      fontVariant: ['tabular-nums'],
    },
    timeColon: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    quickMinRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    quickMinChip: {
      backgroundColor: colors.surface,
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickMinChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    quickMinText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    footer: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    cancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: colors.surfaceSecondary,
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    confirmBtn: {
      flex: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: colors.primary,
    },
    confirmBtnText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
