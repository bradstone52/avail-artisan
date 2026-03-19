/**
 * BrochureHeader.tsx
 *
 * Slim top header — white background with thin bottom rule.
 * Logo left · deal-type label right (small caps).
 * Matches institutional CRE brokerage style (CBRE/JLL/Colliers).
 */
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import clearviewLogo from '@/assets/clearview-logo.png';
import { C } from '../styles/tokens';

const s = StyleSheet.create({
  bar: {
    flexDirection:     'row' as const,
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: 40,
    paddingVertical:   10,
    backgroundColor:   C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDark,
  },
  logo: {
    width:     110,
    height:    22,
    objectFit: 'contain' as const,
  },
  typeLabel: {
    fontSize:      7,
    fontWeight:    'bold',
    color:         C.inkMid,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.4,
  },
});

interface BrochureHeaderProps { dealTypeLabel: string; }

export function BrochureHeader({ dealTypeLabel }: BrochureHeaderProps) {
  return (
    <View style={s.bar} fixed>
      <Image src={clearviewLogo} style={s.logo} />
      <Text style={s.typeLabel}>{dealTypeLabel}</Text>
    </View>
  );
}
