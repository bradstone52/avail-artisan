-- Add column to store full listing snapshot for undo capability
ALTER TABLE public.transactions
ADD COLUMN market_listing_snapshot JSONB DEFAULT NULL;