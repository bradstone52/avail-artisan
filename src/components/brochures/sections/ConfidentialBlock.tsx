/**
 * ConfidentialBlock.tsx
 *
 * Broker-only internal notes panel.
 * Gold left accent + subtle border — visually distinct but not garish.
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';

const s = StyleSheet.create({
  wrapper: {
    borderWidth:      0.5,
    borderColor:      C.border,
    borderLeftWidth:  3,
    borderLeftColor:  C.gold,
    backgroundColor:  '#fefdf6',
    padding:          10,
    marginTop:        10,
  },
  label: {
    fontSize:      6,
    fontWeight:    'bold',
    color:         C.gold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.9,
    marginBottom:  5,
  },
  text: {
    fontSize:   7.5,
    color:      C.inkDark,
    lineHeight: 1.55,
  },
});

interface ConfidentialBlockProps { notes: string; }

export function ConfidentialBlock({ notes }: ConfidentialBlockProps) {
  return (
    <View style={s.wrapper}>
      <Text style={s.label}>Confidential — For Broker Use Only</Text>
      <Text style={s.text}>{notes}</Text>
    </View>
  );
}
