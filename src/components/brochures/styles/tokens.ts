/**
 * tokens.ts — ClearView Commercial Realty design tokens
 *
 * Palette: deep navy primary, warm off-white page, slate borders,
 * gold accent bar. Restrained, print-calibrated, institutional.
 */
export const C = {
  // ── Core palette ──────────────────────────────────────────────────────────
  /** Deep navy — primary brand, headers, section titles */
  navy:         '#1c2f4a',
  /** Lighter navy — secondary text on dark bg */
  navyLight:    '#2e4a6e',
  /** Warm off-white — page background */
  pageBg:       '#fafaf8',
  /** Near-black — body text, values */
  ink:          '#1a1d23',
  /** Dark gray — secondary body text */
  inkDark:      '#2d3340',
  /** Mid gray — labels, captions */
  inkMid:       '#5a6070',
  /** Light gray — muted / disabled */
  inkLight:     '#8a9099',
  /** Pure white */
  white:        '#ffffff',

  // ── Structural ────────────────────────────────────────────────────────────
  /** Hairline borders */
  border:       '#d8dce4',
  /** Table alternating row */
  rowEven:      '#f3f4f6',
  /** Table label column */
  rowLabel:     '#edf0f4',

  // ── Accent ────────────────────────────────────────────────────────────────
  /** Gold rule line — used sparingly for visual anchors */
  gold:         '#b8860b',
  /** Pale navy tint — card backgrounds */
  navyTint:     '#eef2f7',
} as const;

export type ColorToken = keyof typeof C;
