/**
 * BrochureFooter.tsx
 *
 * Thin absolute footer: address (left) · disclaimer (right).
 * Rendered on every page via `fixed`.
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';

const s = StyleSheet.create({
  footer: {
    position:       'absolute' as const,
    bottom:         16,
    left:           38,
    right:          38,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop:     5,
    flexDirection:  'row' as const,
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  address:    { fontSize: 6.5, color: C.inkLight },
  disclaimer: {
    fontSize:   5.5,
    color:      C.inkLight,
    textAlign:  'right' as const,
    maxWidth:   '60%',
    lineHeight: 1.45,
  },
});

interface BrochureFooterProps {
  address:    string;
  city:       string;
  disclaimer: string;
}

export function BrochureFooter({ address, city, disclaimer }: BrochureFooterProps) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.address}>{address} · {city}</Text>
      <Text style={s.disclaimer}>{disclaimer}</Text>
    </View>
  );
}
