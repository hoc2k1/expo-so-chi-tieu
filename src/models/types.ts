export type TransactionType = 'income' | 'expense';

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
  name: string;
  shortName: string;
  icon: string;
  color: string;
  category: 'bank' | 'wallet' | 'email_sms';
}

export interface AppSettings {
  enabledPackages: string[];
  duplicateWindowMinutes: number; // default: 3
  hardDuplicateWindowMinutes: number; // default: 5
  autoCategorizeEnabled: boolean;
}

