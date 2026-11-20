import { useMemo } from 'react';
import { Category, Transaction } from '../models/types';
import { MultiSelectOption } from '../components/MultiSelectGridModal';
import { SUPPORTED_APPS } from '../constants/defaultData';

export function useCategoryMap(categories: Category[]) {
  return useMemo(() => {
    const map: Record<string, { icon: string; color: string; name: string }> = {};
    for (const c of categories) {
      map[c.id] = { icon: c.icon, color: c.color, name: c.name };
    }
    return map;
  }, [categories]);
}

export function useFilterOptions(transactions: Transaction[], categories: Category[]) {
  const categoryMap = useCategoryMap(categories);

  const categoryOptions = useMemo<MultiSelectOption[]>(
    () =>
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        subtitle: c.type === 'expense' ? 'Chi tiêu' : 'Thu nhập',
      })),
    [categories]
  );

  const bankOptions = useMemo<MultiSelectOption[]>(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.source) set.add(t.source);
    });
    SUPPORTED_APPS.forEach((app) => {
      if (app.category !== 'email_sms') {
        set.add(app.name);
      }
    });
    set.add('Tiền mặt');
    return Array.from(set).map((s) => ({
      id: s,
      name: s,
      icon: s === 'Tiền mặt' ? 'cash-outline' : 'business-outline',
    }));
  }, [transactions]);

  return { categoryMap, categoryOptions, bankOptions };
}
