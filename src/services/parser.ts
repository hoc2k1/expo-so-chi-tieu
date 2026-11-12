import { TransactionType } from '../models/types';
import { SUPPORTED_APPS } from '../constants/defaultData';

export interface ParsedNotification {
  isValidTransaction: boolean;
  amount: number;
  type: TransactionType;
  source: string;
  referenceCode?: string;
  balanceAfter?: number;
  rawContent: string;
  ignoreReason?: string;
}

export function parseNotification(
  packageName: string,
  title: string,
  text: string
): ParsedNotification {
  const fullText = `${title ? title + ' ' : ''}${text || ''}`.trim();

  // 1. Check for OTP / Security / Promo to ignore
  const ignorePatterns = [
    /\botp\b/i,
    /mã xác thực/i,
    /ma xac thuc/i,
    /không chia sẻ mã/i,
    /khong chia se ma/i,
    /cảnh báo bảo mật/i,
    /canh bao bao mat/i,
    /ưu đãi đặc biệt/i,
    /uu dai dac biet/i,
    /khuyến mại/i,
    /khuyen mai/i,
    /quảng cáo/i,
    /voucher/i,
  ];

  for (const pattern of ignorePatterns) {
    if (pattern.test(fullText)) {
      return {
        isValidTransaction: false,
        amount: 0,
        type: 'expense',
        source: getAppFriendlyName(packageName),
        rawContent: fullText,
        ignoreReason: 'OTP/Khuyến mãi/Bảo mật',
      };
    }
  }

  // 2. Identify Source / Bank Name
  const source = getAppFriendlyName(packageName, fullText);

  // 3. Extract Reference Code (Ref, Mã GD, Trace)
  let referenceCode: string | undefined;
  const refMatch = fullText.match(/(?:ref|mã gd|ma gd|mã giao dịch|số gd|trace|ft)[:\s]*([a-zA-Z0-9._-]+)/i);
  if (refMatch && refMatch[1]) {
    referenceCode = refMatch[1].trim();
  }

  // 4. Extract Balance After (Số dư / SD)
  let balanceAfter: number | undefined;
  const balanceMatch = fullText.match(/(?:sd|số dư|so du|số dư cuối|so du cuoi|số dư khả dụng)[:\s]*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,})\s*(?:vnd|vnđ|đ)?/i);
  if (balanceMatch && balanceMatch[1]) {
    balanceAfter = cleanNumber(balanceMatch[1]);
  }

  // 5. Extract Amount & Determine Type (+ / - / Income / Expense)
  // Look for explicitly signed amounts first: e.g. +50,000 VND or -120.000d
  const signedAmountMatch = fullText.match(/([+-])\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,})\s*(?:vnd|vnđ|đ)?/i);

  let amount = 0;
  let type: TransactionType = 'expense';

  if (signedAmountMatch) {
    const sign = signedAmountMatch[1];
    amount = cleanNumber(signedAmountMatch[2]);
    type = sign === '+' ? 'income' : 'expense';
  } else {
    // If not explicitly signed with +/-:
    // Check keywords for income: cộng, nhận, nạp tiền vào, tăng, hoàn tiền
    const isIncome = /(?:cộng|nhận|nhận tiền|vào tk|tiền vào|hoàn tiền|tăng)/i.test(fullText) &&
      !/(?:thanh toán|trừ|chuyển đi|rút tiền|giảm)/i.test(fullText);

    // Regex to match amount, excluding balance if possible
    const amountRegex = /(?:gd|số tiền|so tien|thanh toán|chuyển|nhận|rút|tăng|giảm)?[:\s]*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,})\s*(?:vnd|vnđ|đ)/gi;
    let match: RegExpExecArray | null;
    const candidates: number[] = [];

    while ((match = amountRegex.exec(fullText)) !== null) {
      const val = cleanNumber(match[1]);
      if (balanceAfter && val === balanceAfter) continue;
      candidates.push(val);
    }

    if (candidates.length > 0) {
      amount = candidates[0];
      type = isIncome ? 'income' : 'expense';
    } else {
      const genericMatch = fullText.match(/([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(?:vnd|vnđ|đ)?/i);
      if (genericMatch) {
        amount = cleanNumber(genericMatch[1]);
        type = isIncome ? 'income' : 'expense';
      }
    }
  }

  // If amount is 0 or less than 1,000 VND, not a valid transaction notification
  if (amount < 1000) {
    return {
      isValidTransaction: false,
      amount: 0,
      type: 'expense',
      source,
      rawContent: fullText,
      ignoreReason: 'Không tìm thấy số tiền hợp lệ (> 1,000 VND)',
    };
  }

  return {
    isValidTransaction: true,
    amount,
    type,
    source,
    referenceCode,
    balanceAfter,
    rawContent: fullText,
  };
}

function cleanNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[.,\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export function getAppFriendlyName(packageName: string, fullText?: string): string {
  const pkgLower = packageName.toLowerCase();
  const found = SUPPORTED_APPS.find(
    (app) =>
      app.packageName.toLowerCase() === pkgLower ||
      (app.aliases && app.aliases.some((alias) => alias.toLowerCase() === pkgLower))
  );
  if (found) {
    if (found.category === 'email_sms' && fullText) {
      const lower = fullText.toLowerCase();
      if (lower.includes('vietcombank') || lower.includes('vcb')) return 'Vietcombank (VCB Digibank)';
      if (lower.includes('mbbank') || lower.includes('mb bank') || /\bmb\b/.test(lower)) return 'MB Bank (Quân Đội)';
      if (lower.includes('techcombank') || lower.includes('tcb')) return 'Techcombank Mobile';
      if (lower.includes('bidv')) return 'BIDV SmartBanking';
      if (lower.includes('vietinbank')) return 'VietinBank iPay';
      if (lower.includes('acb')) return 'ACB ONE';
      if (lower.includes('tpbank')) return 'TPBank Mobile';
      if (lower.includes('vpbank')) return 'VPBank NEO';
      if (lower.includes('timo')) return 'Timo Digital Bank';
      if (lower.includes('viettel money') || lower.includes('viettelpay')) return 'Viettel Money';
      if (lower.includes('momo')) return 'Ví MoMo';
      if (lower.includes('zalopay')) return 'Ví ZaloPay';
    }
    return found.name;
  }

  if (pkgLower.includes('timo')) return 'Timo Digital Bank';
  if (pkgLower.includes('vtpay') || pkgLower.includes('viettel')) return 'Viettel Money';

  const parts = packageName.split('.');
  const lastPart = parts[parts.length - 1] || packageName;
  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
}
