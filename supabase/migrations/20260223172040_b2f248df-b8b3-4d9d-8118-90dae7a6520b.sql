
CREATE OR REPLACE FUNCTION public.auto_create_property_from_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_address TEXT;
  raw_address TEXT;
  existing_property_id UUID;
BEGIN
  -- If property_id already set (e.g. from deal form dropdown), keep it
  IF NEW.property_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  raw_address := LOWER(TRIM(NEW.address));

  -- Strip common unit/bay suffixes for fuzzy matching
  -- Handles: " - Bay 21", " - Unit 5", " Bay 3", " Suite 100", " Ste 4A", " Unit A", etc.
  base_address := regexp_replace(
    raw_address,
    '\s*[-–]\s*(bay|unit|suite|ste|bldg|building)\s+\S+$', '', 'i'
  );
  -- Also handle without dash: " Bay 21", " Unit 5"
  base_address := regexp_replace(
    base_address,
    '\s+(bay|unit|suite|ste|bldg|building)\s+\S+$', '', 'i'
  );

  -- Try to match on either the base (stripped) address or the full raw address
  SELECT id INTO existing_property_id
  FROM public.properties
  WHERE LOWER(TRIM(address)) = base_address
     OR LOWER(TRIM(address)) = raw_address
  LIMIT 1;

  -- If property exists, link transaction to it
  IF existing_property_id IS NOT NULL THEN
    NEW.property_id := existing_property_id;
  ELSE
    -- Create a new property and link it
    INSERT INTO public.properties (
      name,
      address,
      display_address,
      city,
      submarket,
      size_sf,
      created_by
    ) VALUES (
      COALESCE(NEW.display_address, NEW.address),
      NEW.address,
      NEW.display_address,
      COALESCE(NEW.city, ''),
      COALESCE(NEW.submarket, ''),
      NEW.size_sf,
      NEW.created_by
    )
    RETURNING id INTO NEW.property_id;
  END IF;

  RETURN NEW;
END;
$function$;
