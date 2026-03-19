/**
 * MapSection.tsx
 *
 * Static map with navy bold title — clean, no colored bars.
 * Matches institutional CRE brokerage style.
 */
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureData } from '@/lib/brochures/brochureTypes';

const s = StyleSheet.create({
  wrapper: { marginBottom: 16 },

  title: {
    fontSize:     9,
    fontWeight:   'bold',
    color:        C.navy,
    marginBottom: 6,
    letterSpacing: 0.2,
  },

  mapImage: {
    width:        '100%',
    height:       170,
    objectFit:    'cover' as const,
    borderWidth:  0.5,
    borderColor:  C.border,
  },

  caption: {
    fontSize:  6,
    color:     C.inkLight,
    textAlign: 'center' as const,
    marginTop: 3,
  },
});

interface MapSectionProps {
  location:    BrochureData['location'];
  topSpacing?: number;
}

export function MapSection({ location, topSpacing = 0 }: MapSectionProps) {
  if (!location.staticMapUrl) return null;
  return (
    <View style={[s.wrapper, { marginTop: topSpacing }]}>
      <Text style={s.title}>Location</Text>
      <Image src={location.staticMapUrl} style={s.mapImage} />
      {location.mapCaption ? (
        <Text style={s.caption}>{location.mapCaption}</Text>
      ) : null}
    </View>
  );
}
