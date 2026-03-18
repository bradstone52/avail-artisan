/**
 * tokens.ts — ClearView Commercial Realty design tokens
 *
 * Palette: deep navy primary, warm off-white page, slate borders,
 * gold accent. Restrained, print-calibrated, institutional.
 */
export const C = {
  // ── Core palette ──────────────────────────────────────────────────────────
  /** Deep navy — primary brand, headers, section titles */
  navy:         '#1a2e46',
  /** Mid navy — subtle rule lines on dark bg */
  navyMid:      '#243d5c',
  /** Warm off-white — page background */
  pageBg:       '#f9f9f7',
  /** Near-black — body text, values */
  ink:          '#1a1d23',
  /** Dark gray — secondary body text */
  inkDark:      '#2d3340',
  /** Mid gray — labels, captions, sub-text */
  inkMid:       '#5c6370',
  /** Light gray — muted / disabled */
  inkLight:     '#8c939f',
  /** Pure white */
  white:        '#ffffff',

  // ── Structural ────────────────────────────────────────────────────────────
  /** Hairline borders */
  border:       '#d6dae3',
  /** Slightly warmer border for tables */
  borderWarm:   '#dcdfe6',
  /** Table alternating even row */
  rowEven:      '#f4f5f7',
  /** Table label column background */
  rowLabel:     '#eceef2',

  // ── Accent ────────────────────────────────────────────────────────────────
  /** Warm gold — used for structural rules, bullets, accents */
  gold:         '#b08a0e',
  /** Pale navy tint — card / band backgrounds */
  navyTint:     '#eef2f7',
} as const;

export type ColorToken = keyof typeof C;
