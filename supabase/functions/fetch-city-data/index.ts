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

    // Extract just the street number for a more flexible search
    // Calgary addresses are formatted like "10 SMED LN SE"
    const addressParts = address
      .replace(/,.*$/, '') // Remove everything after comma
      .replace(/\s+(Calgary|AB|Alberta).*$/i, '') // Remove city/province
      .trim()
      .toUpperCase()
      .split(/\s+/);
    
    // Get street number (first part) and a few keywords from street name
    const streetNumber = addressParts[0];
    // Get the street name without common suffixes/types for flexible matching
    const streetNameParts = addressParts.slice(1).filter(part => 
      !['ST', 'STREET', 'AVE', 'AVENUE', 'DR', 'DRIVE', 'RD', 'ROAD', 'BLVD', 'BOULEVARD', 
       'LN', 'LANE', 'PL', 'PLACE', 'CT', 'COURT', 'WAY', 'CRES', 'CRESCENT', 'TR', 'TRAIL',
       'NE', 'NW', 'SE', 'SW', 'N', 'S', 'E', 'W'].includes(part)
    );
    
    // Use just the street number and main street name for search
    const searchAddress = streetNameParts.length > 0 
      ? `${streetNumber} ${streetNameParts[0]}` 
      : streetNumber;

    console.log(`Fetching city data for address: "${address}"`);
    console.log(`Search pattern: "${searchAddress}"`);

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

    // Fetch assessment data
    let assessmentData: any = null;
    try {
      const assessmentUrl = buildSoqlUrl(ASSESSMENT_API, 'address', searchAddress, '$limit=10');
      console.log('Assessment URL:', assessmentUrl);
      const assessmentResp = await fetch(assessmentUrl);
      if (assessmentResp.ok) {
        const data = await assessmentResp.json();
        console.log(`Assessment API returned ${data?.length || 0} results`);
        if (data && data.length > 0) {
          // Find the best match - prefer exact street number match
          assessmentData = data.find((d: any) => d.address?.startsWith(streetNumber + ' ')) || data[0];
          console.log('Selected assessment data:', assessmentData?.address);
        }
      } else {
        console.log('Assessment API error:', assessmentResp.status, await assessmentResp.text());
      }
    } catch (err) {
      console.error('Error fetching assessment data:', err);
    }

    // Fetch building permits
    const permits: any[] = [];
    try {
      const permitsUrl = buildSoqlUrl(PERMITS_API, 'originaladdress', searchAddress, '$order=issueddate DESC');
      console.log('Permits URL:', permitsUrl);
      const permitsResp = await fetch(permitsUrl);
      if (permitsResp.ok) {
        const data = await permitsResp.json();
        // Filter to only permits that match our street number
        const filtered = (data || []).filter((p: any) => 
          p.originaladdress?.toUpperCase().startsWith(streetNumber + ' ')
        );
        permits.push(...filtered);
        console.log(`Permits API returned ${data?.length || 0} results, filtered to ${permits.length}`);
      } else {
        console.log('Permits API error:', permitsResp.status, await permitsResp.text());
      }
    } catch (err) {
      console.error('Error fetching permits:', err);
    }

    // Fetch parcel data for legal description (if we have a roll number)
    let parcelData: any = null;
    const rollNumber = assessmentData?.roll_number || assessmentData?.rollnumber;
    if (rollNumber) {
      try {
        // Query by roll number for exact match - use parameterized query
        const parcelUrl = `${PARCEL_API}?roll_number=${encodeURIComponent(rollNumber)}&$limit=1&$order=roll_year DESC`;
        console.log('Parcel URL:', parcelUrl);
        const parcelResp = await fetch(parcelUrl);
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
      updateData.land_use_designation = firstNonEmpty(
        assessmentData.land_use_designation,
        assessmentData.landuse,
        assessmentData.land_use
      );
      updateData.community_name = firstNonEmpty(
        assessmentData.community_name,
        assessmentData.comm_name,
        assessmentData.community
      );

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
      permitsFound: permits.length
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
