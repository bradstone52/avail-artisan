 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 export interface ListingPhoto {
   id: string;
   listing_id: string;
   org_id: string | null;
   photo_url: string;
   caption: string | null;
   sort_order: number;
   uploaded_at: string;
   uploaded_by: string | null;
 }
 
 export function useInternalListingPhotos(listingId: string) {
   const queryClient = useQueryClient();
 
   const { data: photos = [], isLoading } = useQuery({
     queryKey: ['internal-listing-photos', listingId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('internal_listing_photos')
         .select('*')
         .eq('listing_id', listingId)
         .order('sort_order', { ascending: true });
 
       if (error) throw error;
       return data as ListingPhoto[];
     },
     enabled: !!listingId,
   });
 
   const uploadPhoto = useMutation({
     mutationFn: async ({ file, orgId }: { file: File; orgId: string }) => {
       const fileExt = file.name.split('.').pop();
       const fileName = `${listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
 
       const { error: uploadError } = await supabase.storage
         .from('internal-listing-photos')
         .upload(fileName, file, { upsert: true });
 
       if (uploadError) throw uploadError;
 
       const { data: { publicUrl } } = supabase.storage
         .from('internal-listing-photos')
         .getPublicUrl(fileName);
 
       // Get next sort order
       const maxSort = photos.reduce((max, p) => Math.max(max, p.sort_order), 0);
 
       const { data, error } = await supabase
         .from('internal_listing_photos')
         .insert({
           listing_id: listingId,
           org_id: orgId,
           photo_url: publicUrl,
           sort_order: maxSort + 1,
         })
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['internal-listing-photos', listingId] });
       toast.success('Photo uploaded');
     },
     onError: (error) => {
       console.error('Error uploading photo:', error);
       toast.error('Failed to upload photo');
     },
   });
 
   const deletePhoto = useMutation({
     mutationFn: async (photoId: string) => {
       const { error } = await supabase
         .from('internal_listing_photos')
         .delete()
         .eq('id', photoId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['internal-listing-photos', listingId] });
       toast.success('Photo deleted');
     },
     onError: (error) => {
       console.error('Error deleting photo:', error);
       toast.error('Failed to delete photo');
     },
   });
 
   const updateCaption = useMutation({
     mutationFn: async ({ photoId, caption }: { photoId: string; caption: string }) => {
       const { error } = await supabase
         .from('internal_listing_photos')
         .update({ caption })
         .eq('id', photoId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['internal-listing-photos', listingId] });
     },
   });
 
   return {
     photos,
     isLoading,
     uploadPhoto,
     deletePhoto,
     updateCaption,
   };
 }