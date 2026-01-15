import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Loader2 } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface CoverImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function CoverImageUpload({ value, onChange }: CoverImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      // Generate unique filename
      const ext = file.name.split('.').pop();
      const filename = `cover-${Date.now()}.${ext}`;

      // Upload to Supabase Storage
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
      <Label>Cover Image (Optional)</Label>
      
      {/* Thumbnail preview - only show if there's an uploaded image */}
      {value && (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border bg-muted">
          <img
            src={imageError ? '' : value}
            alt="Cover preview"
            className="w-full h-full object-cover"
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
          disabled={isUploading}
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
        {!value && (
          <span className="text-xs text-muted-foreground">
            No cover image — section will be hidden
          </span>
        )}
      </div>

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
