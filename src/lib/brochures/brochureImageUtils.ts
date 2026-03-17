/**
 * brochureImageUtils.ts
 *
 * Async image helpers extracted from MarketingSection.tsx.
 * These are the only async utilities the brochure engine needs before rendering.
 */

/**
 * Fetches any image URL and re-encodes it as a JPEG base64 data URL via canvas.
 * Required because react-pdf cannot handle WebP/AVIF, blob URLs, or CORS-protected URLs.
 * Returns null if the fetch or conversion fails (silently — PDF renders without the image).
 */
export async function toCompatibleBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const bmp  = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width  = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return null;
  }
}

/**
 * Converts an array of BrochurePhotos to JPEG base64 in parallel.
 * Photos that fail conversion are returned unchanged (react-pdf will skip them gracefully).
 */
export async function convertPhotosToBase64<T extends { photo_url: string }>(
  photos: T[]
): Promise<T[]> {
  return Promise.all(
    photos.map(async (photo) => {
      const b64 = await toCompatibleBase64(photo.photo_url);
      return b64 ? { ...photo, photo_url: b64 } : photo;
    })
  );
}
