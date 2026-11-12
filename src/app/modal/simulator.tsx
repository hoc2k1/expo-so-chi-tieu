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

interface TestPreset {
  id: string;
  name: string;
  packageName: string;
  title: string;
  text: string;
  tag: string;
  tagColor: string;
}

const PRESETS: TestPreset[] = [
  {
    id: 'p1',
    name: 'Vietcombank - Highland Coffee',
    packageName: 'com.VCB',
    title: 'Vietcombank Digibank',
    text: 'VCB: TK 0011004123456 -55,000 VND luc 12-11-2024 08:30. SD: 2,450,000 VND. Ref: MBVCB.12345. Mua HIGHLANDS COFFEE',
    tag: 'Ăn uống (-55K)',
    tagColor: '#EF4444',
  },
  {
    id: 'p2',
    name: 'MB Bank - Grab Food',
    packageName: 'com.mbmobile',
    title: 'MB Bank',
    text: 'MB: TK 1234567890 -120,000VND vao 12/11/2024 19:20. SD: 1,500,000VND. ND: GRAB FOOD thanh toan don hang',
    tag: 'Di chuyển (-120K)',
    tagColor: '#F97316',
  },
  {
    id: 'p3',
    name: 'Techcombank - Tiền điện EVN',
    packageName: 'vn.com.techcombank.bb.app',
    title: 'Techcombank Mobile',
    text: 'Tai khoan 1903... bien dong: -450,000 VND lúc 15:30 12/11/2024. So du: 3,200,000 VND. Noi dung: TIEN DIEN thang 11',
    tag: 'Hóa đơn (-450K)',
    tagColor: '#F59E0B',
  },
  {
    id: 'p4',
    name: 'Ví MoMo - Mua sắm Shopee',
    packageName: 'com.mservice.momotransfer',
    title: 'Ví MoMo',
    text: 'Bạn đã thanh toán thành công 89.000đ cho đơn hàng SHOPEE qua Ví MoMo',
    tag: 'Mua sắm (-89K)',
    tagColor: '#EC4899',
  },
  {
    id: 'p5',
    name: 'Vietcombank - Nhận lương tháng',
    packageName: 'com.VCB',
    title: 'Vietcombank Digibank',
    text: 'TK 007100... | GD: +18,000,000VND 12/11/24 14:00 | SD: 25,500,000VND | ND: LUONG THANG 11 CONG TY',
    tag: 'Thu nhập (+18Tr)',
    tagColor: '#10B981',
  },
];

export default function SimulatorModal() {
  const { simulateNotification } = useApp();

  const [customPackage, setCustomPackage] = useState('com.VCB');
  const [customTitle, setCustomTitle] = useState('Vietcombank');
  const [customText, setCustomText] = useState('TK 123456 -50,000 VND lúc 10:00. ND: Ăn sáng');

  const runSimulation = async (pkg: string, title: string, text: string) => {
    const res = await simulateNotification(pkg, title, text);
    if (res.status === 'hard_duplicate') {
      Alert.alert('🚫 Lớp 1: Đã chặn ngầm (Hard Duplicate)', res.message);
    } else if (res.status === 'soft_duplicate_added') {
      Alert.alert('⚠️ Lớp 2: Đã thêm kèm Cảnh báo Nghi trùng', res.message);
      router.back();
    } else if (res.status === 'added') {
      Alert.alert('✅ Thành công', `Đã thêm giao dịch vào Hàng chờ!`);
      router.back();
    } else {
      Alert.alert('Thông báo', res.message);
    }
  };

  // Test hard duplicate: trigger identical twice
  const testHardDuplicateScenario = async () => {
    const pkg = 'com.VCB';
    const title = 'Vietcombank';
    const text = `VCB: TK 0011004123456 -75,000 VND luc 12-11. SD: 1,900,000 VND. Ref: VCB99999. Mua sach`;

    await simulateNotification(pkg, title, text);
    // Bắn lần 2 giống hệt ngay sau đó
    const res2 = await simulateNotification(pkg, title, text);
    Alert.alert(
      'Kịch bản Trùng Lặp Hard (Lớp 1)',
      `Đã bắn 2 thông báo giống hệt nhau liên tiếp.\n\nKết quả lần 2: ${res2.message}\n(Đã tự động chặn ngầm 100%, không sinh rác Hàng chờ!)`
    );
    router.back();
  };

  // Test soft duplicate: 1 from MB Bank app, 1 from Gmail for same 80k
  const testSoftDuplicateScenario = async () => {
    const mbText = 'MB: TK 12345 -80,000VND lúc 10:00. ND: Chuyen tien mua tra';
    const gmailText = 'Thông báo biến động MBBank: Số tiền -80,000 VND. Chi tiết: Chuyen tien mua tra';

    await simulateNotification('com.mbmobile', 'MB Bank', mbText);
    const res2 = await simulateNotification('com.google.android.gm', 'Gmail - MBBank', gmailText);

    Alert.alert(
      'Kịch bản Nghi Trùng Soft (Lớp 2)',
      `Đã bắn 1 thông báo từ App MB Bank (-80K) và 1 thông báo từ Gmail (-80K).\n\nKết quả: ${res2.message}\n(Vẫn hiển thị trong Hàng chờ nhưng gắn nhãn Cảnh báo vàng/đỏ "Nghi trùng" kèm nút 1 chạm "Bỏ qua / Xóa trùng"!)`
    );
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Introduction */}
      <View style={styles.introBox}>
        <Ionicons name="information-circle" size={20} color="#38BDF8" />
        <Text style={styles.introText}>
          Giả lập bắn các thông báo ngân hàng / ví điện tử mẫu để kiểm thử bóc tách số tiền, gợi ý phân loại và cơ chế chống trùng ngay trên máy.
        </Text>
      </View>

      {/* Special Deduplication Test Scenarios */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kiểm thử Cơ chế Chống trùng (2 Lớp)</Text>

        <TouchableOpacity
          style={styles.scenarioBtn}
          onPress={testHardDuplicateScenario}
        >
          <View style={styles.scenarioIconBox}>
            <Ionicons name="shield-checkmark" size={20} color="#EF4444" />
          </View>
          <View style={styles.scenarioTexts}>
            <Text style={styles.scenarioTitle}>Test Chống trùng Lớp 1 (Hard Skip)</Text>
            <Text style={styles.scenarioSubtitle}>
              Bắn 2 thông báo giống hệt nhau trong 5 phút → Chặn ngầm 100%
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scenarioBtn}
          onPress={testSoftDuplicateScenario}
        >
          <View style={styles.scenarioIconBox}>
            <Ionicons name="warning" size={20} color="#F59E0B" />
          </View>
          <View style={styles.scenarioTexts}>
            <Text style={styles.scenarioTitle}>Test Nghi trùng Lớp 2 (Soft Warning)</Text>
            <Text style={styles.scenarioSubtitle}>
              Bắn 1 thông báo App Ngân hàng + 1 từ Gmail cùng 80K → Gắn nhãn Nghi trùng
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Common Bank Presets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mẫu thông báo ngân hàng phổ biến</Text>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.presetCard}
            onPress={() => runSimulation(p.packageName, p.title, p.text)}
          >
            <View style={styles.presetHeader}>
              <Text style={styles.presetName}>{p.name}</Text>
              <View style={[styles.presetTag, { backgroundColor: `${p.tagColor}20` }]}>
                <Text style={[styles.presetTagText, { color: p.tagColor }]}>{p.tag}</Text>
              </View>
            </View>
            <Text style={styles.presetBody} numberOfLines={2}>
              {p.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Simulation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tự nhập nội dung thông báo</Text>

        <Text style={styles.inputLabel}>Package Name:</Text>
        <TextInput
          style={styles.textInput}
          value={customPackage}
          onChangeText={setCustomPackage}
        />

        <Text style={styles.inputLabel}>Tiêu đề (Title):</Text>
        <TextInput
          style={styles.textInput}
          value={customTitle}
          onChangeText={setCustomTitle}
        />

        <Text style={styles.inputLabel}>Nội dung (Text):</Text>
        <TextInput
          style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
          multiline
          value={customText}
          onChangeText={setCustomText}
        />

        <TouchableOpacity
          style={styles.runCustomBtn}
          onPress={() => runSimulation(customPackage, customTitle, customText)}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
          <Text style={styles.runCustomBtnText}>Bắn thông báo tùy chỉnh</Text>
        </TouchableOpacity>
      </View>
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
  introBox: {
    flexDirection: 'row',
    backgroundColor: '#0284C720',
    borderWidth: 1,
    borderColor: '#0284C740',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  introText: {
    color: '#BAE6FD',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  scenarioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scenarioIconBox: {
    marginRight: 10,
  },
  scenarioTexts: {
    flex: 1,
  },
  scenarioTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  scenarioSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  presetCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  presetName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  presetTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  presetTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  presetBody: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  runCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
    marginTop: 14,
  },
  runCustomBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
});
