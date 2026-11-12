import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { TransactionType } from '../../models/types';

export default function ManualTransactionModal() {
  const { categories, addManualTransaction } = useApp();

  const [amountStr, setAmountStr] = useState('');
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedCatName, setSelectedCatName] = useState('');
  const [noteText, setNoteText] = useState('');
  const [sourceName, setSourceName] = useState('Tiền mặt');

  const filteredCategories = categories.filter((c) => c.type === txType);

  const handleSave = async () => {
    const cleanAmount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
    if (!cleanAmount || cleanAmount <= 0) {
      Alert.alert('Chưa nhập số tiền', 'Vui lòng nhập số tiền hợp lệ.');
      return;
    }

    if (!selectedCatName) {
      Alert.alert('Chưa chọn phân loại', 'Vui lòng chọn 1 danh mục phân loại.');
      return;
    }

    await addManualTransaction({
      amount: cleanAmount,
      type: txType,
      categoryId: selectedCatId,
      categoryName: selectedCatName,
      note: noteText.trim() || 'Giao dịch tiền mặt',
      source: sourceName.trim() || 'Tiền mặt',
    });

    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Amount Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Số tiền (VND)</Text>
        <TextInput
          style={styles.amountInput}
          keyboardType="numeric"
          placeholder="VD: 50000"
          placeholderTextColor="#64748B"
          value={amountStr}
          onChangeText={setAmountStr}
        />

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

      {/* Category Selection */}
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
                  isSelected && { borderColor: cat.color, backgroundColor: `${cat.color}25` },
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
                    isSelected && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Note */}
      <View style={styles.section}>
        <Text style={styles.label}>Ghi chú & Nguồn tiền</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Nội dung ghi chú..."
          placeholderTextColor="#64748B"
          value={noteText}
          onChangeText={setNoteText}
        />

        <Text style={[styles.subLabel, { marginTop: 10 }]}>Hình thức thanh toán / Nguồn:</Text>
        <View style={styles.sourcePills}>
          {['Tiền mặt', 'Ví Momo', 'VCB', 'MB Bank', 'Chuyển khoản'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sourcePill, sourceName === s && styles.sourcePillActive]}
              onPress={() => setSourceName(s)}
            >
              <Text style={[styles.sourcePillText, sourceName === s && styles.sourcePillTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
        <Text style={styles.saveBtnText}>Lưu giao dịch</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
    marginBottom: 8,
  },
  subLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 6,
  },
  amountInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeBtnActiveExpense: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  typeBtnActiveIncome: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  catName: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
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
  sourcePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourcePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  sourcePillActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  sourcePillText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  sourcePillTextActive: {
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
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
