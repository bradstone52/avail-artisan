/**
 * ConfidentialBlock.tsx — Broker-only notes panel
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';

const s = StyleSheet.create({
  wrapper: {
    borderWidth:     0.75,
    borderColor:     C.gold,
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
    padding:         10,
    marginTop:       8,
  },
  label: {
    fontSize:      6.5,
    fontWeight:    'bold',
    color:         C.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  4,
  },
  text: { fontSize: 7.5, color: C.inkDark, lineHeight: 1.5 },
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
