/**
 * HighlightsList.tsx — Two-column bullet list with gold square bullets
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';

const s = StyleSheet.create({
  wrapper: { marginBottom: 14 },
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
  twoCol: { flexDirection: 'row' as const, gap: 18 },
  col:    { flex: 1 },
  bullet: { flexDirection: 'row' as const, marginBottom: 5, paddingRight: 8 },
  square: {
    width:           4.5,
    height:          4.5,
    backgroundColor: C.gold,
    marginRight:     7,
    marginTop:       2.5,
    flexShrink:      0,
  },
  text:   { flex: 1, fontSize: 8, color: C.inkDark, lineHeight: 1.5 },
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
