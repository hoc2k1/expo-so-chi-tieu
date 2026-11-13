import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { parseFlexibleDateTime } from '../utils/formatters';

interface DateRangePickerModalProps {
  visible: boolean;
  initialStart: string; // 'DD/MM/YYYY' or 'DD/MM/YYYY HH:mm'
  initialEnd: string;
  onClose: () => void;
  onApply: (startStr: string, endStr: string) => void;
}

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDateString(d: Date, withTime = true, isEndOfDay = false): string {
  const day = padZero(d.getDate());
  const month = padZero(d.getMonth() + 1);
  const year = d.getFullYear();
  if (!withTime) {
    return `${day}/${month}/${year}`;
  }
  const hh = isEndOfDay ? '23' : '00';
  const mm = isEndOfDay ? '59' : '00';
  return `${day}/${month}/${year} ${hh}:${mm}`;
}

const DateRangePickerModalContent: React.FC<Omit<DateRangePickerModalProps, 'visible'>> = ({
  initialStart,
  initialEnd,
  onClose,
  onApply,
}) => {
  // Extract initial start & end Date objects
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const ms = parseFlexibleDateTime(initialStart, false);
    return ms ? new Date(ms) : new Date();
  });
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const ms = parseFlexibleDateTime(initialEnd, true);
    return ms ? new Date(ms) : new Date();
  });

  // Current view year and month (0-indexed)
  const [viewYear, setViewYear] = useState(() => (startDate || new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (startDate || new Date()).getMonth());

  // Quick preset actions
  const applyPresetDays = (daysBack: number) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(Date.now() - (daysBack - 1) * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    setStartDate(start);
    setEndDate(end);
    setViewYear(end.getFullYear());
    setViewMonth(end.getMonth());
  };

  const applyThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    setStartDate(start);
    setEndDate(end);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  const applyLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    setStartDate(start);
    setEndDate(end);
    setViewYear(start.getFullYear());
    setViewMonth(start.getMonth());
  };

  const applyThisYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    setStartDate(start);
    setEndDate(end);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // In Vietnam/standard week, Monday = 0, Sunday = 6
    let dayOfWeek = firstDay.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6; // Sunday

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: ({ day: number; date: Date } | null)[] = [];

    // Empty cells before first day
    for (let i = 0; i < dayOfWeek; i++) {
      days.push(null);
    }

    // Month days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        date: new Date(viewYear, viewMonth, d),
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Date click handler
  const handleDayPress = (targetDate: Date) => {
    const targetMs = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    ).getTime();

    if (!startDate || (startDate && endDate)) {
      // First click: start new range
      const newStart = new Date(targetDate);
      newStart.setHours(0, 0, 0, 0);
      setStartDate(newStart);
      setEndDate(null);
    } else {
      // Second click: set end range
      const startMs = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      ).getTime();

      if (targetMs < startMs) {
        // Tapped before start -> make target the new start
        const newStart = new Date(targetDate);
        newStart.setHours(0, 0, 0, 0);
        setStartDate(newStart);
        setEndDate(null);
      } else {
        const newEnd = new Date(targetDate);
        newEnd.setHours(23, 59, 59, 999);
        setEndDate(newEnd);
      }
    }
  };

  // Check if a day is start, end, or inside range
  const getDayStatus = (d: Date) => {
    const tMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    const startMs = startDate
      ? new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate()
        ).getTime()
      : null;

    const endMs = endDate
      ? new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate()
        ).getTime()
      : null;

    const isStart = startMs !== null && tMs === startMs;
    const isEnd = endMs !== null && tMs === endMs;
    const isInRange =
      startMs !== null && endMs !== null && tMs > startMs && tMs < endMs;

    return { isStart, isEnd, isInRange, isToday };
  };

  const handleApply = () => {
    if (!startDate) {
      onClose();
      return;
    }
    const end = endDate || startDate;
    const startStr = formatDateString(startDate, true, false);
    const endStr = formatDateString(end, true, true);
    onApply(startStr, endStr);
    onClose();
  };

  const displayStart = startDate ? formatDateString(startDate, false) : '--/--/----';
  const displayEnd = endDate
    ? formatDateString(endDate, false)
    : startDate
    ? formatDateString(startDate, false)
    : '--/--/----';

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.sheetContainer} edges={['bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Chọn khoảng thời gian (Date Range)</Text>
              <Text style={styles.subtitle}>
                {displayStart} → {displayEnd}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Quick Presets */}
            <Text style={styles.sectionTitle}>Chọn nhanh:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsRow}
            >
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPresetDays(1)}
              >
                <Text style={styles.presetChipText}>Hôm nay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPresetDays(3)}
              >
                <Text style={styles.presetChipText}>3 ngày</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPresetDays(7)}
              >
                <Text style={styles.presetChipText}>7 ngày</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPresetDays(30)}
              >
                <Text style={styles.presetChipText}>30 ngày</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={applyThisMonth}
              >
                <Text style={styles.presetChipText}>Tháng này</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={applyLastMonth}
              >
                <Text style={styles.presetChipText}>Tháng trước</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={applyThisYear}
              >
                <Text style={styles.presetChipText}>Năm nay</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Calendar Controls */}
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
                <Ionicons name="chevron-back" size={20} color="#38BDF8" />
              </TouchableOpacity>

              <Text style={styles.monthTitle}>
                Tháng {viewMonth + 1} / {viewYear}
              </Text>

              <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
                <Ionicons name="chevron-forward" size={20} color="#38BDF8" />
              </TouchableOpacity>
            </View>

            {/* Week days header */}
            <View style={styles.weekRow}>
              {WEEK_DAYS.map((w, idx) => (
                <Text
                  key={w}
                  style={[
                    styles.weekDayText,
                    idx >= 5 && styles.weekEndText,
                  ]}
                >
                  {w}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((item, idx) => {
                if (!item) {
                  return <View key={`empty-${idx}`} style={styles.dayCell} />;
                }

                const { isStart, isEnd, isInRange, isToday } = getDayStatus(
                  item.date
                );
                const isSelectedEndpoint = isStart || isEnd;

                return (
                  <View
                    key={`day-${item.day}`}
                    style={[
                      styles.dayCell,
                      isInRange && styles.dayCellInRange,
                      isStart && endDate && styles.dayCellStartRange,
                      isEnd && styles.dayCellEndRange,
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.dayBtn,
                        isSelectedEndpoint && styles.dayBtnSelected,
                        isToday && !isSelectedEndpoint && styles.dayBtnToday,
                      ]}
                      onPress={() => handleDayPress(item.date)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isInRange && styles.dayTextInRange,
                          isSelectedEndpoint && styles.dayTextSelected,
                          isToday && !isSelectedEndpoint && styles.dayTextToday,
                        ]}
                      >
                        {item.day}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Instruction hint */}
            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={16} color="#94A3B8" />
              <Text style={styles.hintText}>
                Nhấn chọn ngày bắt đầu, sau đó nhấn ngày kết thúc để chọn khoảng ngày.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Ionicons name="checkmark-done" size={18} color="#0F172A" />
              <Text style={styles.applyBtnText}>Áp dụng khoảng ngày</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
  );
};

export const DateRangePickerModal: React.FC<DateRangePickerModalProps> = (props) => {
  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      {props.visible ? <DateRangePickerModalContent {...props} /> : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '85%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#38BDF8',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetChipText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  monthTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 6,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  weekEndText: {
    color: '#F59E0B',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  dayCell: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellInRange: {
    backgroundColor: '#0284C725',
  },
  dayCellStartRange: {
    borderTopLeftRadius: 21,
    borderBottomLeftRadius: 21,
    backgroundColor: '#0284C725',
  },
  dayCellEndRange: {
    borderTopRightRadius: 21,
    borderBottomRightRadius: 21,
    backgroundColor: '#0284C725',
  },
  dayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtnSelected: {
    backgroundColor: '#38BDF8',
  },
  dayBtnToday: {
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  dayText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
  },
  dayTextInRange: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },
  dayTextToday: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 16,
  },
  hintText: {
    color: '#94A3B8',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    gap: 6,
  },
  applyBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
});
