import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import {
  Transaction,
  PendingTransaction,
  Category,
  SavedNote,
  AutoRule,
  AppSettings,
  TransactionType,
} from '../models/types';
import { StorageService } from '../services/storage';
import { parseNotification } from '../services/parser';
import { checkDeduplication } from '../services/deduplication';
import { matchRule } from '../services/ruleMatcher';
import NotificationListener, { RawNotification } from '../../modules/notification-listener/src/NotificationListenerModule';

interface AppContextValue {
  isLoading: boolean;
  transactions: Transaction[];
  pendingTransactions: PendingTransaction[];
  categories: Category[];
  notes: SavedNote[];
  rules: AutoRule[];
  settings: AppSettings;
  isPermissionGranted: boolean;

  // Actions
  refreshAllData: () => Promise<void>;
  checkPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
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
  }) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Category & Note Management
  addCategory: (cat: Omit<Category, 'id'>) => Promise<Category>;
  updateCategory: (cat: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addNote: (note: Omit<SavedNote, 'id'>) => Promise<SavedNote>;
  updateNote: (note: SavedNote) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  addRule: (rule: Omit<AutoRule, 'id'>) => Promise<AutoRule>;
  updateRule: (rule: AutoRule) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;

  // Settings
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;

  // Simulation
  simulateNotification: (packageName: string, title: string, text: string) => Promise<{
    status: 'added' | 'ignored_otp' | 'ignored_not_enabled' | 'hard_duplicate' | 'soft_duplicate_added';
    message: string;
    item?: PendingTransaction;
  }>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [rules, setRules] = useState<AutoRule[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    enabledPackages: [],
    duplicateWindowMinutes: 3,
    hardDuplicateWindowMinutes: 5,
    autoCategorizeEnabled: true,
  });
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  // Refs to access latest state inside event listeners without re-subscribing
  const pendingRef = useRef(pendingTransactions);
  const txsRef = useRef(transactions);
  const settingsRef = useRef(settings);
  const rulesRef = useRef(rules);

  useEffect(() => {
    pendingRef.current = pendingTransactions;
    txsRef.current = transactions;
    settingsRef.current = settings;
    rulesRef.current = rules;
  }, [pendingTransactions, transactions, settings, rules]);

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

  // Process a raw notification
  const handleIncomingNotification = useCallback(
    async (
      raw: RawNotification,
      currentPending: PendingTransaction[],
      currentCompleted: Transaction[],
      currentSettings: AppSettings,
      currentRules: AutoRule[]
    ) => {
      // 1. Check if package is enabled in Settings
      const isEnabled = currentSettings.enabledPackages.some(
        (pkg) => pkg.toLowerCase() === raw.packageName.toLowerCase()
      );
      if (!isEnabled) {
        return { status: 'ignored_not_enabled', message: 'Ứng dụng chưa được bật trong Cài đặt' };
      }

      // 2. Parse text & amount
      const parsed = parseNotification(raw.packageName, raw.title, raw.text);
      if (!parsed.isValidTransaction) {
        return { status: 'ignored_otp', message: parsed.ignoreReason || 'Không phải giao dịch hợp lệ' };
      }

      // 3. Check 2-Layer Deduplication
      const dedupResult = checkDeduplication(
        {
          amount: parsed.amount,
          type: parsed.type,
          rawContent: parsed.rawContent,
          referenceCode: parsed.referenceCode,
          balanceAfter: parsed.balanceAfter,
          timestamp: raw.timestamp || Date.now(),
          source: parsed.source,
        },
        currentPending,
        currentCompleted,
        currentSettings.hardDuplicateWindowMinutes || 5,
        currentSettings.duplicateWindowMinutes || 3
      );

      // Layer 1: Hard Duplicate -> Skip 100%
      if (dedupResult.isHardDuplicate) {
        return {
          status: 'hard_duplicate',
          message: dedupResult.duplicateReason || 'Trùng lặp hoàn toàn với giao dịch trước',
        };
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

      // 5. Create Pending Transaction Item
      const newPending: PendingTransaction = {
        id: `pending_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        amount: parsed.amount,
        type: parsed.type,
        source: parsed.source,
        packageName: raw.packageName,
        rawContent: parsed.rawContent,
        referenceCode: parsed.referenceCode,
        balanceAfter: parsed.balanceAfter,
        timestamp: raw.timestamp || Date.now(),
        suggestedCategoryId,
        suggestedCategoryName,
        suggestedNote,
        isSuspectedDuplicate: dedupResult.isSoftDuplicate,
        duplicateReason: dedupResult.duplicateReason,
        duplicateReferenceId: dedupResult.duplicateReferenceId,
      };

      const updatedPending = [newPending, ...currentPending];
      setPendingTransactions(updatedPending);
      await StorageService.savePendingTransactions(updatedPending);

      return {
        status: dedupResult.isSoftDuplicate ? 'soft_duplicate_added' : 'added',
        message: dedupResult.isSoftDuplicate ? 'Đã thêm (Cảnh báo nghi trùng)' : 'Đã thêm vào Hàng chờ',
        item: newPending,
      };
    },
    []
  );

  // Initial load
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
          const granted = NotificationListener.isPermissionGranted();
          if (isMounted) setIsPermissionGranted(granted);

          // Process cached notifications
          const cached = NotificationListener.getCachedNotifications();
          if (cached && cached.length > 0) {
            let curPending = [...pending];
            for (const item of cached) {
              const res = await handleIncomingNotification(item, curPending, txs, appSettings, autoRules);
              if (res.item) {
                curPending = [res.item, ...curPending];
              }
            }
            NotificationListener.clearCachedNotifications();
          }
        }
      } catch (e) {
        console.error('Initialization error:', e);
        if (isMounted) setIsLoading(false);
      }
    }

    initialize();

    if (Platform.OS === 'android') {
      const subscription = NotificationListener.addListener('onNotificationReceived', (event: RawNotification) => {
        handleIncomingNotification(
          event,
          pendingRef.current,
          txsRef.current,
          settingsRef.current,
          rulesRef.current
        );
      });

      return () => {
        isMounted = false;
        subscription.remove();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [handleIncomingNotification]);

  // Simulate notification (for testing)
  const simulateNotification = async (packageName: string, title: string, text: string) => {
    const raw: RawNotification = {
      id: `sim_${Date.now()}`,
      packageName,
      title,
      text,
      timestamp: Date.now(),
    };
    const res = await handleIncomingNotification(
      raw,
      pendingTransactions,
      transactions,
      settings,
      rules
    );
    return res as any;
  };

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
    const pendingItem = pendingTransactions.find((p) => p.id === pendingId);
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

    const updatedCompleted = [completedTx, ...transactions];
    const updatedPending = pendingTransactions.filter((p) => p.id !== pendingId);

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
    const itemsToClassify = pendingTransactions.filter((p) => pendingIds.includes(p.id));
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

    const updatedCompleted = [...newTransactions, ...transactions];
    const updatedPending = pendingTransactions.filter((p) => !pendingIds.includes(p.id));

    setTransactions(updatedCompleted);
    setPendingTransactions(updatedPending);

    await StorageService.saveTransactions(updatedCompleted);
    await StorageService.savePendingTransactions(updatedPending);
  };

  // Delete single pending
  const deletePending = async (id: string) => {
    const updated = pendingTransactions.filter((p) => p.id !== id);
    setPendingTransactions(updated);
    await StorageService.savePendingTransactions(updated);
  };

  // Batch delete pending
  const batchDeletePending = async (ids: string[]) => {
    const updated = pendingTransactions.filter((p) => !ids.includes(p.id));
    setPendingTransactions(updated);
    await StorageService.savePendingTransactions(updated);
  };

  // Manual cash transaction
  const addManualTransaction = async (params: {
    amount: number;
    type: TransactionType;
    categoryId: string;
    categoryName: string;
    note: string;
    source?: string;
    date?: string;
  }) => {
    const dateStr = params.date || new Date().toISOString().split('T')[0];
    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      amount: params.amount,
      type: params.type,
      categoryId: params.categoryId,
      categoryName: params.categoryName,
      note: params.note.trim() || 'Tiền mặt',
      source: params.source || 'Tiền mặt',
      timestamp: Date.now(),
      date: dateStr,
      createdAt: new Date().toISOString(),
    };

    const updated = [tx, ...transactions];
    setTransactions(updated);
    await StorageService.saveTransactions(updated);
  };

  // Update existing transaction
  const updateTransaction = async (tx: Transaction) => {
    const updated = transactions.map((t) => (t.id === tx.id ? tx : t));
    setTransactions(updated);
    await StorageService.saveTransactions(updated);
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
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

  // Rules CRUD
  const addRule = async (rule: Omit<AutoRule, 'id'>) => {
    const newRule: AutoRule = { ...rule, id: `rule_${Date.now()}` };
    const updated = [...rules, newRule];
    setRules(updated);
    await StorageService.saveRules(updated);
    return newRule;
  };

  const updateRule = async (rule: AutoRule) => {
    const updated = rules.map((r) => (r.id === rule.id ? rule : r));
    setRules(updated);
    await StorageService.saveRules(updated);
  };

  const deleteRule = async (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    setRules(updated);
    await StorageService.saveRules(updated);
  };

  // Settings
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    await StorageService.saveSettings(merged);
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
        refreshAllData,
        checkPermission,
        requestPermission,
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
        addNote,
        updateNote,
        deleteNote,
        addRule,
        updateRule,
        deleteRule,
        updateSettings,
        simulateNotification,
      }}
    >
      {children}
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
