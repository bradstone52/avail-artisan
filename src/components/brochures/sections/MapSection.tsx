/**
 * MapSection.tsx — Static map with heading and caption
 */
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureData } from '@/lib/brochures/brochureTypes';

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
  mapImage: {
    width:        '100%',
    height:       185,
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
      <Text style={s.heading}>Location</Text>
      <Image src={location.staticMapUrl} style={s.mapImage} />
      <Text style={s.caption}>{location.mapCaption}</Text>
    </View>
  );
}
