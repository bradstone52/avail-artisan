-- Add unique constraint on user_id + listing_id for upsert to work correctly
ALTER TABLE public.listings 
ADD CONSTRAINT listings_user_listing_unique UNIQUE (user_id, listing_id);