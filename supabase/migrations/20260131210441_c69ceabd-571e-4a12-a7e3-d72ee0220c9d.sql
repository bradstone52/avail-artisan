-- Add new lease-related fields to transactions table
ALTER TABLE public.transactions
ADD COLUMN year1_lease_rate_psf numeric,
ADD COLUMN months_net_free_rent integer,
ADD COLUMN months_gross_fixturing integer,
ADD COLUMN ti_allowance_psf numeric,
ADD COLUMN est_op_costs_psf numeric;