import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Transaction } from '../models/types';

export async function exportTransactionsToCsv(transactions: Transaction[]): Promise<boolean> {
  if (transactions.length === 0) {
    throw new Error('Không có giao dịch nào để xuất file.');
  }

  // Header row
  const headers = [
    'Mã GD',
    'Ngày',
    'Giờ',
    'Loại',
    'Số tiền (VND)',
    'Phân loại',
    'Ghi chú',
    'Nguồn / Ngân hàng',
    'Mã GD Ngân hàng',
    'Nội dung thông báo gốc',
  ];

  const escapeCsv = (str: string | undefined): string => {
    if (!str) return '""';
    const replaced = str.replace(/"/g, '""');
    return `"${replaced}"`;
  };

  const rows: string[] = [headers.join(',')];

  for (const tx of transactions) {
    const d = new Date(tx.timestamp);
    const dateStr = tx.date || d.toISOString().split('T')[0];
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    const typeStr = tx.type === 'income' ? 'Thu' : 'Chi';

    const row = [
      escapeCsv(tx.id),
      escapeCsv(dateStr),
      escapeCsv(timeStr),
      escapeCsv(typeStr),
      tx.amount.toString(),
      escapeCsv(tx.categoryName),
      escapeCsv(tx.note),
      escapeCsv(tx.source),
      escapeCsv(tx.referenceCode || ''),
      escapeCsv(tx.rawContent || ''),
    ];
    rows.push(row.join(','));
  }

  // Add UTF-8 BOM so Excel opens Vietnamese characters perfectly
  const csvContent = '\uFEFF' + rows.join('\r\n');

  if (Platform.OS === 'web') {
    // Web download trigger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `so_chi_tieu_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }

  const filename = `so_chi_tieu_${Date.now()}.csv`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Xuất file dữ liệu chi tiêu',
      UTI: 'public.comma-separated-values-text',
    });
    return true;
  } else {
    throw new Error('Tính năng chia sẻ không khả dụng trên thiết bị này.');
  }
}
