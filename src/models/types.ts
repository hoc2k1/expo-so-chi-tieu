export type TransactionType = 'income' | 'expense';

export type TimeRangePreset = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface SavedNote {
  id: string;
  text: string;
  categoryId?: string; // If undefined or empty, it's shared across all categories
}

export interface AutoRule {
  id: string;
  keyword: string; // e.g. "GRAB", "SHOPEE", "HIGHLANDS", "TIEN DIEN"
  categoryId: string;
  categoryName: string;
  note: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  note: string;
  source: string; // e.g. "Vietcombank", "MB Bank", "MoMo", "Tiền mặt"
  rawContent?: string;
  referenceCode?: string;
  balanceAfter?: number;
  timestamp: number;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO
}

export interface PendingTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  source: string;
  packageName: string;
  rawContent: string;
  referenceCode?: string;
  balanceAfter?: number;
  timestamp: number;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  suggestedNote?: string;
  isSuspectedDuplicate?: boolean;
  duplicateReason?: string;
  duplicateReferenceId?: string;
}

export interface SupportedApp {
  packageName: string;
  aliases?: string[];
  name: string;
  shortName: string;
  icon: string;
  color: string;
  category: 'bank' | 'wallet' | 'email_sms';
}

export interface UpdateHistoryItem {
  id: string;
  updateId: string;
  channel: string;
  runtimeVersion: string;
  appliedAt: string;
  note?: string;
}

export interface AppSettings {
  enabledPackages: string[];
  duplicateWindowMinutes: number; // default: 3
  hardDuplicateWindowMinutes: number; // default: 5
  autoCategorizeEnabled: boolean;
  updateHistory?: UpdateHistoryItem[];
}

export interface NotificationDebugLog {
  id: string;
  timestamp: number;
  packageName: string;
  source?: string;
  status:
    | 'added'
    | 'soft_duplicate_added'
    | 'hard_duplicate'
    | 'ignored_not_enabled'
    | 'ignored_invalid_or_otp'
    | 'already_processed'
    | 'native_filtered'
    | 'captured';
  reason: string;
  preview: string;
  amount?: number;
}

export interface TransactionFilterState {
  type: 'all' | 'expense' | 'income';
  categoryIds: string[]; // empty array = tất cả
  sources: string[];     // empty array = tất cả
  categoryId?: string;   // tương thích ngược
  source?: string;       // tương thích ngược
  timeRange: TimeRangePreset;
  customStartDate: string; // YYYY-MM-DD or DD/MM/YYYY
  customEndDate: string;   // YYYY-MM-DD or DD/MM/YYYY
  searchQuery?: string;
}
