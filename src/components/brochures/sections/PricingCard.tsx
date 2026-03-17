/**
 * PricingCard.tsx — Individual pricing card (asking rent or sale price)
 * Extracted from ListingBrochurePDF.tsx
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureData } from '@/lib/brochures/brochureTypes';

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
  card: {
    backgroundColor: C.accent,
    padding: 10,
    borderRadius: 2,
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 6.5,
    color: C.accentLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardValue: { fontSize: 14, fontWeight: 'bold', color: C.white },
});

interface PricingBlockProps {
  pricing: BrochureData['pricing'];
}

export function PricingBlock({ pricing }: PricingBlockProps) {
  if (!pricing.show) return null;
  return (
    <View>
      <Text style={s.sectionTitle}>Pricing</Text>
      {pricing.rent && (
        <View style={s.card}>
          <Text style={s.cardLabel}>Asking Rent</Text>
          <Text style={s.cardValue}>{pricing.rent}</Text>
        </View>
      )}
      {pricing.price && (
        <View style={s.card}>
          <Text style={s.cardLabel}>Asking Price</Text>
          <Text style={s.cardValue}>{pricing.price}</Text>
        </View>
      )}
    </View>
  );
}
