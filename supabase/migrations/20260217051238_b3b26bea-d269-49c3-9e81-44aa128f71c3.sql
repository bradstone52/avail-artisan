
-- Add check_type column
ALTER TABLE public.brokerage_update_checks 
ADD COLUMN IF NOT EXISTS check_type text NOT NULL DEFAULT 'brokerage';

-- Drop existing constraint properly
ALTER TABLE public.brokerage_update_checks 
DROP CONSTRAINT IF EXISTS brokerage_update_checks_org_id_brokerage_name_check_month_c_key;

-- Create new unique constraint including check_type
ALTER TABLE public.brokerage_update_checks 
ADD CONSTRAINT brokerage_update_checks_unique_check 
UNIQUE (org_id, brokerage_name, check_month, check_year, check_type);
