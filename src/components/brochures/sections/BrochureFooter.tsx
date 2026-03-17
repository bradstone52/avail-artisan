/**
 * BrochureFooter.tsx — Page footer (address + disclaimer)
 * Extracted from ListingBrochurePDF.tsx
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';

const s = StyleSheet.create({
  footer: {
    position: 'absolute' as const,
    bottom: 14,
    left: 36,
    right: 36,
    borderTopWidth: 0.75,
    borderTopColor: C.border,
    paddingTop: 5,
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  left: { fontSize: 6.5, color: C.light },
  disclaimer: {
    fontSize: 5,
    color: C.light,
    textAlign: 'right' as const,
    maxWidth: '65%',
    lineHeight: 1.3,
  },
});

interface BrochureFooterProps {
  address: string;
  city: string;
  disclaimer: string;
}

export function BrochureFooter({ address, city, disclaimer }: BrochureFooterProps) {
  return (
    <View style={s.footer}>
      <Text style={s.left}>{address}, {city}</Text>
      <Text style={s.disclaimer}>{disclaimer}</Text>
    </View>
  );
}
