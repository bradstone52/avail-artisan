/**
 * User-editable display preferences, persisted in localStorage.
 * No DB/schema changes required.
 */

const OVERDUE_TEMPLATE_KEY = 'dueLabel.overdueTemplate';
export const DEFAULT_OVERDUE_TEMPLATE = 'Overdue by {days} days';
const MAX_TEMPLATE_LENGTH = 80;
const DAYS_TOKEN = '{days}';

/**
 * Validates that a template string is usable:
 * - not empty
 * - not longer than MAX_TEMPLATE_LENGTH
 * - contains the {days} token
 */
export function isValidOverdueTemplate(value: string): boolean {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= MAX_TEMPLATE_LENGTH &&
    value.includes(DAYS_TOKEN)
  );
}

/** Read the overdue template from localStorage; fall back to default if missing or invalid. */
export function getOverdueTemplate(): string {
  try {
    const stored = localStorage.getItem(OVERDUE_TEMPLATE_KEY);
    if (stored !== null && isValidOverdueTemplate(stored)) return stored;
  } catch {
    // localStorage unavailable (SSR / private browsing edge case)
  }
  return DEFAULT_OVERDUE_TEMPLATE;
}

/** Persist the overdue template. Silently ignores invalid values. */
export function setOverdueTemplate(value: string): void {
  if (!isValidOverdueTemplate(value)) return;
  try {
    localStorage.setItem(OVERDUE_TEMPLATE_KEY, value);
    // Notify other components in the same tab via a custom event
    window.dispatchEvent(new CustomEvent('overdueLabelChange', { detail: value }));
  } catch {
    // Silently swallow write errors
  }
}

/** Reset to default and notify listeners. */
export function resetOverdueTemplate(): void {
  try {
    localStorage.removeItem(OVERDUE_TEMPLATE_KEY);
    window.dispatchEvent(new CustomEvent('overdueLabelChange', { detail: DEFAULT_OVERDUE_TEMPLATE }));
  } catch {
    // Silently swallow errors
  }
}

/**
 * Apply a template string, substituting {days} with the given number.
 * Falls back to the default template if the provided template is invalid.
 */
export function applyOverdueTemplate(template: string, days: number): string {
  const safe = isValidOverdueTemplate(template) ? template : DEFAULT_OVERDUE_TEMPLATE;
  return safe.replace(DAYS_TOKEN, String(days));
}
