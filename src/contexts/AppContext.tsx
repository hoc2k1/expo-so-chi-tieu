import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import {
  Transaction,
  PendingTransaction,
  Category,
  SavedNote,
  AutoRule,
  AppSettings,
  TransactionType,
  TransactionFilterState,
} from '../models/types';
import { StorageService } from '../services/storage';
import { parseNotification } from '../services/parser';
import { checkDeduplication } from '../services/deduplication';
import { matchRule } from '../services/ruleMatcher';
import { DEFAULT_SETTINGS, SUPPORTED_APPS } from '../constants/defaultData';
import { getDefaultMonthStartDisplay, getDefaultTodayEndDisplay } from '../utils/formatters';
import NotificationListener, { RawNotification } from '../../modules/notification-listener/src/NotificationListenerModule';
import { Toast, ToastData } from '../components/Toast';

export interface SyncNotificationsOptions {
  forceRescan?: boolean;
  showFeedbackToast?: boolean;
}

interface AppContextValue {
  isLoading: boolean;
  transactions: Transaction[];
  pendingTransactions: PendingTransaction[];
  categories: Category[];
  notes: SavedNote[];
  rules: AutoRule[];
  settings: AppSettings;
  isPermissionGranted: boolean;
  isBatteryOptimizationIgnored: boolean;

  // Shared Transaction Filter (used by Transactions screen & Statistics drill-down)
  transactionFilter: TransactionFilterState;
  setTransactionFilter: React.Dispatch<React.SetStateAction<TransactionFilterState>>;
  resetTransactionFilter: () => void;

  // Actions
  refreshAllData: () => Promise<void>;
  syncCachedNotifications: (options?: SyncNotificationsOptions) => Promise<void>;
  checkPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  requestIgnoreBatteryOptimization: () => Promise<boolean>;
  classifyTransaction: (
    pendingId: string,
    params: {
      categoryId: string;
      categoryName: string;
      note: string;
      amount?: number;
      type?: TransactionType;
      saveNewCategory?: boolean;
      saveNewNote?: boolean;
    }
  ) => Promise<void>;
  batchClassify: (
    pendingIds: string[],
    params: {
      categoryId: string;
      categoryName: string;
      note: string;
    }
  ) => Promise<void>;
  deletePending: (id: string) => Promise<void>;
  batchDeletePending: (ids: string[]) => Promise<void>;
  addManualTransaction: (params: {
    amount: number;
    type: TransactionType;
    categoryId: string;
    categoryName: string;
    note: string;
    source?: string;
    date?: string;
    timestamp?: number;
  }) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Toast
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;

  // Category & Note Management
  addCategory: (cat: Omit<Category, 'id'>) => Promise<Category>;
  updateCategory: (cat: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (type: TransactionType, orderedList: Category[]) => Promise<void>;
  addNote: (note: Omit<SavedNote, 'id'>) => Promise<SavedNote>;
  updateNote: (note: SavedNote) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  reorderNotes: (orderedList: SavedNote[]) => Promise<void>;
  addRule: (rule: Omit<AutoRule, 'id'>) => Promise<AutoRule>;
  updateRule: (rule: AutoRule) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;

  // Settings
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

const DEFAULT_FILTER: TransactionFilterState = {
  type: 'all',
  categoryIds: [],
  sources: [],
  categoryId: 'all',
  source: 'all',
  timeRange: 'month',
  customStartDate: getDefaultMonthStartDisplay(),
  customEndDate: getDefaultTodayEndDisplay(),
  searchQuery: '',
};

const AppContext = createContext<AppContextValue | null>(null);

function isPackageAllowed(packageName: string, enabledPackages: string[]): boolean {
  const pkgLower = (packageName || '').toLowerCase().trim();
  if (!pkgLower) return false;

  // Direct match
  if (enabledPackages.some((p) => p.toLowerCase().trim() === pkgLower)) {
    return true;
  }

  // Match via SUPPORTED_APPS aliases
  for (const app of SUPPORTED_APPS) {
    const allAppPkgs = [app.packageName, ...(app.aliases || [])].map((x) => x.toLowerCase().trim());
    if (allAppPkgs.includes(pkgLower)) {
      const isAppEnabled = enabledPackages.some((ep) => allAppPkgs.includes(ep.toLowerCase().trim()));
      if (isAppEnabled) return true;
    }
  }

  return false;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [rules, setRules] = useState<AutoRule[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isBatteryOptimizationIgnored, setIsBatteryOptimizationIgnored] = useState(true);
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilterState>(DEFAULT_FILTER);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Refs to access latest state inside event listeners without re-subscribing
  const pendingRef = useRef(pendingTransactions);
  const txsRef = useRef(transactions);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const rulesRef = useRef(rules);
  const isInitializedRef = useRef(false);
  const isSyncingRef = useRef(false);
  const hasPendingSyncRef = useRef(false);
  const processedRawIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    pendingRef.current = pendingTransactions;
    txsRef.current = transactions;
    settingsRef.current = settings;
    rulesRef.current = rules;

    // Update native app icon badge count for pending transactions
    if (Platform.OS === 'android') {
      NotificationListener.setBadgeCount(pendingTransactions.length);
    }
  }, [pendingTransactions, transactions, settings, rules]);

  const resetTransactionFilter = useCallback(() => {
    setTransactionFilter({
      ...DEFAULT_FILTER,
      customStartDate: getDefaultMonthStartDisplay(),
      customEndDate: getDefaultTodayEndDisplay(),
    });
  }, []);

  // Load initial data
  const refreshAllData = useCallback(async () => {
    try {
      await StorageService.initStorage();
      const [txs, pending, cats, savedNotes, autoRules, appSettings] = await Promise.all([
        StorageService.getTransactions(),
        StorageService.getPendingTransactions(),
        StorageService.getCategories(),
        StorageService.getNotes(),
        StorageService.getRules(),
        StorageService.getSettings(),
      ]);
      pendingRef.current = pending;
      txsRef.current = txs;
      settingsRef.current = appSettings;
      rulesRef.current = autoRules;

      if (Platform.OS === 'android') {
        NotificationListener.setEnabledPackages(appSettings.enabledPackages);
      }

      setTransactions(txs);
      setPendingTransactions(pending);
      setCategories(cats);
      setNotes(savedNotes);
      setRules(autoRules);
      setSettings(appSettings);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return false;
    try {
      const granted = NotificationListener.isPermissionGranted();
      setIsPermissionGranted(granted);
      setIsBatteryOptimizationIgnored(NotificationListener.isBatteryOptimizationIgnored());
      if (granted) {
        NotificationListener.ensureServiceConnected();
      }
      return granted;
    } catch {
      return false;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return false;
    try {
      return NotificationListener.requestPermission();
    } catch {
      return false;
    }
  }, []);

  const requestIgnoreBatteryOptimization = useCallback(async () => {
    if (Platform.OS !== 'android') return false;
    try {
      return NotificationListener.requestIgnoreBatteryOptimization();
    } catch {
      return false;
    }
  }, []);

  // Process a single raw notification into currentPending
  const processSingleRawNotification = useCallback(
    (
      raw: RawNotification,
      currentPending: PendingTransaction[],
      currentCompleted: Transaction[],
      currentSettings: AppSettings,
      currentRules: AutoRule[]
    ): { item?: PendingTransaction; status: string } => {
      if (!raw || raw.id === 'service_connected_sync') {
        return { status: 'ignored_wakeup' };
      }

      if (raw.id && processedRawIdsRef.current.has(raw.id)) {
        return { status: 'already_processed' };
      }

      // 1. Check if package is enabled in Settings
      if (!isPackageAllowed(raw.packageName, currentSettings.enabledPackages)) {
        return { status: 'ignored_not_enabled' };
      }

      // 2. Parse text, title, subText & amount
      const parsed = parseNotification(
        raw.packageName,
        raw.title || '',
        raw.text || '',
        raw.subText || ''
      );
      if (!parsed.isValidTransaction) {
        if (raw.id) processedRawIdsRef.current.add(raw.id);
        return { status: 'ignored_invalid_or_otp' };
      }

      if (raw.id) {
        processedRawIdsRef.current.add(raw.id);
      }

      // 3. Check Deduplication
      const dedupResult = checkDeduplication(
        {
          amount: parsed.amount,
          type: parsed.type,
          rawContent: parsed.rawContent,
          referenceCode: parsed.referenceCode,
          balanceAfter: parsed.balanceAfter,
          timestamp: Number(raw.timestamp) || Date.now(),
          source: parsed.source,
        },
        currentPending,
        currentCompleted,
        currentSettings.hardDuplicateWindowMinutes || 5,
        currentSettings.duplicateWindowMinutes || 3
      );

      if (dedupResult.isHardDuplicate) {
        return { status: 'hard_duplicate' };
      }

      // 4. Auto-Rule Suggestion
      let suggestedCategoryId: string | undefined;
      let suggestedCategoryName: string | undefined;
      let suggestedNote: string | undefined;

      if (currentSettings.autoCategorizeEnabled) {
        const ruleMatch = matchRule(parsed.rawContent, currentRules);
        if (ruleMatch) {
          suggestedCategoryId = ruleMatch.suggestedCategoryId;
          suggestedCategoryName = ruleMatch.suggestedCategoryName;
          suggestedNote = ruleMatch.suggestedNote;
        }
      }

      const newPending: PendingTransaction = {
        id: `pending_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        amount: parsed.amount,
        type: parsed.type,
        source: parsed.source,
        packageName: raw.packageName,
        rawContent: parsed.rawContent,
        referenceCode: parsed.referenceCode,
        balanceAfter: parsed.balanceAfter,
        timestamp: Number(raw.timestamp) || Date.now(),
        suggestedCategoryId,
        suggestedCategoryName,
        suggestedNote,
        isSuspectedDuplicate: dedupResult.isSoftDuplicate,
        duplicateReason: dedupResult.duplicateReason,
        duplicateReferenceId: dedupResult.duplicateReferenceId,
      };

      return {
        status: dedupResult.isSoftDuplicate ? 'soft_duplicate_added' : 'added',
        item: newPending,
      };
    },
    []
  );

  // Pull & process all cached notifications from Android native SharedPreferences & status bar
  const syncCachedNotifications = useCallback(
    async (options?: SyncNotificationsOptions) => {
      if (Platform.OS !== 'android') return;
      // Never sync or clear native cache before storage initialization has finished loading settings & transactions
      if (!isInitializedRef.current) {
        hasPendingSyncRef.current = true;
        return;
      }

      if (isSyncingRef.current) {
        hasPendingSyncRef.current = true;
        return;
      }
      isSyncingRef.current = true;

      try {
        do {
          hasPendingSyncRef.current = false;

          const granted = NotificationListener.isPermissionGranted();
          setIsPermissionGranted(granted);
          setIsBatteryOptimizationIgnored(NotificationListener.isBatteryOptimizationIgnored());
          if (!granted) {
            if (options?.showFeedbackToast) {
              showToast('Chưa cấp quyền đọc thông báo!', 'error');
            }
            return;
          }

          if (options?.forceRescan) {
            processedRawIdsRef.current.clear();
            NotificationListener.forceScanStatusBar();
          }

          const cached = NotificationListener.getCachedNotifications();
          if (!cached || cached.length === 0) {
            if (options?.showFeedbackToast) {
              showToast('Đã đồng bộ: Không có thông báo giao dịch mới', 'info');
            }
            break;
          }

          // Sort oldest to newest so deduplication checks in chronological order
          const sorted = [...cached].sort(
            (a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)
          );

          let curPending = [...pendingRef.current];
          const curCompleted = txsRef.current;
          const curSettings = settingsRef.current;
          const curRules = rulesRef.current;
          let addedCount = 0;
          const processedIdsToRemove: string[] = [];

          for (const rawItem of sorted) {
            const res = processSingleRawNotification(
              rawItem,
              curPending,
              curCompleted,
              curSettings,
              curRules
            );
            if (rawItem.id) {
              processedIdsToRemove.push(rawItem.id);
            }
            if (res.item) {
              curPending = [res.item, ...curPending];
              addedCount++;
            }
          }

          if (addedCount > 0) {
            pendingRef.current = curPending;
            setPendingTransactions(curPending);
            await StorageService.savePendingTransactions(curPending);
          }

          // Atomically remove only the IDs that were just processed so newly arriving notifications are never wiped
          if (processedIdsToRemove.length > 0) {
            NotificationListener.removeCachedNotificationsByIds(processedIdsToRemove);
          }

          if (options?.showFeedbackToast) {
            if (addedCount > 0) {
              showToast(`Đã đồng bộ thêm ${addedCount} giao dịch mới!`, 'success');
            } else {
              showToast('Đã quét thông báo: Chưa có giao dịch mới', 'info');
            }
          }
        } while (hasPendingSyncRef.current);
      } catch (e) {
        console.error('Error syncing cached notifications:', e);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [processSingleRawNotification, showToast]
  );

  // Initial load + AppState listener + Periodic sync
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        await StorageService.initStorage();
        const [txs, pending, cats, savedNotes, autoRules, appSettings] = await Promise.all([
          StorageService.getTransactions(),
          StorageService.getPendingTransactions(),
          StorageService.getCategories(),
          StorageService.getNotes(),
          StorageService.getRules(),
          StorageService.getSettings(),
        ]);

        // Record current EAS Update in history if running an OTA update not yet logged
        if (Updates.updateId) {
          const history = appSettings.updateHistory || [];
          const exists = history.some((h) => h.updateId === Updates.updateId);
          if (!exists) {
            const newEntry = {
              id: `upd_${Date.now()}`,
              updateId: Updates.updateId,
              channel: Updates.channel || 'preview',
              runtimeVersion: Updates.runtimeVersion || '1.0.0',
              appliedAt: Updates.createdAt
                ? Updates.createdAt.toISOString()
                : new Date().toISOString(),
              note: 'Bản cập nhật OTA (EAS Update)',
            };
            appSettings.updateHistory = [newEntry, ...history].slice(0, 20);
            await StorageService.saveSettings(appSettings);
          }
        }

        pendingRef.current = pending;
        txsRef.current = txs;
        settingsRef.current = appSettings;
        rulesRef.current = autoRules;

        if (Platform.OS === 'android') {
          NotificationListener.setEnabledPackages(appSettings.enabledPackages);
        }

        isInitializedRef.current = true;

        if (isMounted) {
          setTransactions(txs);
          setPendingTransactions(pending);
          setCategories(cats);
          setNotes(savedNotes);
          setRules(autoRules);
          setSettings(appSettings);
          setIsLoading(false);
        }

        if (Platform.OS === 'android') {
          hasPendingSyncRef.current = false;
          await syncCachedNotifications();
        }
      } catch (e) {
        console.error('Initialization error:', e);
        isInitializedRef.current = true;
        if (isMounted) setIsLoading(false);
      }
    }

    initialize();

    if (Platform.OS === 'android') {
      // 1. Live event listener when notification arrives while JS is active
      const notifSubscription = NotificationListener.addListener(
        'onNotificationReceived',
        () => {
          syncCachedNotifications();
        }
      );

      // 2. AppState listener: whenever user reopens app from background/recents, sync immediately
      const appStateSubscription = AppState.addEventListener(
        'change',
        (nextState: AppStateStatus) => {
          if (nextState === 'active') {
            NotificationListener.ensureServiceConnected();
            syncCachedNotifications();
          }
        }
      );

      // 3. Periodic check while app is open
      const intervalId = setInterval(() => {
        if (AppState.currentState === 'active') {
          syncCachedNotifications();
        }
      }, 4000);

      return () => {
        isMounted = false;
        notifSubscription.remove();
        appStateSubscription.remove();
        clearInterval(intervalId);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [syncCachedNotifications]);

  // Classify single transaction
  const classifyTransaction = async (
    pendingId: string,
    params: {
      categoryId: string;
      categoryName: string;
      note: string;
      amount?: number;
      type?: TransactionType;
      saveNewCategory?: boolean;
      saveNewNote?: boolean;
    }
  ) => {
    const currentPendingList = pendingRef.current;
    const pendingItem = currentPendingList.find((p) => p.id === pendingId);
    if (!pendingItem) return;

    let finalCatId = params.categoryId;
    let finalCatName = params.categoryName;

    // Save new category if requested
    if (params.saveNewCategory && params.categoryName.trim()) {
      const existing = categories.find(
        (c) => c.name.toLowerCase() === params.categoryName.trim().toLowerCase()
      );
      if (!existing) {
        const newCat: Category = {
          id: `cat_${Date.now()}`,
          name: params.categoryName.trim(),
          type: params.type || pendingItem.type,
          icon: 'pricetag',
          color: '#3B82F6',
        };
        const updatedCats = [...categories, newCat];
        setCategories(updatedCats);
        await StorageService.saveCategories(updatedCats);
        finalCatId = newCat.id;
        finalCatName = newCat.name;
      }
    }

    // Save new note if requested
    if (params.saveNewNote && params.note.trim()) {
      const existing = notes.find(
        (n) => n.text.toLowerCase() === params.note.trim().toLowerCase()
      );
      if (!existing) {
        const newNote: SavedNote = {
          id: `note_${Date.now()}`,
          text: params.note.trim(),
          categoryId: finalCatId,
        };
        const updatedNotes = [...notes, newNote];
        setNotes(updatedNotes);
        await StorageService.saveNotes(updatedNotes);
      }
    }

    const d = new Date(pendingItem.timestamp);
    const dateStr = d.toISOString().split('T')[0];

    const completedTx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      amount: params.amount !== undefined ? params.amount : pendingItem.amount,
      type: params.type || pendingItem.type,
      categoryId: finalCatId,
      categoryName: finalCatName,
      note: params.note.trim() || 'Không có ghi chú',
      source: pendingItem.source,
      rawContent: pendingItem.rawContent,
      referenceCode: pendingItem.referenceCode,
      balanceAfter: pendingItem.balanceAfter,
      timestamp: pendingItem.timestamp,
      date: dateStr,
      createdAt: new Date().toISOString(),
    };

    const updatedCompleted = [completedTx, ...txsRef.current];
    const updatedPending = pendingRef.current.filter((p) => p.id !== pendingId);

    txsRef.current = updatedCompleted;
    pendingRef.current = updatedPending;
    setTransactions(updatedCompleted);
    setPendingTransactions(updatedPending);

    await StorageService.saveTransactions(updatedCompleted);
    await StorageService.savePendingTransactions(updatedPending);
  };

  // Batch classify
  const batchClassify = async (
    pendingIds: string[],
    params: {
      categoryId: string;
      categoryName: string;
      note: string;
    }
  ) => {
    const itemsToClassify = pendingRef.current.filter((p) => pendingIds.includes(p.id));
    if (itemsToClassify.length === 0) return;

    const newTransactions: Transaction[] = itemsToClassify.map((item) => {
      const d = new Date(item.timestamp);
      return {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        amount: item.amount,
        type: item.type,
        categoryId: params.categoryId,
        categoryName: params.categoryName,
        note: params.note.trim() || 'Phân loại hàng loạt',
        source: item.source,
        rawContent: item.rawContent,
        referenceCode: item.referenceCode,
        balanceAfter: item.balanceAfter,
        timestamp: item.timestamp,
        date: d.toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };
    });

    const updatedCompleted = [...newTransactions, ...txsRef.current];
    const updatedPending = pendingRef.current.filter((p) => !pendingIds.includes(p.id));

    txsRef.current = updatedCompleted;
    pendingRef.current = updatedPending;
    setTransactions(updatedCompleted);
    setPendingTransactions(updatedPending);

    await StorageService.saveTransactions(updatedCompleted);
    await StorageService.savePendingTransactions(updatedPending);
  };

  // Delete single pending
  const deletePending = async (id: string) => {
    const updated = pendingRef.current.filter((p) => p.id !== id);
    pendingRef.current = updated;
    setPendingTransactions(updated);
    await StorageService.savePendingTransactions(updated);
  };

  // Batch delete pending
  const batchDeletePending = async (ids: string[]) => {
    const updated = pendingRef.current.filter((p) => !ids.includes(p.id));
    pendingRef.current = updated;
    setPendingTransactions(updated);
    await StorageService.savePendingTransactions(updated);
  };

  // Manual transaction
  const addManualTransaction = async (params: {
    amount: number;
    type: TransactionType;
    categoryId: string;
    categoryName: string;
    note: string;
    source?: string;
    date?: string;
    timestamp?: number;
  }) => {
    const timestamp =
      params.timestamp || (params.date ? new Date(params.date).getTime() : Date.now());
    const dateStr =
      params.date ? params.date.split('T')[0] : new Date(timestamp).toISOString().split('T')[0];

    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      amount: params.amount,
      type: params.type,
      categoryId: params.categoryId,
      categoryName: params.categoryName,
      note: params.note.trim() || params.categoryName,
      source: params.source || 'Tiền mặt',
      timestamp,
      date: dateStr,
      createdAt: new Date().toISOString(),
    };

    const updated = [tx, ...txsRef.current];
    txsRef.current = updated;
    setTransactions(updated);
    await StorageService.saveTransactions(updated);
  };

  // Update existing transaction
  const updateTransaction = async (tx: Transaction) => {
    const updated = txsRef.current.map((t) => (t.id === tx.id ? tx : t));
    txsRef.current = updated;
    setTransactions(updated);
    await StorageService.saveTransactions(updated);
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    const updated = txsRef.current.filter((t) => t.id !== id);
    txsRef.current = updated;
    setTransactions(updated);
    await StorageService.saveTransactions(updated);
  };

  // Categories CRUD
  const addCategory = async (cat: Omit<Category, 'id'>) => {
    const newCat: Category = { ...cat, id: `cat_${Date.now()}` };
    const updated = [...categories, newCat];
    setCategories(updated);
    await StorageService.saveCategories(updated);
    return newCat;
  };

  const updateCategory = async (cat: Category) => {
    const updated = categories.map((c) => (c.id === cat.id ? cat : c));
    setCategories(updated);
    await StorageService.saveCategories(updated);
  };

  const deleteCategory = async (id: string) => {
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    await StorageService.saveCategories(updated);
  };

  const reorderCategories = async (type: TransactionType, orderedList: Category[]) => {
    const others = categories.filter((c) => c.type !== type);
    const updated =
      type === 'expense' ? [...orderedList, ...others] : [...others, ...orderedList];
    setCategories(updated);
    await StorageService.saveCategories(updated);
  };

  // Notes CRUD
  const addNote = async (note: Omit<SavedNote, 'id'>) => {
    const newNote: SavedNote = { ...note, id: `note_${Date.now()}` };
    const updated = [...notes, newNote];
    setNotes(updated);
    await StorageService.saveNotes(updated);
    return newNote;
  };

  const updateNote = async (note: SavedNote) => {
    const updated = notes.map((n) => (n.id === note.id ? note : n));
    setNotes(updated);
    await StorageService.saveNotes(updated);
  };

  const deleteNote = async (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    await StorageService.saveNotes(updated);
  };

  const reorderNotes = async (orderedList: SavedNote[]) => {
    setNotes(orderedList);
    await StorageService.saveNotes(orderedList);
  };

  // Rules CRUD
  const addRule = async (rule: Omit<AutoRule, 'id'>) => {
    const newRule: AutoRule = { ...rule, id: `rule_${Date.now()}` };
    const updated = [...rulesRef.current, newRule];
    rulesRef.current = updated;
    setRules(updated);
    await StorageService.saveRules(updated);
    return newRule;
  };

  const updateRule = async (rule: AutoRule) => {
    const updated = rulesRef.current.map((r) => (r.id === rule.id ? rule : r));
    rulesRef.current = updated;
    setRules(updated);
    await StorageService.saveRules(updated);
  };

  const deleteRule = async (id: string) => {
    const updated = rulesRef.current.filter((r) => r.id !== id);
    rulesRef.current = updated;
    setRules(updated);
    await StorageService.saveRules(updated);
  };

  // Settings
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const merged = { ...settingsRef.current, ...newSettings };
    settingsRef.current = merged;
    setSettings(merged);
    await StorageService.saveSettings(merged);

    if (Platform.OS === 'android' && newSettings.enabledPackages) {
      NotificationListener.setEnabledPackages(merged.enabledPackages);
      await syncCachedNotifications({ forceRescan: true });
    }
  };

  return (
    <AppContext.Provider
      value={{
        isLoading,
        transactions,
        pendingTransactions,
        categories,
        notes,
        rules,
        settings,
        isPermissionGranted,
        isBatteryOptimizationIgnored,
        transactionFilter,
        setTransactionFilter,
        resetTransactionFilter,
        refreshAllData,
        syncCachedNotifications,
        checkPermission,
        requestPermission,
        requestIgnoreBatteryOptimization,
        classifyTransaction,
        batchClassify,
        deletePending,
        batchDeletePending,
        addManualTransaction,
        updateTransaction,
        deleteTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        addNote,
        updateNote,
        deleteNote,
        reorderNotes,
        addRule,
        updateRule,
        deleteRule,
        updateSettings,
        showToast,
      }}
    >
      {children}
      <Toast toast={toast} onHide={hideToast} />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
