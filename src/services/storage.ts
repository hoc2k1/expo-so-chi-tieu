import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import {
  Transaction,
  PendingTransaction,
  Category,
  SavedNote,
  AutoRule,
  AppSettings,
} from '../models/types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_NOTES,
  DEFAULT_RULES,
  DEFAULT_SETTINGS,
  SUPPORTED_APPS,
} from '../constants/defaultData';

const BASE_DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}data/` : 'data/';

const FILES = {
  TRANSACTIONS: `${BASE_DIR}transactions.json`,
  PENDING: `${BASE_DIR}pending_transactions.json`,
  CATEGORIES: `${BASE_DIR}categories.json`,
  NOTES: `${BASE_DIR}notes.json`,
  RULES: `${BASE_DIR}rules.json`,
  SETTINGS: `${BASE_DIR}settings.json`,
};

// In-memory web fallback if localStorage or FileSystem not available
const webMemoryStore: Record<string, string> = {};
let dirInitialized = false;

async function ensureDirExists(): Promise<void> {
  if (Platform.OS === 'web' || dirInitialized) return;
  try {
    const dirInfo = await FileSystem.getInfoAsync(BASE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true });
    }
    dirInitialized = true;
  } catch (err) {
    console.error('Error ensuring dir exists:', err);
  }
}

async function readFileJson<T>(path: string, defaultValue: T): Promise<T> {
  if (Platform.OS === 'web') {
    try {
      const key = `so_chi_tieu_${path}`;
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val) return JSON.parse(val) as T;
      } else if (webMemoryStore[key]) {
        return JSON.parse(webMemoryStore[key]) as T;
      }
    } catch {
      // Fallback to default
    }
    return defaultValue;
  }

  try {
    await ensureDirExists();
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      await writeFileJson(path, defaultValue);
      return defaultValue;
    }
    const content = await FileSystem.readAsStringAsync(path);
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Error reading ${path}:`, error);
    return defaultValue;
  }
}

// Serialize writes per file path to prevent concurrent write corruption
const writeQueues: Record<string, Promise<void>> = {};

async function writeFileJson<T>(path: string, data: T): Promise<void> {
  const jsonStr = JSON.stringify(data, null, 2);

  if (Platform.OS === 'web') {
    const key = `so_chi_tieu_${path}`;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, jsonStr);
      } else {
        webMemoryStore[key] = jsonStr;
      }
    } catch (err) {
      console.error('Error saving to web storage:', err);
    }
    return;
  }

  const prevTask = writeQueues[path] || Promise.resolve();
  const nextTask = prevTask
    .catch(() => {})
    .then(async () => {
      try {
        await ensureDirExists();
        await FileSystem.writeAsStringAsync(path, jsonStr);
      } catch (error) {
        console.error(`Error writing ${path}:`, error);
      }
    });

  writeQueues[path] = nextTask;
  return nextTask;
}

export const StorageService = {
  async initStorage(): Promise<void> {
    await ensureDirExists();
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return readFileJson<Transaction[]>(FILES.TRANSACTIONS, []);
  },
  async saveTransactions(data: Transaction[]): Promise<void> {
    return writeFileJson(FILES.TRANSACTIONS, data);
  },

  // Pending Transactions
  async getPendingTransactions(): Promise<PendingTransaction[]> {
    return readFileJson<PendingTransaction[]>(FILES.PENDING, []);
  },
  async savePendingTransactions(data: PendingTransaction[]): Promise<void> {
    return writeFileJson(FILES.PENDING, data);
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    return readFileJson<Category[]>(FILES.CATEGORIES, DEFAULT_CATEGORIES);
  },
  async saveCategories(data: Category[]): Promise<void> {
    return writeFileJson(FILES.CATEGORIES, data);
  },

  // Notes
  async getNotes(): Promise<SavedNote[]> {
    return readFileJson<SavedNote[]>(FILES.NOTES, DEFAULT_NOTES);
  },
  async saveNotes(data: SavedNote[]): Promise<void> {
    return writeFileJson(FILES.NOTES, data);
  },

  // Rules
  async getRules(): Promise<AutoRule[]> {
    return readFileJson<AutoRule[]>(FILES.RULES, DEFAULT_RULES);
  },
  async saveRules(data: AutoRule[]): Promise<void> {
    return writeFileJson(FILES.RULES, data);
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const loaded = await readFileJson<AppSettings>(FILES.SETTINGS, DEFAULT_SETTINGS);
    const currentList = Array.isArray(loaded.enabledPackages) ? loaded.enabledPackages : [];
    const currentLowerSet = new Set(currentList.map((p) => p.toLowerCase()));
    let changed = false;

    // If user had enabled an app, ensure all of its aliases (e.g. new Techcombank, Sacombank, SMS) are also enabled
    // And ensure newly added default apps are included if enabledPackages was using default set
    for (const app of SUPPORTED_APPS) {
      const allPkgs = [app.packageName, ...(app.aliases || [])];
      const hasAnyEnabled = allPkgs.some((p) => currentLowerSet.has(p.toLowerCase()));
      if (hasAnyEnabled || currentList.length > 0) {
        // Always sync aliases of enabled apps, plus new banks/SMS apps
        const shouldAddAllAliases =
          hasAnyEnabled ||
          ['com.vib.myvib2', 'com.vnpay.hdbank', 'vn.shb.mbanking', 'vn.com.ocb.awe', 'vn.com.seabank.mb1', 'vn.com.lpb.lienviet24h', 'xyz.be.cake', 'vn.tnex.consumer', 'com.zing.zalo'].includes(app.packageName);
        if (shouldAddAllAliases) {
          for (const pkg of allPkgs) {
            if (!currentLowerSet.has(pkg.toLowerCase())) {
              currentList.push(pkg);
              currentLowerSet.add(pkg.toLowerCase());
              changed = true;
            }
          }
        }
      }
    }

    if (changed) {
      loaded.enabledPackages = currentList;
      await this.saveSettings(loaded);
    }
    if (!loaded.updateHistory) {
      loaded.updateHistory = [];
    }
    return loaded;
  },
  async saveSettings(data: AppSettings): Promise<void> {
    return writeFileJson(FILES.SETTINGS, data);
  },

  // Export full backup
  async exportAllData(): Promise<string> {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      transactions: await this.getTransactions(),
      pendingTransactions: await this.getPendingTransactions(),
      categories: await this.getCategories(),
      notes: await this.getNotes(),
      rules: await this.getRules(),
      settings: await this.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  },

  // Import full backup
  async importAllData(jsonStr: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.transactions)) {
        await this.saveTransactions(parsed.transactions);
      }
      if (Array.isArray(parsed.pendingTransactions)) {
        await this.savePendingTransactions(parsed.pendingTransactions);
      }
      if (Array.isArray(parsed.categories)) {
        await this.saveCategories(parsed.categories);
      }
      if (Array.isArray(parsed.notes)) {
        await this.saveNotes(parsed.notes);
      }
      if (Array.isArray(parsed.rules)) {
        await this.saveRules(parsed.rules);
      }
      if (parsed.settings && typeof parsed.settings === 'object') {
        await this.saveSettings(parsed.settings);
      }
      return true;
    } catch (e) {
      console.error('Import backup failed:', e);
      return false;
    }
  },
};
