-- Create function to auto-create property from transaction if none exists
CREATE OR REPLACE FUNCTION public.auto_create_property_from_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

-- Create trigger to run before insert on transactions
DROP TRIGGER IF EXISTS auto_create_property_from_transaction_trigger ON public.transactions;

CREATE TRIGGER auto_create_property_from_transaction_trigger
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_property_from_transaction();