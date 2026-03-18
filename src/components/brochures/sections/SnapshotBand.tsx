/**
 * SnapshotBand.tsx — Full-width key metrics strip
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureSpecRow } from '@/lib/brochures/brochureTypes';

const s = StyleSheet.create({
  band: {
    flexDirection:   'row' as const,
    backgroundColor: C.navy,
    marginBottom:    16,
  },
  cell: {
    flex:             1,
    paddingVertical:  11,
    paddingHorizontal: 10,
    alignItems:       'center' as const,
    borderRightWidth: 0.5,
    borderRightColor: C.navyMid,
  },
  cellLast: {
    flex:             1,
    paddingVertical:  11,
    paddingHorizontal: 10,
    alignItems:       'center' as const,
  },
  label: {
    fontSize:      5.5,
    color:         '#8fb3cc',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.9,
    marginBottom:  4,
  },
  value: {
    fontSize:   13,
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
