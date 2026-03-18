/**
 * SpecTable.tsx
 *
 * Two-column spec table.
 * - Full-width navy section heading with thin underline
 * - Label column: light slate bg, muted uppercase text
 * - Value column: white bg, normal-weight ink text
 * - Alternating even-row tint for easy scanning
 * - Optional feature bullet list below the table
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureSpecRow } from '@/lib/brochures/brochureTypes';

const LABEL_W = '42%';
const VALUE_W = '58%';

const s = StyleSheet.create({
  wrapper:  { marginBottom: 16 },

  // Section heading ─────────────────────────────────────────────────────────
  heading: {
    fontSize:          6.5,
    fontWeight:        'bold',
    color:             C.white,
    backgroundColor:   C.navy,
    textTransform:     'uppercase' as const,
    letterSpacing:     1.2,
    paddingVertical:   4,
    paddingHorizontal: 7,
    marginBottom:      0,
  },

  // Table container
  table: {
    borderWidth:  0.5,
    borderColor:  C.borderWarm,
    borderTopWidth: 0,
  },

  // Row variants ─────────────────────────────────────────────────────────────
  row: {
    flexDirection:     'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderWarm,
  },
  rowLast:  { flexDirection: 'row' as const },
  rowOdd:   { backgroundColor: C.white },
  rowEven:  { backgroundColor: C.rowEven },

  // Label cell
  label: {
    width:             LABEL_W,
    backgroundColor:   C.rowLabel,
    paddingVertical:   4.5,
    paddingHorizontal: 8,
    borderRightWidth:  0.5,
    borderRightColor:  C.borderWarm,
  },
  labelText: {
    fontSize:      7,
    color:         C.inkMid,
    fontWeight:    'bold',
    letterSpacing: 0.1,
  },

  // Value cell
  value: {
    width:             VALUE_W,
    paddingVertical:   4.5,
    paddingHorizontal: 8,
  },
  valueText: { fontSize: 7.5, color: C.ink },

  // Feature bullets ─────────────────────────────────────────────────────────
  featuresWrapper: { marginTop: 9 },
  featureRow: {
    flexDirection: 'row' as const,
    marginBottom:  3.5,
    alignItems:    'flex-start' as const,
  },
  bullet: {
    width:           3.5,
    height:          3.5,
    backgroundColor: C.gold,
    marginRight:     6,
    marginTop:       3,
    flexShrink:      0,
  },
  featureText: { fontSize: 7.5, color: C.inkDark, lineHeight: 1.45 },
});

interface SpecTableProps {
  rows:      BrochureSpecRow[];
  features?: string[];
  title?:    string;
}

export function SpecTable({ rows, features = [], title = 'Property Details' }: SpecTableProps) {
  if (!rows.length) return null;
  return (
    <View style={s.wrapper}>
      <Text style={s.heading}>{title}</Text>
      <View style={s.table}>
        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          const isEven = idx % 2 === 0;
          return (
            <View
              key={idx}
              style={[isLast ? s.rowLast : s.row, isEven ? s.rowEven : s.rowOdd]}
            >
              <View style={s.label}>
                <Text style={s.labelText}>{row.label}</Text>
              </View>
              <View style={s.value}>
                <Text style={s.valueText}>{row.value}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {features.length > 0 && (
        <View style={s.featuresWrapper}>
          {features.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <View style={s.bullet} />
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
