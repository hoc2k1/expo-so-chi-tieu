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
  if (s.includes('vietinbank') || s.includes('ipay')) return 'vietinbank';
  if (s.includes('acb')) return 'acb';
  if (s.includes('tpbank')) return 'tpbank';
  if (s.includes('vpbank')) return 'vpbank';
  if (s.includes('sacombank')) return 'sacombank';
  if (s.includes('agribank')) return 'agribank';
  if (s.includes('msb')) return 'msb';
  if (s.includes('vib')) return 'vib';
  if (s.includes('hdbank')) return 'hdbank';
  if (s.includes('shb')) return 'shb';
  if (s.includes('ocb')) return 'ocb';
  if (s.includes('seabank')) return 'seabank';
  if (s.includes('lpbank') || s.includes('lienviet')) return 'lpbank';
  if (s.includes('timo')) return 'timo';
  if (s.includes('cake')) return 'cake';
  if (s.includes('tnex')) return 'tnex';
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

function isValidReferenceCode(ref?: string): boolean {
  if (!ref) return false;
  const trimmed = ref.trim();
  // Real bank reference codes have at least 4 characters and contain at least one digit
  return trimmed.length >= 4 && /\d/.test(trimmed);
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
  // Exact OS notification double-fire window (20 seconds)
  const exactRepostWindowMs = 20 * 1000;
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

  const newRefValid = isValidReferenceCode(newItem.referenceCode);

  // 1. Layer 1: Check Hard Duplicate (Chặn ngầm 100% chỉ khi chắc chắn 100% là cùng 1 sự kiện thông báo bị lặp)
  for (const existing of allRecentItems) {
    const timeDiff = Math.abs(now - existing.timestamp);
    if (timeDiff <= hardWindowMs) {
      // Check 1.1: Trùng 100% nội dung thông báo gốc trong vòng 20 giây (chặn hệ điều hành bắn đúp cùng 1 thông báo)
      // Nếu quá 20 giây mà nội dung có cả Số dư cuối hoặc Mã GD trùng nhau thì vẫn chặn ngầm;
      // ngược lại nếu thông báo ví ngắn gọn (không có số dư/mã GD) cách nhau > 20 giây thì đưa xuống Soft Duplicate để không mất giao dịch lặp thật.
      if (
        newItem.rawContent &&
        existing.rawContent &&
        newItem.rawContent.trim().toLowerCase() === existing.rawContent.trim().toLowerCase()
      ) {
        const hasUniqueIdentifierInText =
          newRefValid || (newItem.balanceAfter !== undefined && newItem.balanceAfter > 0);
        if (timeDiff <= exactRepostWindowMs || hasUniqueIdentifierInText) {
          return {
            isHardDuplicate: true,
            isSoftDuplicate: false,
            duplicateReason: `Trùng hoàn toàn nội dung thông báo với ${existing.source}`,
            duplicateReferenceId: existing.id,
          };
        }
      }

      // Check 1.2: Trùng cả Số tiền + Loại Thu/Chi + Mã giao dịch hợp lệ (VD: App ngân hàng + SMS/Email báo cùng 1 Mã GD)
      if (
        newItem.amount === existing.amount &&
        newItem.type === existing.type &&
        newRefValid &&
        isValidReferenceCode(existing.referenceCode) &&
        newItem.referenceCode!.trim().toLowerCase() === existing.referenceCode!.trim().toLowerCase()
      ) {
        return {
          isHardDuplicate: true,
          isSoftDuplicate: false,
          duplicateReason: `Trùng Mã giao dịch (${newItem.referenceCode}) với ${existing.source}`,
          duplicateReferenceId: existing.id,
        };
      }

      // Check 1.3: Trùng cả Ngân hàng + Số tiền + Loại Thu/Chi + Số dư cuối sau giao dịch trong vòng 30 giây
      // (VD: App Ngân hàng và SMS cùng báo 1 giao dịch với cùng số dư cuối)
      if (
        timeDiff <= 30 * 1000 &&
        newItem.amount === existing.amount &&
        newItem.type === existing.type &&
        isSameBank(newItem.source, existing.source) &&
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

  // 2. Layer 2: Check Soft Duplicate (Cảnh báo nghi trùng trong Hàng chờ: Trùng Ngân hàng/Ví + Số tiền + Thu/Chi)
  // Luôn đưa vào Hàng chờ để người dùng kiểm tra, tuyệt đối không tự ý xóa ngầm
  const effectiveSoftWindowMs = Math.max(softWindowMs, hardWindowMs);
  for (const existing of allRecentItems) {
    const timeDiff = Math.abs(now - existing.timestamp);
    if (timeDiff <= effectiveSoftWindowMs) {
      if (
        newItem.amount === existing.amount &&
        newItem.type === existing.type &&
        isSameBank(newItem.source, existing.source)
      ) {
        // Nếu cả 2 đều có Mã GD hợp lệ và Mã GD KHÁC NHAU + Số dư cuối KHÁC NHAU -> Đây là 2 giao dịch hoàn toàn độc lập!
        const bothHaveDistinctRef =
          newRefValid &&
          isValidReferenceCode(existing.referenceCode) &&
          newItem.referenceCode!.trim().toLowerCase() !== existing.referenceCode!.trim().toLowerCase();
        const bothHaveDistinctBalance =
          newItem.balanceAfter !== undefined &&
          existing.balanceAfter !== undefined &&
          newItem.balanceAfter !== existing.balanceAfter;

        if (bothHaveDistinctRef || bothHaveDistinctBalance) {
          continue;
        }

        if (timeDiff <= softWindowMs || newItem.rawContent === existing.rawContent) {
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
