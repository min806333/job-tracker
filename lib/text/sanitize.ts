const REPLACEMENT_CHAR_REGEX = /\uFFFD/g;
const COMPAT_IDEOGRAPH_REGEX = /[\uF900-\uFAFF]/g;
const QUESTION_RUN_REGEX = /\?{2,}/g;
const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\u2060\uFEFF]/g;
const ODD_SPACE_REGEX = /[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g;

export function isLikelyCorruptedText(value: string): boolean {
  if (!value) return false;

  const total = value.length;
  if (total === 0) return false;

  const replacementCount = (value.match(REPLACEMENT_CHAR_REGEX) ?? []).length;
  const compatIdeographCount = (value.match(COMPAT_IDEOGRAPH_REGEX) ?? []).length;
  const questionRunChars = (value.match(QUESTION_RUN_REGEX) ?? []).reduce((sum, run) => sum + run.length, 0);

  const suspiciousChars = replacementCount + compatIdeographCount + questionRunChars;
  const suspiciousRatio = suspiciousChars / total;

  if (replacementCount > 0) return true;
  if (questionRunChars >= 6) return true;
  if (questionRunChars >= 2 && suspiciousRatio >= 0.35) return true;
  if (compatIdeographCount > 0 && suspiciousRatio >= 0.12) return true;

  return false;
}

export function sanitizePossiblyCorruptedText(value: string, fallback: string): string {
  return isLikelyCorruptedText(value) ? fallback : value;
}

export function normalizeHumanText(value: string): string {
  return value.replace(CONTROL_CHAR_REGEX, "").replace(ZERO_WIDTH_REGEX, "").replace(ODD_SPACE_REGEX, " ");
}

export function sanitizeTextForClipboard(value: string, fallback = ""): string {
  const source = value ?? "";
  const normalized = normalizeHumanText(source)
    .replace(/\r\n?/g, "\n")
    .replace(/\t+/g, " ")
    .replace(/[ \u00A0]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return fallback;
  return normalized;
}

export function sanitizeTextForQueryParam(value: string, fallback = ""): string {
  const normalized = sanitizeTextForClipboard(value, fallback)
    .replace(/\s+/g, " ")
    .trim();

  return normalized || fallback;
}
