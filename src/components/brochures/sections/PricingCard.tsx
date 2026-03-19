/**
 * PricingCard.tsx
 *
 * Large typographic pricing display — inspired by CBRE style.
 * Giant display value with small label beneath — very impactful.
 * White background, navy text, no card borders.
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureData } from '@/lib/brochures/brochureTypes';

const s = StyleSheet.create({
  wrapper: { marginBottom: 20 },

  title: {
    fontSize:      9,
    fontWeight:    'bold',
    color:         C.navy,
    marginBottom:  12,
    letterSpacing: 0.2,
  },

  priceBlock: {
    marginBottom: 14,
  },
  priceValue: {
    fontSize:     28,
    fontWeight:   'bold',
    color:        C.navy,
    lineHeight:   1.0,
    marginBottom: 3,
  },
  priceLabel: {
    fontSize:      6.5,
    color:         C.inkMid,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },

  divider: {
    height:          0.5,
    backgroundColor: C.border,
    marginVertical:  10,
  },
});

interface PricingBlockProps { pricing: BrochureData['pricing']; }

export function PricingBlock({ pricing }: PricingBlockProps) {
  if (!pricing.show) return null;
  const hasAny = pricing.rent || pricing.price;
  if (!hasAny) return null;

  return (
    <View style={s.wrapper}>
      <Text style={s.title}>Pricing</Text>

      {pricing.rent && (
        <View style={s.priceBlock}>
          <Text style={s.priceValue}>{pricing.rent}</Text>
          <Text style={s.priceLabel}>Lease Rate (PSF)</Text>
        </View>
      )}

      {pricing.rent && pricing.price && <View style={s.divider} />}

      {pricing.price && (
        <View style={s.priceBlock}>
          <Text style={s.priceValue}>{pricing.price}</Text>
          <Text style={s.priceLabel}>Asking Price</Text>
        </View>
      )}
    </View>
  );
}
