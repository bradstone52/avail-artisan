/**
 * MapSection.tsx — Static map image with caption
 * Extracted from ListingBrochurePDF.tsx
 */
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochureData } from '@/lib/brochures/brochureTypes';

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
  mapImage: {
    width: '100%',
    height: 220,
    objectFit: 'cover' as const,
    borderWidth: 0.75,
    borderColor: C.border,
  },
  caption: { fontSize: 6.5, color: C.light, textAlign: 'center' as const, marginTop: 3 },
});

interface MapSectionProps {
  location: BrochureData['location'];
  topSpacing?: number;
}

export function MapSection({ location, topSpacing = 0 }: MapSectionProps) {
  if (!location.staticMapUrl) return null;
  return (
    <View style={{ marginTop: topSpacing }}>
      <Text style={s.sectionTitle}>Location</Text>
      <Image src={location.staticMapUrl} style={s.mapImage} />
      <Text style={s.caption}>{location.mapCaption}</Text>
    </View>
  );
}
