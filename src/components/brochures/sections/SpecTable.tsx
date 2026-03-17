/**
 * SpecTable.tsx — Two-column spec table with clean alternating rows
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureSpecRow } from '@/lib/brochures/brochureTypes';

const s = StyleSheet.create({
  wrapper:     { marginBottom: 14 },
  heading: {
    fontSize:      7,
    fontWeight:    'bold',
    color:         C.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom:  5,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.navy,
  },
  table:   { borderWidth: 0.5, borderColor: C.border },
  row: {
    flexDirection:   'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  rowLast: { flexDirection: 'row' as const },
  rowEven: { backgroundColor: C.rowEven },
  label: {
    width:           '40%',
    backgroundColor: C.rowLabel,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  labelText: {
    fontSize:      7.5,
    color:         C.inkMid,
    fontWeight:    'bold',
    letterSpacing: 0.2,
  },
  value: {
    width:           '60%',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  valueText: { fontSize: 8, color: C.ink },
  // Features list below the table
  features:  { marginTop: 8, marginBottom: 4 },
  featureRow: { flexDirection: 'row' as const, marginBottom: 3 },
  dot: {
    width:  3.5,
    height: 3.5,
    backgroundColor: C.gold,
    marginRight: 6,
    marginTop:   3.5,
    borderRadius: 2,
  },
  featureText: { fontSize: 7.5, color: C.inkDark, lineHeight: 1.4 },
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
              style={[isLast ? s.rowLast : s.row, isEven ? s.rowEven : {}]}
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
        <View style={s.features}>
          {features.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <View style={s.dot} />
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
