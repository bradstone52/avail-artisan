/**
 * tokens.ts — ClearView Commercial Realty design tokens
 *
 * Palette inspired by institutional CRE brokerage standards (CBRE, JLL, Colliers).
 * White-dominant, clean hairlines, navy accent, minimal color.
 */
export const C = {
  // ── Core palette ──────────────────────────────────────────────────────────
  /** Deep navy — primary brand, cover headline, section labels */
  navy:         '#1a3a5c',
  /** Mid navy — subtle use */
  navyMid:      '#234d78',
  /** White — page background */
  pageBg:       '#ffffff',
  /** Near-black — body text, values */
  ink:          '#1a1d23',
  /** Dark — heading text */
  inkDark:      '#1e2530',
  /** Mid gray — secondary text, labels */
  inkMid:       '#6b7280',
  /** Light gray — muted / captions */
  inkLight:     '#9ca3af',
  /** Pure white */
  white:        '#ffffff',

  // ── Structural ────────────────────────────────────────────────────────────
  /** Hairline rule — spec table dividers */
  border:       '#e5e7eb',
  /** Slightly darker hairline */
  borderDark:   '#d1d5db',
  /** Warm border alias (kept for compat) */
  borderWarm:   '#e5e7eb',
  /** Very light tint for header rows — subtle only */
  rowEven:      '#f9fafb',
  /** Label column background — barely-there tint */
  rowLabel:     '#f3f4f6',

  // ── Accent ────────────────────────────────────────────────────────────────
  /** Navy tint accent — for deal-type badge, tagline bar */
  navyTint:     '#eef4fb',
  /** Green accent — used in some CRE references for highlights */
  accent:       '#1a3a5c',
} as const;

export type ColorToken = keyof typeof C;
