-- Create a function to generate the next listing number
CREATE OR REPLACE FUNCTION public.generate_internal_listing_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_year TEXT;
  next_seq INTEGER;
  new_listing_number TEXT;
BEGIN
  -- Get current year
  current_year := to_char(now(), 'YYYY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN listing_number ~ ('^IL-' || current_year || '-[0-9]+$')
      THEN CAST(substring(listing_number from 9) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_seq
  FROM public.internal_listings
  WHERE listing_number LIKE 'IL-' || current_year || '-%';
  
  -- Format: IL-2025-001
  new_listing_number := 'IL-' || current_year || '-' || LPAD(next_seq::TEXT, 3, '0');
  
  NEW.listing_number := new_listing_number;
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-generate listing number on insert
CREATE TRIGGER generate_listing_number_trigger
BEFORE INSERT ON public.internal_listings
FOR EACH ROW
WHEN (NEW.listing_number IS NULL OR NEW.listing_number = '')
EXECUTE FUNCTION public.generate_internal_listing_number();

-- Update existing listings without listing numbers
DO $$
DECLARE
  r RECORD;
  current_year TEXT;
  seq INTEGER := 1;
BEGIN
  current_year := to_char(now(), 'YYYY');
  
  -- Get max existing sequence for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN listing_number ~ ('^IL-' || current_year || '-[0-9]+$')
      THEN CAST(substring(listing_number from 9) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO seq
  FROM public.internal_listings
  WHERE listing_number LIKE 'IL-' || current_year || '-%';
  
  -- Update listings without numbers
  FOR r IN 
    SELECT id FROM public.internal_listings 
    WHERE listing_number IS NULL OR listing_number = ''
    ORDER BY created_at ASC
  LOOP
    UPDATE public.internal_listings 
    SET listing_number = 'IL-' || current_year || '-' || LPAD(seq::TEXT, 3, '0')
    WHERE id = r.id;
    seq := seq + 1;
  END LOOP;
END $$;