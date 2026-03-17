/**
 * ConfidentialBlock.tsx — Amber "Confidential – Broker Notes" box
 * Extracted from ListingBrochurePDF.tsx
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';

const s = StyleSheet.create({
  box: {
    backgroundColor: '#fef3c7',
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: C.yellow,
  },
  title: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text: { fontSize: 7.5, color: '#78350f', lineHeight: 1.4 },
});

interface ConfidentialBlockProps {
  notes: string;
}

export function ConfidentialBlock({ notes }: ConfidentialBlockProps) {
  return (
    <View style={s.box}>
      <Text style={s.title}>Confidential — Broker Notes</Text>
      <Text style={s.text}>{notes}</Text>
    </View>
  );
}
