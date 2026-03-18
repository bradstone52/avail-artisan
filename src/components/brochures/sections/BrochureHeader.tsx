/**
 * BrochureHeader.tsx
 *
 * Slim header bar: ClearView logo (left) · deal-type label (right).
 * Navy background — appears on every page via `fixed`.
 */
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import clearviewLogo from '@/assets/clearview-logo.png';
import { C } from '../styles/tokens';

const s = StyleSheet.create({
  bar: {
    flexDirection:     'row' as const,
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: 38,
    paddingVertical:   8,
    backgroundColor:   C.navy,
  },
  logo: {
    width:     116,
    height:    24,
    objectFit: 'contain' as const,
  },
  badge: {
    fontSize:          6.5,
    fontWeight:        'bold',
    color:             C.navy,
    backgroundColor:   C.white,
    paddingHorizontal: 9,
    paddingVertical:   4,
    textTransform:     'uppercase' as const,
    letterSpacing:     1.1,
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
