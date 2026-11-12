import { TimeRangePreset } from '../models/types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.abs(amount)) + ' đ';
}

export function formatDate(timestampOrDate: number | string): string {
  if (typeof timestampOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(timestampOrDate)) {
    const [y, m, d] = timestampOrDate.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(timestampOrDate);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatTime(timestampOrDate: number | string): string {
  const d = new Date(timestampOrDate);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateTime(timestampOrDate: number | string): string {
  return `${formatDate(timestampOrDate)} ${formatTime(timestampOrDate)}`;
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;

  const d = new Date(timestamp);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  if (isToday) {
    return `Hôm nay ${formatTime(timestamp)}`;
  }

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Hôm qua ${formatTime(timestamp)}`;
  }

  return formatDateTime(timestamp);
}

/**
 * Parses 'DD/MM/YYYY', 'DD/MM/YYYY HH:mm', 'YYYY-MM-DD', or 'YYYY-MM-DD HH:mm'
 */
export function parseFlexibleDateTime(input: string, isEndOfDay = false): number | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  // Format: DD/MM/YYYY or DD/MM/YYYY HH:mm
  const dmyMatch = trimmed.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hasTime = dmyMatch[4] !== undefined && dmyMatch[5] !== undefined;
    const hour = hasTime ? parseInt(dmyMatch[4], 10) : isEndOfDay ? 23 : 0;
    const minute = hasTime ? parseInt(dmyMatch[5], 10) : isEndOfDay ? 59 : 0;
    const second = hasTime ? (isEndOfDay ? 59 : 0) : isEndOfDay ? 59 : 0;
    const ms = isEndOfDay ? 999 : 0;
    const d = new Date(year, month, day, hour, minute, second, ms);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // Format: YYYY-MM-DD or YYYY-MM-DD HH:mm
  const ymdMatch = trimmed.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hasTime = ymdMatch[4] !== undefined && ymdMatch[5] !== undefined;
    const hour = hasTime ? parseInt(ymdMatch[4], 10) : isEndOfDay ? 23 : 0;
    const minute = hasTime ? parseInt(ymdMatch[5], 10) : isEndOfDay ? 59 : 0;
    const second = hasTime ? (isEndOfDay ? 59 : 0) : isEndOfDay ? 59 : 0;
    const ms = isEndOfDay ? 999 : 0;
    const d = new Date(year, month, day, hour, minute, second, ms);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  return null;
}

export function isTransactionInTimeRange(
  timestamp: number,
  dateStr: string,
  timeRange: TimeRangePreset,
  customStart: string,
  customEnd: string
): boolean {
  if (timeRange === 'all') return true;

  const now = new Date();
  const txDate = new Date(timestamp);

  if (timeRange === 'today') {
    return (
      txDate.getDate() === now.getDate() &&
      txDate.getMonth() === now.getMonth() &&
      txDate.getFullYear() === now.getFullYear()
    );
  }
  if (timeRange === 'week') {
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    oneWeekAgo.setHours(0, 0, 0, 0);
    return txDate >= oneWeekAgo;
  }
  if (timeRange === 'month') {
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
  }
  if (timeRange === 'year') {
    return txDate.getFullYear() === now.getFullYear();
  }
  if (timeRange === 'custom') {
    const startMs = parseFlexibleDateTime(customStart, false);
    const endMs = parseFlexibleDateTime(customEnd, true);
    if (startMs !== null && timestamp < startMs) return false;
    if (endMs !== null && timestamp > endMs) return false;
    return true;
  }
  return true;
}

export function getDefaultMonthStartDisplay(): string {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  return `01/${month}/${year} 00:00`;
}

export function getDefaultTodayEndDisplay(): string {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year} 23:59`;
}
