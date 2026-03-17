/**
 * SpecTable.tsx — Property spec table + features box
 * Extracted from ListingBrochurePDF.tsx
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureSpecRow } from '@/lib/brochures/brochureTypes';

const s = StyleSheet.create({
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
  },
  specTable: { borderWidth: 0.75, borderColor: C.border, marginBottom: 12 },
  specRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    minHeight: 18,
  },
  specRowLast: { flexDirection: 'row' as const, minHeight: 18 },
  specLabel: {
    width: '38%',
    backgroundColor: C.tableBg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: 'center' as const,
  },
  specLabelText: {
    fontSize: 7.5,
    color: C.mid,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  specValue: {
    width: '62%',
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: 'center' as const,
  },
  specValueText: { fontSize: 8.5, color: C.black },
  featuresBox: {
    backgroundColor: C.tableBg,
    padding: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
  },
  featureItem: { flexDirection: 'row' as const, marginBottom: 2 },
  featureCheck: { fontSize: 7.5, color: C.accent, marginRight: 5, fontWeight: 'bold' },
  featureText: { fontSize: 7.5, color: C.dark },
});

interface SpecTableProps {
  rows: BrochureSpecRow[];
  features?: string[];
  title?: string;
}

export function SpecTable({ rows, features = [], title = 'Property Details' }: SpecTableProps) {
  if (!rows.length) return null;
  return (
    <View>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.specTable}>
        {rows.map((row, idx) => (
          <View key={idx} style={idx === rows.length - 1 ? s.specRowLast : s.specRow}>
            <View style={s.specLabel}>
              <Text style={s.specLabelText}>{row.label}</Text>
            </View>
            <View style={s.specValue}>
              <Text style={s.specValueText}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>
      {features.length > 0 && (
        <View style={s.featuresBox}>
          {features.map((f, i) => (
            <View key={i} style={s.featureItem}>
              <Text style={s.featureCheck}>✓</Text>
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
