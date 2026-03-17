/**
 * BrochureHeader.tsx — Slim page header: logo left, deal-type badge right
 */
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import clearviewLogo from '@/assets/clearview-logo.png';
import { C } from '../styles/tokens';

const s = StyleSheet.create({
  bar: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    paddingHorizontal: 40,
    paddingVertical:   9,
    backgroundColor:  C.navy,
  },
  logo: { width: 120, height: 26, objectFit: 'contain' as const },
  badge: {
    fontSize:        7,
    fontWeight:      'bold',
    color:           C.navy,
    backgroundColor: C.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform:   'uppercase',
    letterSpacing:   1.2,
  },
});

interface BrochureHeaderProps { dealTypeLabel: string; }

export function BrochureHeader({ dealTypeLabel }: BrochureHeaderProps) {
  return (
    <View style={s.bar} fixed>
      <Image src={clearviewLogo} style={s.logo} />
      <Text style={s.badge}>{dealTypeLabel}</Text>
    </View>
  );
}
