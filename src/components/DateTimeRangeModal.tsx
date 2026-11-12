import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseFlexibleDateTime } from '../utils/formatters';

interface DateTimeRangeModalProps {
  visible: boolean;
  initialStart: string;
  initialEnd: string;
  onClose: () => void;
  onApply: (startStr: string, endStr: string) => void;
}

function formatDT(d: Date): string {
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hh}:${mm}`;
}

export const DateTimeRangeModal: React.FC<DateTimeRangeModalProps> = ({
  visible,
  initialStart,
  initialEnd,
  onClose,
  onApply,
}) => {
  const [startText, setStartText] = useState(initialStart);
  const [endText, setEndText] = useState(initialEnd);

  const applyPresetDays = (daysBack: number) => {
    const end = new Date();
    end.setHours(23, 59, 0, 0);
    const start = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    setStartText(formatDT(start));
    setEndText(formatDT(end));
  };

  const applyLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 0);
    setStartText(formatDT(start));
    setEndText(formatDT(end));
  };

  const applyThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);
    setStartText(formatDT(start));
    setEndText(formatDT(end));
  };

  const shiftDays = (isStart: boolean, deltaDays: number) => {
    const raw = isStart ? startText : endText;
    const ms = parseFlexibleDateTime(raw, !isStart) ?? Date.now();
    const d = new Date(ms + deltaDays * 24 * 60 * 60 * 1000);
    if (isStart) {
      setStartText(formatDT(d));
    } else {
      setEndText(formatDT(d));
    }
  };

  const handleConfirm = () => {
    const sMs = parseFlexibleDateTime(startText, false);
    const eMs = parseFlexibleDateTime(endText, true);
    if (sMs === null || eMs === null) {
      Alert.alert(
        'Định dạng ngày chưa đúng',
        'Vui lòng nhập theo định dạng DD/MM/YYYY hoặc DD/MM/YYYY HH:mm (VD: 01/11/2026 00:00)'
      );
      return;
    }
    if (sMs > eMs) {
      Alert.alert('Khoảng thời gian không hợp lệ', 'Thời gian bắt đầu phải nhỏ hơn hoặc bằng thời gian kết thúc.');
      return;
    }
    onApply(startText.trim(), endText.trim());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Chọn khoảng thời gian</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Quick presets */}
          <Text style={styles.sectionLabel}>Chọn nhanh:</Text>
          <View style={styles.presetRow}>
            <TouchableOpacity style={styles.presetBtn} onPress={() => applyPresetDays(3)}>
              <Text style={styles.presetText}>3 ngày qua</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => applyPresetDays(7)}>
              <Text style={styles.presetText}>7 ngày qua</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => applyPresetDays(30)}>
              <Text style={styles.presetText}>30 ngày qua</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={applyThisMonth}>
              <Text style={styles.presetText}>Đầu tháng nay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={applyLastMonth}>
              <Text style={styles.presetText}>Tháng trước</Text>
            </TouchableOpacity>
          </View>

          {/* Start Date/Time */}
          <Text style={styles.sectionLabel}>Từ ngày / giờ (DD/MM/YYYY HH:mm):</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => shiftDays(true, -1)}
            >
              <Ionicons name="remove" size={18} color="#38BDF8" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={startText}
              onChangeText={setStartText}
              placeholder="01/11/2026 00:00"
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => shiftDays(true, 1)}
            >
              <Ionicons name="add" size={18} color="#38BDF8" />
            </TouchableOpacity>
          </View>

          {/* End Date/Time */}
          <Text style={styles.sectionLabel}>Đến ngày / giờ (DD/MM/YYYY HH:mm):</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => shiftDays(false, -1)}
            >
              <Ionicons name="remove" size={18} color="#38BDF8" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={endText}
              onChangeText={setEndText}
              placeholder="30/11/2026 23:59"
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => shiftDays(false, 1)}
            >
              <Ionicons name="add" size={18} color="#38BDF8" />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleConfirm}>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.applyText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  presetBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    backgroundColor: '#0F172A',
    width: 38,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  cancelText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#10B981',
    gap: 6,
  },
  applyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

