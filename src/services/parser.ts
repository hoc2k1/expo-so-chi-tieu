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

const PURE_OTP_PATTERNS = [
  /\bmã otp\b/i,
  /\bma otp\b/i,
  /\bsmart\s*otp\b/i,
  /\bmã xác thực\b/i,
  /\bma xac thuc\b/i,
  /\bmã bảo mật\b/i,
  /\bma bao mat\b/i,
  /\botp của quý khách\b/i,
  /\botp cua quy khach\b/i,
  /\botp la\b/i,
  /\botp là\b/i,
  /\bis your otp\b/i,
  /\bverification code\b/i,
];

const PROMO_PATTERNS = [
  /\bưu đãi đặc biệt\b/i,
  /\buu dai dac biet\b/i,
  /\bchương trình khuyến mại\b/i,
  /\bchuong trinh khuyen mai\b/i,
  /\bquảng cáo\b/i,
  /\b선물\b/i,
];

const STRONG_TRANSACTION_SIGNALS = [
  /\b(?:số dư|so du|sd|số dư cuối|số dư khả dụng)\b[:\s]*[0-9]/i,
  /(?:[+-])\s*[0-9]{1,3}(?:[.,][0-9]{3})+\s*(?:vnd|vnđ|đ|₫|d\b)/i,
  /\bbiến động số dư\b/i,
  /\bbien dong so du\b/i,
  /\bgiao dịch thành công\b/i,
  /\bgiao dich thanh cong\b/i,
  /\bthanh toán thành công\b/i,
  /\bthanh toan thanh cong\b/i,
  /\bchuyển tiền thành công\b/i,
  /\bchuyen tien thanh cong\b/i,
  /\bnhận tiền thành công\b/i,
  /\bnhan tien thanh cong\b/i,
];

const BANK_OR_FINANCE_SIGNALS_FOR_OTT = [
  /\b(?:vietcombank|vcb|mbbank|mb bank|techcombank|tcb|bidv|vietinbank|ipay|acb|tpbank|vpbank|sacombank|agribank|msb|vib|hdbank|shb|ocb|seabank|lpbank|lienviet|timo|cake|tnex|viettel\s*money|viettelpay|momo|zalopay|vnpay|shopeepay)\b/i,
  /\b(?:biến động số dư|bien dong so du|số dư khả dụng|so du kha dung|số dư cuối|so du cuoi)\b/i,
  /\b(?:tk|stk|tài khoản|tai khoan)\s*[0-9xX*]{3,}/i,
];

export function parseNotification(
  packageName: string,
  title: string,
  text: string,
  subText?: string
): ParsedNotification {
  const cleanTitle = (title || '').trim();
  const cleanText = (text || '').trim();
  const cleanSub = (subText || '').trim();

  // If text has multiple lines and full parse fails due to an old OTP line mixed with a new transaction line,
  // we also check individual lines as a fallback.
  const fullResult = parseSingleTextBlock(packageName, cleanTitle, cleanText, cleanSub);
  if (fullResult.isValidTransaction) {
    return fullResult;
  }

  if (cleanText.includes('\n')) {
    const lines = cleanText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length > 1) {
      // Iterate from newest line (bottom) to oldest line (top)
      for (let i = lines.length - 1; i >= 0; i--) {
        const lineRes = parseSingleTextBlock(packageName, cleanTitle, lines[i], cleanSub);
        if (lineRes.isValidTransaction) {
          return lineRes;
        }
      }
    }
  }

  return fullResult;
}

function parseSingleTextBlock(
  packageName: string,
  title: string,
  text: string,
  subText: string
): ParsedNotification {
  const fullText = [title, text, subText]
    .filter((part) => part && part.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const source = getAppFriendlyName(packageName, fullText);

  if (!fullText) {
    return {
      isValidTransaction: false,
      amount: 0,
      type: 'expense',
      source,
      rawContent: '',
      ignoreReason: 'Nội dung trống',
    };
  }

  // For Zalo OTT, ensure the notification actually comes from a bank/wallet OA or has bank account/balance markers
  const pkgLower = (packageName || '').toLowerCase();
  if (pkgLower === 'com.zing.zalo') {
    const hasBankSignal = BANK_OR_FINANCE_SIGNALS_FOR_OTT.some((re) => re.test(fullText));
    if (!hasBankSignal) {
      return {
        isValidTransaction: false,
        amount: 0,
        type: 'expense',
        source,
        rawContent: fullText,
        ignoreReason: 'Tin nhắn Zalo cá nhân (không phải thông báo Ngân hàng/Ví)',
      };
    }
  }

  const hasStrongSignal = STRONG_TRANSACTION_SIGNALS.some((re) => re.test(fullText));

  // 1. Check for OTP
  for (const pattern of PURE_OTP_PATTERNS) {
    if (pattern.test(fullText)) {
      // Only ignore if it does NOT have a clear balance-after + signed amount marker
      const hasBalanceAndSign =
        /\b(?:số dư|so du|sd)\b[:\s]*[0-9]/i.test(fullText) &&
        /[+-]\s*[0-9]{1,3}(?:[.,][0-9]{3})+/.test(fullText);
      if (!hasBalanceAndSign) {
        return {
          isValidTransaction: false,
          amount: 0,
          type: 'expense',
          source,
          rawContent: fullText,
          ignoreReason: 'Mã xác thực OTP / Bảo mật',
        };
      }
    }
  }

  // 2. Check for Promotional / Ad messages (only ignore if there is no strong transaction signal)
  if (!hasStrongSignal) {
    for (const pattern of PROMO_PATTERNS) {
      if (pattern.test(fullText)) {
        return {
          isValidTransaction: false,
          amount: 0,
          type: 'expense',
          source,
          rawContent: fullText,
          ignoreReason: 'Khuyến mãi / Quảng cáo',
        };
      }
    }
  }

  // 3. Extract Reference Code (must contain at least 1 digit and be >= 4 chars so normal words are never matched)
  let referenceCode: string | undefined;
  const refRegex = /\b(?:ref(?:erence)?|mã gd|ma gd|mã giao dịch|ma giao dich|số gd|so gd|trace|mã tham chiếu|ma tham chieu|ft)\b[:\s#]*([A-Za-z0-9][A-Za-z0-9._-]{3,})/gi;
  let refCandidate: RegExpExecArray | null;
  while ((refCandidate = refRegex.exec(fullText)) !== null) {
    const candidateStr = refCandidate[1].trim();
    if (/\d/.test(candidateStr)) {
      referenceCode = candidateStr;
      break;
    }
  }

  // Also check standalone FT code (e.g. FT26317123456)
  if (!referenceCode) {
    const ftMatch = fullText.match(/\b(FT[0-9]{8,}[A-Za-z0-9]*)\b/);
    if (ftMatch && ftMatch[1]) {
      referenceCode = ftMatch[1].trim();
    }
  }

  // 4. Mask dates, times, phone numbers, account numbers, and reference codes so they are never mistaken for amounts
  let maskedText = fullText
    // Mask dates like 13/11/2026, 13-11-2026, 2026-11-13, 13/11/26
    .replace(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g, ' [DATE] ')
    .replace(/\b\d{4}[/.-]\d{1,2}[/.-]\d{1,2}\b/g, ' [DATE] ')
    // Mask times like 08:25:38 or 08:25
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' [TIME] ')
    // Mask +84 phone numbers
    .replace(/\+84\d{7,11}\b/g, ' [PHONE] ')
    // Mask masked card/account numbers like 1234xxx5678 or 9704****1234
    .replace(/\b[0-9]{2,6}[xX*]{2,}[0-9]{2,6}\b/g, ' [ACC] ')
    // Mask explicit account/card numbers following TK / STK / Tài khoản / Thẻ
    .replace(
      /\b(?:tk|stk|tài khoản|tai khoan|số tk|so tk|thẻ|số thẻ|card|acc|a\/c)\b[:\s]*[0-9xX*]{3,}(?:-[0-9xX*]{3,})*/gi,
      ' [ACC] '
    );

  if (referenceCode) {
    maskedText = maskedText.replace(referenceCode, ' [REF] ');
  }

  // 5. Extract Balance After (Số dư / SD) from maskedText
  let balanceAfter: number | undefined;
  const balanceRegex =
    /\b(?:sd|số dư|so du|số dư cuối|so du cuoi|số dư khả dụng|so du kha dung|số dư hiện tại|so du hien tai)\b(?:[^0-9+-]{0,20}?)([0-9]{1,3}(?:[.,\s][0-9]{3})+(?:[.,][0-9]{1,2})?|[0-9]{4,})\s*(?:vnd|vnđ|đ|₫|d\b)?/i;
  const balanceMatch = maskedText.match(balanceRegex);
  if (balanceMatch && balanceMatch[1]) {
    balanceAfter = cleanNumber(balanceMatch[1]);
    // Remove matched balance segment from maskedText so unsigned amount extraction won't pick the balance
    maskedText = maskedText.replace(balanceMatch[0], ' [BALANCE] ');
  }

  // 6. Extract Amount & Determine Type (+ / - / Income / Expense)
  let amount = 0;
  let type: TransactionType = 'expense';

  // Priority 6.1: Explicitly signed amount with currency unit (e.g., +50,000 VND, -120.000đ, -50.000₫)
  const signedWithCurrencyMatch = maskedText.match(
    /([+-])\s*([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{1,2})?|[0-9]{4,})\s*(?:vnd|vnđ|đ|₫|d\b)/i
  );

  // Priority 6.2: Explicitly signed amount with thousand separators (e.g., +50,000 or -120.000) or after GD/PS/Số tiền
  const signedFormattedMatch =
    signedWithCurrencyMatch ||
    maskedText.match(
      /([+-])\s*([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{1,2})?|[0-9]{4,})\b/i
    );

  if (signedFormattedMatch) {
    const sign = signedFormattedMatch[1];
    amount = cleanNumber(signedFormattedMatch[2]);
    type = sign === '+' ? 'income' : 'expense';
  } else {
    // Determine income vs expense by Vietnamese banking keywords
    const hasIncomeKeyword =
      /\b(?:cộng|nhận|nhận tiền|nhan tien|tiền vào|tien vao|vào tk|vao tk|hoàn tiền|hoan tien|tăng|tang|nạp tiền vào|nap tien vao|được cộng|duoc cong)\b/i.test(
        fullText
      );
    const hasExpenseKeyword =
      /\b(?:thanh toán|thanh toan|trừ|tru|chuyển|chuyen|rút|rut|giảm|giam|mua|nạp tiền điện thoại|trích nợ|trich no|đã chuyển|da chuyen)\b/i.test(
        fullText
      );
    const isIncome = hasIncomeKeyword && !hasExpenseKeyword;

    // Priority 6.3: Amount followed by currency unit (VND, VNĐ, đ, ₫, d)
    const amountWithCurrencyRegex =
      /([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{1,2})?|[0-9]{4,})\s*(?:vnd|vnđ|đ|₫|d\b)/gi;
    let match: RegExpExecArray | null;
    const candidates: number[] = [];

    while ((match = amountWithCurrencyRegex.exec(maskedText)) !== null) {
      const val = cleanNumber(match[1]);
      if (val >= 1000 && (!balanceAfter || val !== balanceAfter)) {
        candidates.push(val);
      }
    }

    if (candidates.length > 0) {
      amount = candidates[0];
      type = isIncome ? 'income' : 'expense';
    } else {
      // Priority 6.4: Amount preceded by transaction keyword (Số tiền, GD, PS, Thanh toán, Chuyển, Nhận...)
      const keywordAmountMatch = maskedText.match(
        /\b(?:số tiền|so tien|gd|giao dịch|giao dich|ps|phát sinh|phat sinh|thanh toán|thanh toan|chuyển|chuyen|nhận|nhan|rút|rut|tăng|tang|giảm|giam)\b[:\s]*([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{1,2})?|[0-9]{4,})/i
      );
      if (keywordAmountMatch && keywordAmountMatch[1]) {
        amount = cleanNumber(keywordAmountMatch[1]);
        type = isIncome ? 'income' : 'expense';
      } else if (hasIncomeKeyword || hasExpenseKeyword || balanceAfter !== undefined) {
        // Priority 6.5: Formatted number with thousand separators when banking keywords exist
        const genericMatch = maskedText.match(/([0-9]{1,3}(?:[.,][0-9]{3})+)/);
        if (genericMatch && genericMatch[1]) {
          const val = cleanNumber(genericMatch[1]);
          if (!balanceAfter || val !== balanceAfter) {
            amount = val;
            type = isIncome ? 'income' : 'expense';
          }
        }
      }
    }
  }

  // Minimum valid transaction in VND is 1,000 VND
  if (amount < 1000) {
    return {
      isValidTransaction: false,
      amount: 0,
      type: 'expense',
      source,
      rawContent: fullText,
      ignoreReason: 'Không tìm thấy số tiền giao dịch hợp lệ (>= 1.000đ)',
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
  let s = str.trim();
  // Handle decimal cents if both ',' and '.' are present (e.g. 50,000.00 or 50.000,00)
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/[.,]\d{1,2}$/, '');
  } else if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(s) || /^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(s)) {
    s = s.replace(/[.,]\d{1,2}$/, '');
  }
  const cleaned = s.replace(/[.,\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export function getAppFriendlyName(packageName: string, fullText?: string): string {
  const pkgLower = (packageName || '').toLowerCase();
  const found = SUPPORTED_APPS.find(
    (app) =>
      app.packageName.toLowerCase() === pkgLower ||
      (app.aliases && app.aliases.some((alias) => alias.toLowerCase() === pkgLower))
  );
  if (found) {
    if (found.category === 'email_sms' && fullText) {
      const lower = fullText.toLowerCase();
      if (lower.includes('vietcombank') || /\bvcb\b/.test(lower)) return 'Vietcombank (VCB Digibank)';
      if (lower.includes('mbbank') || lower.includes('mb bank') || /\bmb\b/.test(lower)) return 'MB Bank (Quân Đội)';
      if (lower.includes('techcombank') || /\btcb\b/.test(lower)) return 'Techcombank Mobile';
      if (lower.includes('bidv')) return 'BIDV SmartBanking';
      if (lower.includes('vietinbank') || lower.includes('ipay')) return 'VietinBank iPay';
      if (/\bacb\b/.test(lower)) return 'ACB ONE';
      if (lower.includes('tpbank') || /\btpb\b/.test(lower)) return 'TPBank Mobile';
      if (lower.includes('vpbank')) return 'VPBank NEO';
      if (lower.includes('sacombank')) return 'Sacombank Pay / mBanking';
      if (lower.includes('agribank')) return 'Agribank Plus / E-Mobile';
      if (/\bmsb\b/.test(lower)) return 'MSB mBank';
      if (/\bvib\b/.test(lower) || lower.includes('myvib')) return 'MyVIB (Ngân hàng VIB)';
      if (lower.includes('hdbank')) return 'HDBank Mobile';
      if (/\bshb\b/.test(lower)) return 'SHB Mobile / SAHA';
      if (/\bocb\b/.test(lower)) return 'OCB OMNI';
      if (lower.includes('seabank')) return 'SeAMobile (SeABank)';
      if (lower.includes('lpbank') || lower.includes('lienviet')) return 'LPBank (LienViet24h)';
      if (lower.includes('timo')) return 'Timo Digital Bank';
      if (/\bcake\b/.test(lower)) return 'CAKE by VPBank';
      if (lower.includes('tnex')) return 'TNEX Ngân hàng số';
      if (lower.includes('viettel money') || lower.includes('viettelpay') || lower.includes('vtpay')) return 'Viettel Money';
      if (lower.includes('momo')) return 'Ví MoMo';
      if (lower.includes('zalopay')) return 'Ví ZaloPay';
      if (lower.includes('shopeepay') || lower.includes('airpay')) return 'Ví ShopeePay';
      if (lower.includes('vnpay')) return 'Ví VNPay';
    }
    return found.name;
  }

  if (pkgLower.includes('timo')) return 'Timo Digital Bank';
  if (pkgLower.includes('vtpay') || pkgLower.includes('viettel')) return 'Viettel Money';
  if (pkgLower.includes('techcombank') || pkgLower.includes('tcb')) return 'Techcombank Mobile';
  if (pkgLower.includes('sacombank')) return 'Sacombank Pay / mBanking';
  if (pkgLower.includes('agribank')) return 'Agribank Plus / E-Mobile';
  if (pkgLower.includes('vib')) return 'MyVIB (Ngân hàng VIB)';

  const parts = packageName.split('.');
  const lastPart = parts[parts.length - 1] || packageName;
  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
}
