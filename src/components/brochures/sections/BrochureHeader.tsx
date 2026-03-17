/**
 * BrochureHeader.tsx — Page header strip (logo + deal type badge)
 * Extracted from ListingBrochurePDF.tsx
 */
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import clearviewLogo from '@/assets/clearview-logo.png';
import { C } from '../styles/tokens';

const s = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 10,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logo: { width: 130, height: 28, objectFit: 'contain' as const },
  badge: {
    fontSize: 8,
    fontWeight: 'bold',
    color: C.white,
    backgroundColor: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});

interface BrochureHeaderProps {
  dealTypeLabel: string;
}

export function BrochureHeader({ dealTypeLabel }: BrochureHeaderProps) {
  return (
    <View style={s.headerBar}>
      <Image src={clearviewLogo} style={s.logo} />
      <Text style={s.badge}>{dealTypeLabel}</Text>
    </View>
  );
}
