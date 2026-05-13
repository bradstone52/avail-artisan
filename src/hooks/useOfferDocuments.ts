import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';
import type { OfferDocument } from '@/types/database';

export function useOfferDocuments() {
  const { user } = useAuth();
  const { org } = useOrg();

  return useQuery({
    queryKey: ['offer_documents', org?.id],
    queryFn: async () => {
      if (!org?.id) return [];

      const { data, error } = await supabase
        .from('offer_documents')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OfferDocument[];
    },
    enabled: !!user && !!org?.id,
  });
}

export function useDeleteOfferDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, docxPath }: { id: string; docxPath?: string | null }) => {
      if (docxPath) {
        await supabase.storage.from('offer-documents').remove([docxPath]);
      }

      const { error } = await supabase
        .from('offer_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer_documents'] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      console.error('Error deleting offer document:', error);
      toast.error('Failed to delete document');
    },
  });
}

export function useOfferDocumentSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['offer_document_url', path],
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from('offer-documents')
        .createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 1000 * 60 * 50,
  });
}
