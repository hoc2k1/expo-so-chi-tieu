import { PendingTransaction, Transaction, TransactionType } from '../models/types';

export interface DeduplicationCheckResult {
  isHardDuplicate: boolean;
  isSoftDuplicate: boolean;
  duplicateReason?: string;
  duplicateReferenceId?: string;
}

function normalizeBankSource(source: string): string {
  const s = (source || '').toLowerCase().trim();
  if (s.includes('vietcombank') || s.includes('vcb')) return 'vietcombank';
  if (s.includes('mb bank') || s.includes('mbbank') || s === 'mb') return 'mbbank';
  if (s.includes('techcombank') || s.includes('tcb')) return 'techcombank';
  if (s.includes('bidv')) return 'bidv';
  if (s.includes('vietinbank')) return 'vietinbank';
  if (s.includes('acb')) return 'acb';
  if (s.includes('tpbank')) return 'tpbank';
  if (s.includes('vpbank')) return 'vpbank';
  if (s.includes('sacombank')) return 'sacombank';
  if (s.includes('agribank')) return 'agribank';
  if (s.includes('msb')) return 'msb';
  if (s.includes('timo')) return 'timo';
  if (s.includes('viettel')) return 'viettel_money';
  if (s.includes('momo')) return 'momo';
  if (s.includes('zalopay')) return 'zalopay';
  if (s.includes('vnpay')) return 'vnpay';
  if (s.includes('shopeepay')) return 'shopeepay';
  return s;
}

function isSameBank(sourceA: string, sourceB: string): boolean {
  const normA = normalizeBankSource(sourceA);
  const normB = normalizeBankSource(sourceB);
  if (!normA || !normB) return false;
  return normA === normB;
}

export function checkDeduplication(
  newItem: {
    amount: number;
    type: TransactionType;
    rawContent: string;
    referenceCode?: string;
    balanceAfter?: number;
    timestamp: number;
    source: string;
  },
  pendingList: PendingTransaction[],
  completedList: Transaction[],
  hardWindowMinutes = 5,
  softWindowMinutes = 3
): DeduplicationCheckResult {
  const hardWindowMs = hardWindowMinutes * 60 * 1000;
  const softWindowMs = softWindowMinutes * 60 * 1000;
  const now = newItem.timestamp || Date.now();

  const allRecentItems: {
    id: string;
    amount: number;
    type: TransactionType;
    rawContent?: string;
    referenceCode?: string;
    balanceAfter?: number;
    timestamp: number;
    source: string;
  }[] = [
    ...pendingList.map((p) => ({
      id: p.id,
      amount: p.amount,
      type: p.type,
      rawContent: p.rawContent,
      referenceCode: p.referenceCode,
      balanceAfter: p.balanceAfter,
      timestamp: p.timestamp,
      source: p.source,
    })),
    ...completedList.map((c) => ({
      id: c.id,
      amount: c.amount,
      type: c.type,
      rawContent: c.rawContent,
      referenceCode: c.referenceCode,
      balanceAfter: c.balanceAfter,
      timestamp: c.timestamp,
      source: c.source,
    })),
  ];

  // 1. Layer 1: Check Hard Duplicate (Chặn ngầm 100% - Bỏ qua thông báo bị bắn 2 lần hoặc trùng mã GD/số dư)
  for (const existing of allRecentItems) {
    const timeDiff = Math.abs(now - existing.timestamp);
    if (timeDiff <= hardWindowMs) {
      // Check 1.1: Trùng 100% nội dung thông báo gốc
      if (
        newItem.rawContent &&
        existing.rawContent &&
        newItem.rawContent.trim().toLowerCase() === existing.rawContent.trim().toLowerCase()
      ) {
        return {
          isHardDuplicate: true,
          isSoftDuplicate: false,
          duplicateReason: `Trùng hoàn toàn nội dung thông báo với ${existing.source} trong ${hardWindowMinutes} phút`,
          duplicateReferenceId: existing.id,
        };
      }

      // Check 1.2: Trùng cả Số tiền + Loại Thu/Chi + Mã giao dịch
      if (
        newItem.amount === existing.amount &&
        newItem.type === existing.type &&
        newItem.referenceCode &&
        existing.referenceCode &&
        newItem.referenceCode.trim().toLowerCase() === existing.referenceCode.trim().toLowerCase()
      ) {
        return {
          isHardDuplicate: true,
          isSoftDuplicate: false,
          duplicateReason: `Trùng Mã giao dịch (${newItem.referenceCode}) với ${existing.source}`,
          duplicateReferenceId: existing.id,
        };
      }

      // Check 1.3: Trùng cả Số tiền + Loại Thu/Chi + Số dư cuối sau giao dịch
      if (
        newItem.amount === existing.amount &&
        newItem.type === existing.type &&
        newItem.balanceAfter !== undefined &&
        existing.balanceAfter !== undefined &&
        newItem.balanceAfter === existing.balanceAfter
      ) {
        return {
          isHardDuplicate: true,
          isSoftDuplicate: false,
          duplicateReason: `Trùng số dư sau giao dịch với ${existing.source}`,
          duplicateReferenceId: existing.id,
        };
      }
    }
  }

  // 2. Layer 2: Check Soft Duplicate (Cảnh báo nghi trùng trong Hàng chờ: Trùng cả Ngân hàng/Ví + Số tiền + Thu/Chi)
  for (const existing of allRecentItems) {
    const timeDiff = Math.abs(now - existing.timestamp);
    if (timeDiff <= softWindowMs) {
      if (
        newItem.amount === existing.amount &&
        newItem.type === existing.type &&
        isSameBank(newItem.source, existing.source)
      ) {
        const timeStr = formatTimeHHMM(existing.timestamp);
        return {
          isHardDuplicate: false,
          isSoftDuplicate: true,
          duplicateReason: `Nghi trùng giao dịch ${existing.source} lúc ${timeStr} (${formatVND(newItem.amount)})`,
          duplicateReferenceId: existing.id,
        };
      }
    }
  }

  return {
    isHardDuplicate: false,
    isSoftDuplicate: false,
  };
}

function formatTimeHHMM(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatVND(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
}