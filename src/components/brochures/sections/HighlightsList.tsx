/**
 * HighlightsList.tsx — Two-column highlights bullets
 * Extracted from ListingBrochurePDF.tsx
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';

const s = StyleSheet.create({
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
  },
  twoCol:  { flexDirection: 'row' as const, gap: 16 },
  col:     { flex: 1 },
  bullet:  { flexDirection: 'row' as const, marginBottom: 5, paddingRight: 20 },
  square:  { width: 5, height: 5, backgroundColor: C.yellow, marginRight: 8, marginTop: 3 },
  text:    { flex: 1, fontSize: 8.5, color: C.dark, lineHeight: 1.45 },
});

interface HighlightsListProps {
  highlights: string[];
  title?: string;
}

export function HighlightsList({ highlights, title = 'Key Highlights' }: HighlightsListProps) {
  if (!highlights.length) return null;
  const left  = highlights.filter((_, i) => i % 2 === 0);
  const right = highlights.filter((_, i) => i % 2 === 1);
  return (
    <View>
      <Text style={s.sectionTitle}>{title}</Text>
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
