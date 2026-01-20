-- Create transactions table for sold/leased property records
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  
  -- Link to original listing (nullable for deals entered directly)
  market_listing_id UUID REFERENCES public.market_listings(id) ON DELETE SET NULL,
  
  -- Property details (copied from listing or entered directly)
  listing_id TEXT, -- Original listing ID reference
  address TEXT NOT NULL,
  display_address TEXT,
  city TEXT NOT NULL DEFAULT '',
  submarket TEXT NOT NULL DEFAULT '',
  size_sf INTEGER NOT NULL DEFAULT 0,
  
  -- Transaction type
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Sale', 'Lease', 'Sublease')),
  
  -- Transaction details
  transaction_date DATE,
  closing_date DATE,
  
  -- Pricing
  sale_price NUMERIC,
  lease_rate_psf NUMERIC,
  lease_term_months INTEGER,
  
  -- Parties involved
  buyer_tenant_name TEXT,
  buyer_tenant_company TEXT,
  seller_landlord_name TEXT,
  seller_landlord_company TEXT,
  
  -- Broker details
  listing_broker_name TEXT,
  listing_broker_company TEXT,
  selling_broker_name TEXT,
  selling_broker_company TEXT,
  
  -- Commission
  commission_percent NUMERIC,
  commission_amount NUMERIC,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for org members
CREATE POLICY "Org members can view transactions"
ON public.transactions FOR SELECT
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert transactions"
ON public.transactions FOR INSERT
WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update transactions"
ON public.transactions FOR UPDATE
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete transactions"
ON public.transactions FOR DELETE
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- Trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_transactions_org_id ON public.transactions(org_id);
CREATE INDEX idx_transactions_transaction_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_transaction_date ON public.transactions(transaction_date DESC);