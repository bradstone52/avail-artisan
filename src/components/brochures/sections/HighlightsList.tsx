/**
 * HighlightsList.tsx
 *
 * Two-column bullet list with gold square bullets.
 * Navy heading bar consistent with SpecTable / PricingCard.
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';

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
    marginBottom:      10,
  },

  twoCol: { flexDirection: 'row' as const, gap: 20 },
  col:    { flex: 1 },

  bullet: {
    flexDirection: 'row' as const,
    marginBottom:  5.5,
    alignItems:    'flex-start' as const,
    paddingRight:  6,
  },
  square: {
    width:           4,
    height:          4,
    backgroundColor: C.gold,
    marginRight:     7,
    marginTop:       2.5,
    flexShrink:      0,
  },
  text: { flex: 1, fontSize: 8, color: C.inkDark, lineHeight: 1.5 },
});

interface HighlightsListProps {
  highlights: string[];
  title?:     string;
}

export function HighlightsList({ highlights, title = 'Key Highlights' }: HighlightsListProps) {
  if (!highlights.length) return null;
  const left  = highlights.filter((_, i) => i % 2 === 0);
  const right = highlights.filter((_, i) => i % 2 === 1);
  return (
    <View style={s.wrapper}>
      <Text style={s.heading}>{title}</Text>
      <View style={s.twoCol}>
        <View style={s.col}>
          {left.map((h, i) => (
            <View key={i} style={s.bullet}>
              <View style={s.square} />
              <Text style={s.text}>{h}</Text>
            </View>
          ))}
        </View>
        <View style={s.col}>
          {right.map((h, i) => (
            <View key={i} style={s.bullet}>
              <View style={s.square} />
              <Text style={s.text}>{h}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
