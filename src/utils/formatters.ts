export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.abs(amount)) + ' đ';
}

export function formatDate(timestampOrDate: number | string): string {
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

