import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str: string): boolean {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

// City of Calgary Open Data API endpoints
const ASSESSMENT_API = 'https://data.calgary.ca/resource/4bsw-nn7w.json'; // Current year property assessments (public)
const PERMITS_API = 'https://data.calgary.ca/resource/c2es-76ed.json';
const PARCEL_API = 'https://data.calgary.ca/resource/4ur7-wsgc.json'; // Historical parcel data with legal descriptions

// 2025 Calgary non-residential mill rate (City + Provincial)
const NON_RESIDENTIAL_MILL_RATE = 0.02182860;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate input
    let body: { propertyId?: unknown; address?: unknown; city?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { propertyId, address, city } = body;

    // Validate propertyId
    if (!propertyId || typeof propertyId !== 'string') {
      return new Response(JSON.stringify({ error: 'Property ID is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!isValidUUID(propertyId)) {
      return new Response(JSON.stringify({ error: 'Property ID must be a valid UUID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate address
    if (!address || typeof address !== 'string') {
      return new Response(JSON.stringify({ error: 'Address is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (address.length > 500) {
      return new Response(JSON.stringify({ error: 'Address exceeds maximum length (500 characters)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate city (optional but must be string if provided)
    if (city !== undefined && city !== null && typeof city !== 'string') {
      return new Response(JSON.stringify({ error: 'City must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const cityStr = typeof city === 'string' ? city : '';
    if (cityStr.length > 100) {
      return new Response(JSON.stringify({ error: 'City exceeds maximum length (100 characters)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Only fetch for Calgary properties
    const isCalgary = cityStr.toLowerCase().includes('calgary');
    if (!isCalgary) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'City data only available for Calgary properties' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch property to check for city_lookup_address override
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('city_lookup_address')
      .eq('id', propertyId)
      .single();

    if (propertyError) {
      console.error('Error fetching property:', propertyError);
      // Continue with the provided address if we can't fetch the property
    }

    // Use city_lookup_address if provided, otherwise fall back to the main address
    const lookupAddress = propertyData?.city_lookup_address?.trim() || address;
    console.log(`Using lookup address: "${lookupAddress}" (city_lookup_address: ${propertyData?.city_lookup_address ? 'set' : 'not set'})`);

    const parseNumber = (value: unknown): number | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      if (typeof value !== 'string') return null;
      const cleaned = value.replace(/[^0-9.-]/g, '');
      if (!cleaned) return null;
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    };

    const firstNonEmpty = (...vals: unknown[]): string | null => {
      for (const v of vals) {
        if (typeof v === 'string' && v.trim().length > 0) return v;
      }
      return null;
    };

    const findFirstMatchingKeyValue = (
      obj: Record<string, unknown>,
      predicate: (k: string, v: unknown) => boolean
    ): unknown => {
      for (const [k, v] of Object.entries(obj)) {
        if (predicate(k, v)) return v;
      }
      return null;
    };

    // Calgary addresses commonly look like: "4639 72 Ave SE" / "4639 72 AV SE" / "4639 72 ST NW"
    // We need a *specific* search to avoid matching the wrong quadrant (SE vs NW).
    const addressParts = lookupAddress
      .replace(/,.*$/, '') // Remove everything after comma
      .replace(/\s+(Calgary|AB|Alberta).*$/i, '') // Remove city/province
      .trim()
      .toUpperCase()
      .split(/\s+/);

    const streetNumber = addressParts[0];

    const QUADRANTS = ['NE', 'NW', 'SE', 'SW'];
    const STREET_TYPES = ['ST', 'STREET', 'AVE', 'AV', 'AVENUE', 'DR', 'DRIVE', 'RD', 'ROAD', 'BLVD', 'BOULEVARD',
      'LN', 'LANE', 'PL', 'PLACE', 'CT', 'COURT', 'WAY', 'CRES', 'CRESCENT', 'TR', 'TRAIL'];

    const addressQuadrant = addressParts.find((p: string) => QUADRANTS.includes(p)) || null;
    const streetTypeRaw = addressParts.find((p: string) => STREET_TYPES.includes(p)) || null;
    const streetTypeAbbrev = streetTypeRaw
      ? (streetTypeRaw === 'AVENUE' ? 'AV' : streetTypeRaw === 'AVE' ? 'AV' : streetTypeRaw === 'LANE' ? 'LN' : streetTypeRaw)
      : null;

    // Many Calgary streets include a number (e.g., "72") right after the street number.
    // Grab the first numeric token after the street number.
    const streetNameNumber = addressParts.slice(1).find((p: string) => /^\d+$/.test(p)) || null;

    // For named streets (like "SMED LN SE"), grab the street name word
    // It's typically the token after the street number that isn't a quadrant, street type, or number
    const streetNameWord = !streetNameNumber 
      ? addressParts.slice(1).find((p: string) => 
          !QUADRANTS.includes(p) && 
          !STREET_TYPES.includes(p) && 
          !/^\d+$/.test(p) &&
          p.length > 0
        ) || null
      : null;

    // Build search patterns from most-specific to least-specific.
    const searchPatterns: string[] = [];
    
    // Handle numbered streets (e.g., "4639 72 AV SE")
    if (streetNumber && streetNameNumber && streetTypeAbbrev && addressQuadrant) {
      searchPatterns.push(`${streetNumber} ${streetNameNumber} ${streetTypeAbbrev} ${addressQuadrant}`);
    }
    if (streetNumber && streetNameNumber && addressQuadrant) {
      searchPatterns.push(`${streetNumber} ${streetNameNumber} ${addressQuadrant}`);
    }
    if (streetNumber && streetNameNumber) {
      searchPatterns.push(`${streetNumber} ${streetNameNumber}`);
    }
    
    // Handle named streets (e.g., "10 SMED LN SE")
    if (streetNumber && streetNameWord && streetTypeAbbrev && addressQuadrant) {
      searchPatterns.push(`${streetNumber} ${streetNameWord} ${streetTypeAbbrev} ${addressQuadrant}`);
    }
    if (streetNumber && streetNameWord && addressQuadrant) {
      searchPatterns.push(`${streetNumber} ${streetNameWord} ${addressQuadrant}`);
    }
    if (streetNumber && streetNameWord) {
      searchPatterns.push(`${streetNumber} ${streetNameWord}`);
    }
    
    // Last resort: just the street number (very broad)
    if (streetNumber && searchPatterns.length === 0) {
      searchPatterns.push(streetNumber);
    }

    const searchAddress = searchPatterns[0];

    console.log(`Fetching city data for lookup address: "${lookupAddress}" (original: "${address}")`);
    console.log(`Search patterns: ${JSON.stringify(searchPatterns)}, quadrant: "${addressQuadrant}"`);

    const calgaryAppToken = Deno.env.get('CALGARY_APP_TOKEN');
    const calgaryFetchHeaders: Record<string, string> = {};
    if (calgaryAppToken) calgaryFetchHeaders['X-App-Token'] = calgaryAppToken;

    // Build proper SoQL query - properly encode the search value to prevent injection
    const buildSoqlUrl = (baseUrl: string, field: string, searchValue: string, extraParams: string = '') => {
      // Escape special characters in the search value
      const escapedValue = searchValue.replace(/'/g, "''").replace(/\\/g, '\\\\');
      const whereClause = `${field} like '%${escapedValue}%'`;
      const params = new URLSearchParams();
      params.set('$where', whereClause);
      params.set('$limit', '50');
      if (extraParams) {
        const extra = new URLSearchParams(extraParams);
        extra.forEach((val, key) => params.set(key, val));
      }
      return `${baseUrl}?${params.toString()}`;
    };

    // Fetch assessment data (try multiple patterns, most-specific first)
    let assessmentData: any = null;
    try {
      for (const pattern of searchPatterns.slice(0, 3)) {
        const assessmentUrl = buildSoqlUrl(ASSESSMENT_API, 'address', pattern, '$limit=10');
        console.log('Assessment URL:', assessmentUrl);
        const assessmentResp = await fetch(assessmentUrl, { headers: calgaryFetchHeaders });
        if (!assessmentResp.ok) {
          console.log('Assessment API error:', assessmentResp.status, await assessmentResp.text());
          continue;
        }

        const data = await assessmentResp.json();
        console.log(`Assessment API returned ${data?.length || 0} results for pattern "${pattern}"`);
        if (!data || data.length === 0) continue;

        // Filter to just this street number
        const candidates = data.filter((d: any) => d.address?.toUpperCase().startsWith(`${streetNumber} `));
        const upperQuadrant = addressQuadrant?.toUpperCase() || null;

        // If we have a quadrant, require it. (Prevents NW/SE mix-ups.)
        const quadrantCandidates = upperQuadrant
          ? candidates.filter((d: any) => d.address?.toUpperCase().includes(` ${upperQuadrant}`))
          : candidates;

        if (!quadrantCandidates.length) {
          // Try next pattern
          continue;
        }

        // Prefer exact street-type match if we have one.
        const upperType = streetTypeAbbrev?.toUpperCase() || null;
        const typeMatch = upperType
          ? quadrantCandidates.find((d: any) => d.address?.toUpperCase().includes(` ${upperType} `))
          : null;

        assessmentData = typeMatch || quadrantCandidates[0] || data[0];
        console.log('Selected assessment data:', assessmentData?.address);
        break;
      }
    } catch (err) {
      console.error('Error fetching assessment data:', err);
    }

    // Fetch building permits
    // IMPORTANT: Only fetch/attach permits when we have an assessment match.
    // Otherwise we risk showing permits for an address format that the assessment dataset
    // can’t resolve (and we want to prompt the user to try a nearby/alternate address).
    const permits: any[] = [];
    if (assessmentData) {
      try {
        const permitsUrl = buildSoqlUrl(PERMITS_API, 'originaladdress', searchAddress, '$order=issueddate DESC');
        console.log('Permits URL:', permitsUrl);
        const permitsResp = await fetch(permitsUrl, { headers: calgaryFetchHeaders });
        if (permitsResp.ok) {
          const data = await permitsResp.json();
          // Filter to only permits that match our street number AND quadrant
          const upperQuadrant = addressQuadrant?.toUpperCase() || null;
          const filtered = (data || []).filter((p: any) => {
            const addr = p.originaladdress?.toUpperCase() || '';
            const startsWithStreetNum = addr.startsWith(streetNumber + ' ');
            // If we have a quadrant, require it to match (prevents NW/SE mix-ups)
            const quadrantMatches = upperQuadrant ? addr.includes(` ${upperQuadrant}`) : true;
            return startsWithStreetNum && quadrantMatches;
          });
          permits.push(...filtered);
          console.log(`Permits API returned ${data?.length || 0} results, filtered to ${permits.length} (quadrant: ${upperQuadrant || 'none'})`);
        } else {
          console.log('Permits API error:', permitsResp.status, await permitsResp.text());
        }
      } catch (err) {
        console.error('Error fetching permits:', err);
      }
    } else {
      console.log('Skipping permits fetch because no assessment match was found.');
    }

    // Fetch parcel data for legal description (if we have a roll number)
    let parcelData: any = null;
    const rollNumber = assessmentData?.roll_number || assessmentData?.rollnumber;
    if (rollNumber) {
      try {
        // Query by roll number for exact match - use parameterized query
        const parcelUrl = `${PARCEL_API}?roll_number=${encodeURIComponent(rollNumber)}&$limit=1&$order=roll_year DESC`;
        console.log('Parcel URL:', parcelUrl);
        const parcelResp = await fetch(parcelUrl, { headers: calgaryFetchHeaders });
        if (parcelResp.ok) {
          const data = await parcelResp.json();
          if (data && data.length > 0) {
            parcelData = data[0];
            console.log('Parcel data keys:', Object.keys(parcelData).slice(0, 30).join(', '));
          }
        }
      } catch (err) {
        console.error('Error fetching parcel data:', err);
      }
    }

    // Note: Land use and community data are included in the assessment dataset (4bsw-nn7w)
    // No separate land use API call needed

    // Update property with fetched data
    const updateData: any = {
      city_data_fetched_at: new Date().toISOString(),
      city_data_raw: {
        assessment: assessmentData,
        parcel: parcelData,
        permits_count: permits.length
      }
    };

    // If we didn't find a valid assessment match, clear previously-derived fields to avoid persisting stale/wrong data.
    if (!assessmentData) {
      updateData.roll_number = null;
      updateData.assessed_value = null;
      updateData.property_tax_annual = null;
      updateData.tax_class = null;
      updateData.legal_description = null;
      updateData.land_use_designation = null;
      updateData.community_name = null;
      updateData.year_built = null;
      updateData.land_acres = null;
    }

    // Map assessment data to property fields (includes land use from same dataset)
    if (assessmentData) {
      // Keep logs small to avoid truncation
      try {
        console.log('Assessment keys:', Object.keys(assessmentData).slice(0, 50).join(', '));
      } catch {
        // ignore
      }

      updateData.roll_number = firstNonEmpty(assessmentData.roll_number, assessmentData.rollnumber);

      // Calgary API sometimes returns numeric fields as strings with commas
      updateData.assessed_value =
        parseNumber(assessmentData.assessed_value) ??
        parseNumber(assessmentData.current_year_total_assessment) ??
        parseNumber(assessmentData.total_assessed) ??
        parseNumber(assessmentData.nr_assessed_value);

      // Annual tax (best-effort; dataset varies)
      updateData.property_tax_annual =
        parseNumber(assessmentData.property_tax_annual) ??
        parseNumber(assessmentData.annual_tax) ??
        parseNumber(assessmentData.tax_annual) ??
        parseNumber(assessmentData.total_tax) ??
        parseNumber(assessmentData.tax_amount) ??
        parseNumber(assessmentData.tax);

      updateData.tax_class = firstNonEmpty(
        assessmentData.tax_class,
        assessmentData.assessment_class,
        assessmentData.class
      );

      // Legal description - try parcel dataset first (most reliable), then assessment data
      updateData.legal_description =
        // First try parcel data (has dedicated legal_description field)
        firstNonEmpty(
          parcelData?.legal_description,
          parcelData?.legal_desc,
          parcelData?.legaldescription
        ) ??
        // Then try assessment data
        firstNonEmpty(
          assessmentData.legal_description,
          assessmentData.legal_desc,
          assessmentData.legaldescription,
          assessmentData.legal_description_1,
          assessmentData.legal
        ) ??
        // Fallback: search for any key containing "legal" in parcel data
        ((): string | null => {
          if (parcelData) {
            const v = findFirstMatchingKeyValue(
              parcelData,
              (k, val) => k.toLowerCase().includes('legal') && typeof val === 'string' && val.trim().length > 0
            );
            if (typeof v === 'string') return v;
          }
          // Then try assessment data
          const v = findFirstMatchingKeyValue(
            assessmentData,
            (k, val) => k.toLowerCase().includes('legal') && typeof val === 'string' && val.trim().length > 0
          );
          return typeof v === 'string' ? v : null;
        })();

      // Land use and community data (field names vary)
      const landUseDesignation = firstNonEmpty(
        assessmentData.land_use_designation,
        assessmentData.landuse,
        assessmentData.land_use
      );
      updateData.land_use_designation = landUseDesignation;
      
      // Also mirror land_use_designation to zoning field for Property Details display
      if (landUseDesignation) {
        updateData.zoning = landUseDesignation;
      }

      const communityName = firstNonEmpty(
        assessmentData.community_name,
        assessmentData.comm_name,
        assessmentData.community
      );
      updateData.community_name = communityName;
      
      // Also set submarket from community_name
      if (communityName) {
        updateData.submarket = communityName;
      }

      // Year built
      const yearBuilt =
        parseNumber(assessmentData.year_of_construction) ??
        parseNumber(assessmentData.year_built) ??
        parseNumber(assessmentData.construction_year) ??
        parseNumber(assessmentData.yearbuilt);
      updateData.year_built = yearBuilt && yearBuilt > 0 ? Math.trunc(yearBuilt) : null;

      // Land size acres
      updateData.land_acres =
        parseNumber(assessmentData.land_size_ac) ??
        parseNumber(assessmentData.land_acres) ??
        parseNumber(assessmentData.landsizeac);
    }

    // Update property
    const { error: updateError } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', propertyId);

    if (updateError) {
      console.error('Error updating property:', updateError);
      throw updateError;
    }

    // Delete existing permits and insert new ones
    await supabase
      .from('property_permits')
      .delete()
      .eq('property_id', propertyId);

    if (permits.length > 0) {
      const permitRecords = permits.map(p => ({
        property_id: propertyId,
        permit_number: p.permitnum || p.permit_number || 'Unknown',
        permit_type: p.permittype || p.permit_type || 'building',
        permit_class: p.permitclass || p.permit_class || null,
        description: p.workclassdescription || p.description || null,
        status: p.statuscurrent || p.status || null,
        applied_date: p.applieddate ? p.applieddate.split('T')[0] : null,
        issued_date: p.issueddate ? p.issueddate.split('T')[0] : null,
        completed_date: p.completeddate ? p.completeddate.split('T')[0] : null,
        estimated_value: p.estprojectcost ? parseFloat(p.estprojectcost) : null,
        contractor_name: p.contractorname || null,
        raw_data: p,
        fetched_at: new Date().toISOString()
      }));

      const { error: permitsError } = await supabase
        .from('property_permits')
        .insert(permitRecords);

      if (permitsError) {
        console.error('Error inserting permits:', permitsError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      assessmentFound: !!assessmentData,
      permitsFound: assessmentData ? permits.length : 0,
      matchStatus: assessmentData ? 'found' : 'not_found',
      propertyId,
      address
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in fetch-city-data:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
