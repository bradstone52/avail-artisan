/**
 * PricingCard.tsx — Clean pricing block, bordered not filled
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureData } from '@/lib/brochures/brochureTypes';

const s = StyleSheet.create({
  wrapper:  { marginBottom: 14 },
  heading: {
    fontSize:      7,
    fontWeight:    'bold',
    color:         C.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom:  5,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.navy,
  },
  card: {
    borderWidth:      0.75,
    borderColor:      C.navy,
    borderLeftWidth:  3,
    borderLeftColor:  C.gold,
    paddingVertical:  10,
    paddingHorizontal: 12,
    marginBottom:     6,
    backgroundColor:  C.navyTint,
  },
  cardLabel: {
    fontSize:      6.5,
    color:         C.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom:  3,
  },
  cardValue: {
    fontSize:   18,
    fontWeight: 'bold',
    color:      C.navy,
    lineHeight: 1.1,
  },
  cardSub: {
    fontSize: 7,
    color:    C.inkMid,
    marginTop: 2,
  },
});

interface PricingBlockProps {
  pricing: BrochureData['pricing'];
}

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
