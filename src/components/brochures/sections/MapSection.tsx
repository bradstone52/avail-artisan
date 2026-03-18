/**
 * MapSection.tsx
 *
 * Static map with navy heading bar and light border frame.
 */
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureData } from '@/lib/brochures/brochureTypes';

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
    marginBottom:      0,
  },

  mapImage: {
    width:        '100%',
    height:       180,
    objectFit:    'cover' as const,
    borderWidth:  0.5,
    borderColor:  C.border,
    borderTopWidth: 0,
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
      <Text style={s.heading}>Location</Text>
      <Image src={location.staticMapUrl} style={s.mapImage} />
      <Text style={s.caption}>{location.mapCaption}</Text>
    </View>
  );
}
