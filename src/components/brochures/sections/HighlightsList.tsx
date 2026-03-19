/**
 * HighlightsList.tsx
 *
 * Property highlights — CBRE/JLL style with "+" prefix bullets.
 * Clean white background, navy title, spaced list items.
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';

const s = StyleSheet.create({
  wrapper: { marginBottom: 20 },

  title: {
    fontSize:     9,
    fontWeight:   'bold',
    color:        C.navy,
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  twoCol: { flexDirection: 'row' as const, gap: 24 },
  col:    { flex: 1 },

  bulletRow: {
    flexDirection: 'row' as const,
    marginBottom:  6,
    alignItems:    'flex-start' as const,
  },
  plus: {
    fontSize:    8,
    fontWeight:  'bold',
    color:       C.navy,
    marginRight: 6,
    lineHeight:  1.4,
  },
  text: {
    flex:       1,
    fontSize:   7.5,
    color:      C.inkDark,
    lineHeight: 1.5,
  },
});

interface HighlightsListProps {
  highlights: string[];
  title?:     string;
}

export function HighlightsList({ highlights, title = 'Property Highlights' }: HighlightsListProps) {
  if (!highlights.length) return null;
  const left  = highlights.filter((_, i) => i % 2 === 0);
  const right = highlights.filter((_, i) => i % 2 === 1);
  return (
    <View style={s.wrapper}>
      <Text style={s.title}>{title}</Text>
      <View style={s.twoCol}>
        <View style={s.col}>
          {left.map((h, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={s.plus}>+</Text>
              <Text style={s.text}>{h}</Text>
            </View>
          ))}
        </View>
        <View style={s.col}>
          {right.map((h, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={s.plus}>+</Text>
              <Text style={s.text}>{h}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
