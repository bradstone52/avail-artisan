/**
 * PricingCard.tsx
 *
 * Compact pricing block — navy heading bar + one card per price point.
 * Card: white bg, navy left accent, gold rule, clean value hierarchy.
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureData } from '@/lib/brochures/brochureTypes';

const s = StyleSheet.create({
  wrapper: { marginBottom: 16 },

  heading: {
    fontSize:          6.5,
    fontWeight:        'bold',
    color:             C.white,
    backgroundColor:   C.navy,
    textTransform:     'uppercase' as const,
    letterSpacing:     1.2,
    paddingVertical:   4,
    paddingHorizontal: 7,
    marginBottom:      6,
  },

  card: {
    borderWidth:      0.5,
    borderColor:      C.border,
    borderLeftWidth:  3,
    borderLeftColor:  C.gold,
    paddingVertical:  10,
    paddingHorizontal: 12,
    marginBottom:     6,
    backgroundColor:  C.white,
  },

  cardLabel: {
    fontSize:      6,
    color:         C.inkMid,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.0,
    marginBottom:  4,
  },
  cardValue: {
    fontSize:   20,
    fontWeight: 'bold',
    color:      C.navy,
    lineHeight: 1.0,
  },
  cardSub: {
    fontSize:  6.5,
    color:     C.inkMid,
    marginTop: 3,
  },
});

interface PricingBlockProps { pricing: BrochureData['pricing']; }

export function PricingBlock({ pricing }: PricingBlockProps) {
  if (!pricing.show) return null;
  return (
    <View style={s.wrapper}>
      <Text style={s.heading}>Pricing</Text>
      {pricing.rent && (
        <View style={s.card}>
          <Text style={s.cardLabel}>Asking Rent</Text>
          <Text style={s.cardValue}>{pricing.rent}</Text>
          <Text style={s.cardSub}>Per Square Foot / Annum</Text>
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
