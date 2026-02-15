
CREATE OR REPLACE FUNCTION public.auto_create_property_from_internal_listing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  normalized_address TEXT;
  existing_property_id UUID;
BEGIN
  normalized_address := LOWER(TRIM(NEW.address));
  
  SELECT id INTO existing_property_id
  FROM public.properties
  WHERE LOWER(TRIM(address)) = normalized_address
  LIMIT 1;
  
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
      NEW.deal_type,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER auto_create_property_on_internal_listing_insert
  AFTER INSERT ON public.internal_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_property_from_internal_listing();
