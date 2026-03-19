/**
 * SnapshotBand.tsx
 *
 * Key metrics displayed as large typographic values — CBRE/JLL style.
 * White background with hairline borders between cells.
 * NOT a dark navy band — clean and light.
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureSpecRow } from '@/lib/brochures/brochureTypes';

const s = StyleSheet.create({
  band: {
    flexDirection:   'row' as const,
    borderTopWidth:  0.5,
    borderTopColor:  C.border,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    marginBottom:    20,
  },
  cell: {
    flex:             1,
    paddingVertical:  14,
    paddingHorizontal: 12,
    alignItems:       'center' as const,
    borderRightWidth: 0.5,
    borderRightColor: C.border,
  },
  cellLast: {
    flex:             1,
    paddingVertical:  14,
    paddingHorizontal: 12,
    alignItems:       'center' as const,
  },
  value: {
    fontSize:     14,
    fontWeight:   'bold',
    color:        C.navy,
    marginBottom: 3,
  },
  label: {
    fontSize:      6,
    color:         C.inkMid,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    textAlign:     'center' as const,
  },
});

interface SnapshotBandProps { snapshots: BrochureSpecRow[]; }

export function SnapshotBand({ snapshots }: SnapshotBandProps) {
  if (!snapshots.length) return null;
  return (
    <View style={s.band}>
      {snapshots.map((snap, i) => (
        <View key={i} style={i < snapshots.length - 1 ? s.cell : s.cellLast}>
          <Text style={s.value}>{snap.value}</Text>
          <Text style={s.label}>{snap.label}</Text>
        </View>
      ))}
    </View>
  );
}
