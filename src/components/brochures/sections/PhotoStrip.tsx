/**
 * PhotoStrip.tsx — Horizontal strip of up to 3 gallery photos
 */
import { View, Image, StyleSheet } from '@react-pdf/renderer';
import { C } from '../styles/tokens';
import type { BrochurePhoto } from '@/lib/brochures/brochureTypes';

const s = StyleSheet.create({
  strip: {
    flexDirection: 'row' as const,
    gap:           6,
    marginBottom:  12,
  },
  photo: {
    flex:         1,
    height:       120,
    objectFit:    'cover' as const,
    borderWidth:  0.5,
    borderColor:  C.border,
  },
});

interface PhotoStripProps { photos: BrochurePhoto[]; }

export function PhotoStrip({ photos }: PhotoStripProps) {
  if (!photos.length) return null;
  return (
    <View style={s.strip}>
      {photos.slice(0, 3).map((photo, idx) => (
        <Image key={photo.id || idx} src={photo.photo_url} style={s.photo} />
      ))}
    </View>
  );
}
