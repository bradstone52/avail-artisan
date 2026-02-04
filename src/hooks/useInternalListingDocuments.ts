import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';
import { useState } from 'react';

export interface InternalListingDocument {
  id: string;
  listing_id: string;
  org_id: string | null;
  name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export function useInternalListingDocuments(listingId: string | undefined) {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const query = useQuery({
    queryKey: ['internal_listing_documents', listingId],
    queryFn: async () => {
      if (!listingId) return [];
      
      const { data, error } = await supabase
        .from('internal_listing_documents')
        .select('*')
        .eq('listing_id', listingId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as InternalListingDocument[];
    },
    enabled: !!user && !!listingId,
  });

  const uploadDocument = async (file: File, name: string) => {
    if (!listingId || !user?.id) {
      toast.error('Not authenticated');
      return;
    }

    if (!orgId) {
      toast.error('Organization not found');
      return;
    }

    // Validate file size (15MB max)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('File size must be less than 15MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
      const filePath = `${listingId}/${Date.now()}-${sanitizedName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('internal-listing-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('internal_listing_documents')
        .insert({
          listing_id: listingId,
          org_id: orgId,
          name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type || null,
          uploaded_by: user.id,
        });

      if (dbError) {
        // Clean up uploaded file if db insert fails
        await supabase.storage.from('internal-listing-assets').remove([filePath]);
        throw dbError;
      }

      queryClient.invalidateQueries({ queryKey: ['internal_listing_documents', listingId] });
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (doc: InternalListingDocument) => {
    try {
      // Delete from storage
      await supabase.storage.from('internal-listing-assets').remove([doc.file_path]);

      // Delete from database
      const { error } = await supabase
        .from('internal_listing_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['internal_listing_documents', listingId] });
      toast.success('Document deleted');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getDownloadUrl = async (doc: InternalListingDocument): Promise<string | null> => {
    const { data } = await supabase.storage
      .from('internal-listing-assets')
      .createSignedUrl(doc.file_path, 60); // 60 seconds expiry
    
    return data?.signedUrl || null;
  };

  return {
    documents: query.data || [],
    isLoading: query.isLoading,
    isUploading,
    uploadDocument,
    deleteDocument,
    getDownloadUrl,
  };
}
