-- The transaction-creation flow deletes the market_listings row first (atomic lock),
-- so transactions cannot keep a live FK to market_listings.
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_market_listing_id_fkey;