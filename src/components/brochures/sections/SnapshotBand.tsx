/**
 * SnapshotBand.tsx — Full-width key-metrics band (coloured strip)
 * Extracted from ListingBrochurePDF.tsx
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureSpecRow } from '@/lib/brochures/brochureTypes';

const s = StyleSheet.create({
  band: {
    flexDirection: 'row' as const,
    backgroundColor: C.accent,
    marginVertical: 12,
  },
  cell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    borderRightWidth: 0.5,
    borderRightColor: '#2a4f7a',
  },
  cellLast: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
  },
  label: {
    fontSize: 6,
    color: C.accentLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  value: { fontSize: 11, fontWeight: 'bold', color: C.white },
});

interface SnapshotBandProps {
  snapshots: BrochureSpecRow[];
}

export function SnapshotBand({ snapshots }: SnapshotBandProps) {
  if (!snapshots.length) return null;
  return (
    <View style={s.band}>
      {snapshots.map((snap, i) => (
        <View key={i} style={i < snapshots.length - 1 ? s.cell : s.cellLast}>
          <Text style={s.label}>{snap.label}</Text>
          <Text style={s.value}>{snap.value}</Text>
        </View>
      ))}
    </View>
  );
}
