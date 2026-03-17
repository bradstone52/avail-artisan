/**
 * SnapshotBand.tsx — Full-width key metrics strip on a dark background
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureSpecRow } from '@/lib/brochures/brochureTypes';

const s = StyleSheet.create({
  band: {
    flexDirection:   'row' as const,
    backgroundColor: C.navy,
    marginBottom:    14,
  },
  cell: {
    flex:             1,
    paddingVertical:  10,
    paddingHorizontal: 10,
    alignItems:       'center' as const,
    borderRightWidth: 0.5,
    borderRightColor: C.navyLight,
  },
  cellLast: {
    flex:             1,
    paddingVertical:  10,
    paddingHorizontal: 10,
    alignItems:       'center' as const,
  },
  label: {
    fontSize:      6,
    color:         '#a0b4c8',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom:  3,
  },
  value: {
    fontSize:   12,
    fontWeight: 'bold',
    color:      C.white,
  },
});

interface SnapshotBandProps { snapshots: BrochureSpecRow[]; }

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
