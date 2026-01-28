import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';

export interface DealDocument {
  id: string;
  deal_id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export function useDealDocuments(dealId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const query = useQuery({
    queryKey: ['deal_documents', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      
      const { data, error } = await supabase
        .from('deal_documents')
        .select('*')
        .eq('deal_id', dealId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as DealDocument[];
    },
    enabled: !!user && !!dealId,
  });

  const uploadDocument = async (file: File, name: string) => {
    if (!dealId || !user?.id) {
      toast.error('Not authenticated');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${dealId}/${Date.now()}-${name}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('deals')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('deal_documents')
        .insert({
          deal_id: dealId,
          name,
          file_path: filePath,
          file_size: file.size,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['deal_documents', dealId] });
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (doc: DealDocument) => {
    try {
      // Delete from storage
      await supabase.storage.from('deals').remove([doc.file_path]);

      // Delete from database
      const { error } = await supabase
        .from('deal_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['deal_documents', dealId] });
      toast.success('Document deleted');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  return {
    documents: query.data || [],
    isLoading: query.isLoading,
    isUploading,
    uploadDocument,
    deleteDocument,
  };
}
