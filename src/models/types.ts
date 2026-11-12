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

export interface TransactionFilterState {
  type: 'all' | 'expense' | 'income';
  categoryId: string; // 'all' or specific categoryId
  source: string; // 'all' or specific bank/wallet name
  timeRange: TimeRangePreset;
  customStartDate: string; // YYYY-MM-DD or YYYY-MM-DD HH:mm
  customEndDate: string;   // YYYY-MM-DD or YYYY-MM-DD HH:mm
  searchQuery?: string;
}
