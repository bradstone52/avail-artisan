import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize2, Building2 } from 'lucide-react';

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
}

interface PublicListingPhotosProps {
  photos: Photo[];
  mainPhotoUrl?: string | null;
  address: string;
}

export function PublicListingPhotos({ photos, mainPhotoUrl, address }: PublicListingPhotosProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Merge main photo + gallery photos (dedup by URL)
  const allPhotos: Photo[] = [];
  if (mainPhotoUrl) {
    allPhotos.push({ id: '__main', photo_url: mainPhotoUrl, caption: null });
  }
  for (const p of photos) {
    if (p.photo_url !== mainPhotoUrl) allPhotos.push(p);
  }

  if (allPhotos.length === 0) {
    return (
      <div className="aspect-[16/9] bg-[hsl(210,40%,96%)] rounded-xl flex flex-col items-center justify-center gap-3 text-[hsl(215,16%,60%)]">
        <Building2 className="w-14 h-14 opacity-20" />
        <p className="text-sm">No photos available for this listing</p>
      </div>
    );
  }

  const prev = () => setLightboxIdx(i => (i! - 1 + allPhotos.length) % allPhotos.length);
  const next = () => setLightboxIdx(i => (i! + 1) % allPhotos.length);

  return (
    <>
      {/* Main photo */}
      <div
        className="aspect-[16/9] rounded-xl overflow-hidden cursor-pointer group relative"
        onClick={() => setLightboxIdx(0)}
      >
        <img
          src={allPhotos[0].photo_url}
          alt={address}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
        </div>
        {allPhotos.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
            1 / {allPhotos.length}
          </span>
        )}
      </div>

      {/* Thumbnail strip */}
      {allPhotos.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {allPhotos.map((photo, idx) => (
            <button
              key={photo.id}
              onClick={() => setLightboxIdx(idx)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                idx === 0 ? 'border-[hsl(38,90%,55%)]' : 'border-transparent hover:border-[hsl(220,13%,70%)]'
              }`}
            >
              <img src={photo.photo_url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 text-white hover:text-[hsl(38,90%,55%)] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <img
            src={allPhotos[lightboxIdx].photo_url}
            alt={allPhotos[lightboxIdx].caption || address}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={e => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIdx + 1} / {allPhotos.length}
            {allPhotos[lightboxIdx].caption && ` · ${allPhotos[lightboxIdx].caption}`}
          </span>
        </div>
      )}
    </>
  );
}
