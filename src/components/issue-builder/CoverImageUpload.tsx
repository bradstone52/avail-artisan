import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface CoverImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function CoverImageUpload({ value, onChange }: CoverImageUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [libraryUrls, setLibraryUrls] = useState<string[]>([]);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLibrary = async () => {
    if (!user) return;

    setIsLoadingLibrary(true);
    try {
      // Store per-user images under a user folder: {user.id}/...
      const { data, error } = await supabase.storage
        .from('cover-images')
        .list(user.id, {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      const urls = (data || [])
        .filter((o) => !!o.name)
        .map((o) => {
          const path = `${user.id}/${o.name}`;
          return supabase.storage.from('cover-images').getPublicUrl(path).data.publicUrl;
        });

      // De-dupe while preserving order
      const unique = Array.from(new Set(urls));
      setLibraryUrls(unique);
    } catch (err) {
      console.error('Failed to load cover image library:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    void loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast.error('Please sign in to upload a cover image');
      return;
    }

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WEBP image');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be under 10MB');
      return;
    }

    setIsUploading(true);
    setImageError(false);

    try {
      // Generate unique filename (stored under user folder)
      const ext = file.name.split('.').pop();
      const filename = `${user.id}/cover-${Date.now()}.${ext}`;

      // Upload to Storage
      const { data, error } = await supabase.storage
        .from('cover-images')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('cover-images')
        .getPublicUrl(data.path);

      onChange(urlData.publicUrl);
      toast.success('Cover image uploaded');

      // Refresh library so the upload is selectable in the future
      void loadLibrary();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange(null);
    setImageError(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Cover Image (Optional)</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void loadLibrary()}
          disabled={!user || isLoadingLibrary}
        >
          {isLoadingLibrary ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Refresh
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 mr-2" />
              Library
            </>
          )}
        </Button>
      </div>

      {/* Thumbnail preview - only show if there's an uploaded/selected image */}
      {value && (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border bg-muted">
          <img
            src={imageError ? '' : value}
            alt="Cover preview"
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => {
              if (!imageError) {
                setImageError(true);
                console.error('Cover image failed to load:', value);
              }
            }}
          />
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive text-sm">
              Image failed to load
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !user}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {value ? 'Replace Cover Image' : 'Upload Cover Image'}
            </>
          )}
        </Button>
        {!user ? (
          <span className="text-xs text-muted-foreground">Sign in to upload</span>
        ) : !value ? (
          <span className="text-xs text-muted-foreground">No cover image — section will be hidden</span>
        ) : null}
      </div>

      {/* Cover image library */}
      {user && libraryUrls.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Choose from your previously uploaded images:</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {libraryUrls.slice(0, 18).map((url) => {
              const isSelected = url === value;
              return (
                <button
                  key={url}
                  type="button"
                  className={
                    `relative aspect-square rounded-md overflow-hidden border ${isSelected ? 'ring-2 ring-primary' : 'border-border'} bg-muted`
                  }
                  onClick={() => {
                    setImageError(false);
                    onChange(url);
                  }}
                  aria-label="Select cover image"
                >
                  <img src={url} alt="Cover option" className="w-full h-full object-cover" loading="lazy" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        JPG, PNG, or WEBP. Max 10MB. If no image is uploaded, the cover image section will not appear.
      </p>
    </div>
  );
}
