/**
 * Converts a submarket string from ALL CAPS to Title Case
 * while preserving directional indicators (NE, NW, SE, SW)
 */
export function formatSubmarket(submarket: string | null | undefined): string {
  if (!submarket) return '-';
  
  const DIRECTIONAL_INDICATORS = ['NE', 'NW', 'SE', 'SW', 'N', 'S', 'E', 'W'];
  
  return submarket
    .split(/\s+/)
    .map(word => {
      const upper = word.toUpperCase();
      // Keep directional indicators uppercase
      if (DIRECTIONAL_INDICATORS.includes(upper)) {
        return upper;
      }
      // Title case: first letter uppercase, rest lowercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Formats a number with thousands separators
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('en-US');
}
