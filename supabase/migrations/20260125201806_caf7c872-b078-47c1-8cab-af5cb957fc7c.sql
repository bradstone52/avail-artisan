-- Create a function to auto-create property from market listing
CREATE OR REPLACE FUNCTION public.auto_create_property_from_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_address TEXT;
  existing_property_id UUID;
BEGIN
  -- Normalize the address for comparison
  normalized_address := LOWER(TRIM(NEW.address));
  
  -- Check if a property with this address already exists
  SELECT id INTO existing_property_id
  FROM public.properties
  WHERE LOWER(TRIM(address)) = normalized_address
  LIMIT 1;
  
  -- If no property exists, create one
  IF existing_property_id IS NULL THEN
    INSERT INTO public.properties (
      name,
      address,
      city,
      submarket,
      size_sf,
      clear_height_ft,
      dock_doors,
      drive_in_doors,
      property_type,
      created_by
    ) VALUES (
      NEW.address,
      NEW.address,
      COALESCE(NEW.city, ''),
      COALESCE(NEW.submarket, ''),
      NEW.size_sf,
      NEW.clear_height_ft,
      NEW.dock_doors,
      NEW.drive_in_doors,
      NEW.listing_type,
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-creating property on new market listing
DROP TRIGGER IF EXISTS trigger_auto_create_property ON public.market_listings;
CREATE TRIGGER trigger_auto_create_property
  AFTER INSERT ON public.market_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_property_from_listing();

-- Add mill_rate and mill_rate_year to workspace_settings if not exists
INSERT INTO public.workspace_settings (key, value)
VALUES 
  ('mill_rate', '0.02182860'),
  ('mill_rate_year', '2025')
ON CONFLICT (key) DO NOTHING;