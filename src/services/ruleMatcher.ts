import { AutoRule } from '../models/types';

export interface RuleMatchResult {
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  suggestedNote: string;
}

export function matchRule(text: string, rules: AutoRule[]): RuleMatchResult | undefined {
  if (!text || rules.length === 0) return undefined;

  const upper = text.toUpperCase();

  for (const rule of rules) {
    const keyword = rule.keyword.trim().toUpperCase();
    if (!keyword) continue;

    // Check if whole word or substring exists
    if (upper.includes(keyword)) {
      return {
        suggestedCategoryId: rule.categoryId,
        suggestedCategoryName: rule.categoryName,
        suggestedNote: rule.note,
      };
    }
  }

  return undefined;
}

