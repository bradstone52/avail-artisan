import { differenceInCalendarDays, format } from 'date-fns';

/**
 * Returns today as a plain midnight Date anchored to America/Edmonton timezone.
 * Prevents UTC-boundary off-by-one errors for Mountain Time users.
 */
export function getTodayEdmonton(): Date {
  const str = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' });
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Parses a "YYYY-MM-DD" string as a local midnight Date (no UTC shift).
 */
export function parseDateOnlyLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Days from Edmonton-anchored today to the given date string.
 * Negative values indicate the date is overdue.
 */
export function daysFromTodayEdmonton(dateStr: string): number {
  return differenceInCalendarDays(parseDateOnlyLocal(dateStr), getTodayEdmonton());
}

/**
 * Human-readable due label for a "YYYY-MM-DD" date string.
 * - "Overdue by X days" (or "Overdue by 1 day")
 * - "Due today"
 * - "Due tomorrow"
 * - "MMM d, yyyy" for all other future dates
 */
export function formatDueLabel(dateStr: string): { text: string; isOverdue: boolean } {
  const diff = daysFromTodayEdmonton(dateStr);
  if (diff < 0) {
    const abs = Math.abs(diff);
    return { text: `Overdue by ${abs} day${abs === 1 ? '' : 's'}`, isOverdue: true };
  }
  if (diff === 0) return { text: 'Due today', isOverdue: false };
  if (diff === 1) return { text: 'Due tomorrow', isOverdue: false };
  return { text: format(parseDateOnlyLocal(dateStr), 'MMM d, yyyy'), isOverdue: false };
}
