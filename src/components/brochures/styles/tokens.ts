/**
 * tokens.ts
 *
 * Design tokens for brochure PDF rendering.
 *
 * ADOBE EXPRESS NOTE:
 * Once you provide the AE reference, update this file to match:
 *  - C.accent       → your primary brand color (currently ClearView navy)
 *  - C.yellow       → your accent/highlight color (currently ClearView gold)
 *  - typography sizes → match AE frame font sizes
 * All templates import from here, so one change propagates everywhere.
 */
export const C = {
  black:       '#1a1a1a',
  dark:        '#333333',
  mid:         '#666666',
  light:       '#999999',
  border:      '#d0d0d0',
  tableBg:     '#f2f2f2',
  white:       '#ffffff',
  /** Primary brand colour — ClearView navy */
  accent:      '#1e3a5f',
  accentLight: '#e8eef5',
  highlight:   '#2563EB',
  /** Secondary accent — ClearView gold */
  yellow:      '#D97706',
} as const;

export type ColorToken = keyof typeof C;
