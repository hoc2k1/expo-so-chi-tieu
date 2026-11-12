import { PendingTransaction, Transaction, TransactionType } from '../models/types';

export interface DeduplicationCheckResult {
  isHardDuplicate: boolean;
  isSoftDuplicate: boolean;
  duplicateReason?: string;
  duplicateReferenceId?: string;
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

  // 1. Layer 1: Check Hard Duplicate (100% Skip)
  for (const existing of allRecentItems) {
    const timeDiff = Math.abs(now - existing.timestamp);
    if (timeDiff <= hardWindowMs) {
      // Check 1: Identical raw content
      if (
        newItem.rawContent &&
        existing.rawContent &&
        newItem.rawContent.trim().toLowerCase() === existing.rawContent.trim().toLowerCase()
      ) {
        return {
          isHardDuplicate: true,
          isSoftDuplicate: false,
          duplicateReason: `Trùng hoàn toàn nội dung thông báo với ${existing.source} trong 5 phút`,
          duplicateReferenceId: existing.id,
        };
      }

      // Check 2: Same amount, same type, and same Reference Code
      if (
        newItem.amount === existing.amount &&
        newItem.type === existing.type &&
        newItem.referenceCode &&
        existing.referenceCode &&
        newItem.referenceCode.toLowerCase() === existing.referenceCode.toLowerCase()
      ) {
        return {
          isHardDuplicate: true,
          isSoftDuplicate: false,
          duplicateReason: `Trùng Mã giao dịch (${newItem.referenceCode}) với ${existing.source}`,
          duplicateReferenceId: existing.id,
        };
      }

      // Check 3: Same amount, same type, and same Balance After
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

  // 2. Layer 2: Check Soft Duplicate (Warning badge in Pending Queue)
  for (const existing of allRecentItems) {
    const timeDiff = Math.abs(now - existing.timestamp);
    if (timeDiff <= softWindowMs) {
      if (newItem.amount === existing.amount && newItem.type === existing.type) {
        const timeStr = formatTimeHHMM(existing.timestamp);
        return {
          isHardDuplicate: false,
          isSoftDuplicate: true,
          duplicateReason: `Nghi trùng với ${existing.source} lúc ${timeStr} (${formatVND(newItem.amount)})`,
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
