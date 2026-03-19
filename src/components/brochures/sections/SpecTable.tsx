/**
 * SpecTable.tsx
 *
 * Institutional CRE spec table — inspired by CBRE/JLL/Colliers brochure style.
 *
 * Layout:
 *  - Bold navy section title (large, left-aligned — NOT a colored bar)
 *  - Full-width rows with thin hairline dividers
 *  - Label: bold, dark navy, left (no background)
 *  - Value: regular weight, dark gray, right
 *  - Clean white background throughout
 *  - Optional feature bullet list below
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureSpecRow } from '@/lib/brochures/brochureTypes';

const LABEL_W = '42%';
const VALUE_W = '58%';

const s = StyleSheet.create({
  wrapper:  { marginBottom: 20 },

  // Section title — navy bold text, NOT a colored bar
  title: {
    fontSize:     9,
    fontWeight:   'bold',
    color:        C.navy,
    marginBottom: 6,
    letterSpacing: 0.2,
  },

  // Table
  table: { borderTopWidth: 0.5, borderTopColor: C.border },

  row: {
    flexDirection:     'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    minHeight:         20,
  },

  // Label cell — bold, no background
  label: {
    width:             LABEL_W,
    paddingVertical:   5,
    paddingHorizontal: 0,
    justifyContent:    'center' as const,
  },
  labelText: {
    fontSize:   7.5,
    fontWeight: 'bold',
    color:      C.inkDark,
  },

  // Value cell — normal weight
  value: {
    width:             VALUE_W,
    paddingVertical:   5,
    paddingHorizontal: 8,
    justifyContent:    'center' as const,
  },
  valueText: {
    fontSize:   7.5,
    color:      C.inkMid,
    lineHeight: 1.4,
  },

  // Feature bullets below table
  featuresWrapper: { marginTop: 10 },
  featureRow: {
    flexDirection: 'row' as const,
    marginBottom:  4,
    alignItems:    'flex-start' as const,
  },
  bulletChar: {
    fontSize:    8,
    color:       C.navy,
    marginRight: 6,
    marginTop:   0,
    fontWeight:  'bold',
  },
  featureText: { fontSize: 7.5, color: C.inkDark, lineHeight: 1.45, flex: 1 },
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
      <Text style={s.title}>{title}</Text>
      <View style={s.table}>
        {rows.map((row, idx) => (
          <View key={idx} style={s.row}>
            <View style={s.label}>
              <Text style={s.labelText}>{row.label}</Text>
            </View>
            <View style={s.value}>
              <Text style={s.valueText}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {features.length > 0 && (
        <View style={s.featuresWrapper}>
          {features.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <Text style={s.bulletChar}>+</Text>
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
