import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchCityDataRequest {
  propertyId: string;
  address: string;
  city: string;
}

// City of Calgary Open Data API endpoints
const ASSESSMENT_API = 'https://data.calgary.ca/resource/6zp6-pxei.json';
const PERMITS_API = 'https://data.calgary.ca/resource/c2es-76ed.json';
const LAND_USE_API = 'https://data.calgary.ca/resource/qe6k-p9nh.json';

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

    const { propertyId, address, city } = await req.json() as FetchCityDataRequest;

    if (!propertyId || !address) {
      return new Response(JSON.stringify({ error: 'Property ID and address are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Only fetch for Calgary properties
    const isCalgary = city?.toLowerCase().includes('calgary');
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

    // Build proper SoQL query
    const buildSoqlUrl = (baseUrl: string, field: string, searchValue: string, extraParams: string = '') => {
      const whereClause = `${field} like '%${searchValue}%'`;
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

    // Fetch land use data
    let landUseData: any = null;
    try {
      const landUseUrl = buildSoqlUrl(LAND_USE_API, 'address', searchAddress, '$limit=10');
      console.log('Land use URL:', landUseUrl);
      const landUseResp = await fetch(landUseUrl);
      if (landUseResp.ok) {
        const data = await landUseResp.json();
        console.log(`Land use API returned ${data?.length || 0} results`);
        if (data && data.length > 0) {
          // Find best match
          landUseData = data.find((d: any) => d.address?.startsWith(streetNumber + ' ')) || data[0];
          console.log('Selected land use data:', landUseData?.address);
        }
      } else {
        console.log('Land use API error:', landUseResp.status, await landUseResp.text());
      }
    } catch (err) {
      console.error('Error fetching land use data:', err);
    }

    // Update property with fetched data
    const updateData: any = {
      city_data_fetched_at: new Date().toISOString(),
      city_data_raw: {
        assessment: assessmentData,
        land_use: landUseData,
        permits_count: permits.length
      }
    };

    // Map assessment data to property fields
    if (assessmentData) {
      updateData.roll_number = assessmentData.roll_number || assessmentData.rollnumber || null;
      updateData.assessed_land_value = assessmentData.assessed_land_value ? parseFloat(assessmentData.assessed_land_value) : null;
      updateData.assessed_improvement_value = assessmentData.assessed_improvement_value ? parseFloat(assessmentData.assessed_improvement_value) : null;
      updateData.assessed_value = assessmentData.current_year_total_assessment 
        ? parseFloat(assessmentData.current_year_total_assessment)
        : (updateData.assessed_land_value || 0) + (updateData.assessed_improvement_value || 0) || null;
      updateData.tax_class = assessmentData.tax_class || assessmentData.assessment_class || null;
      updateData.legal_description = assessmentData.legal_description || null;
    }

    // Map land use data
    if (landUseData) {
      updateData.land_use_designation = landUseData.land_use_designation || landUseData.landusedes || null;
      updateData.community_name = landUseData.community_name || landUseData.comm_name || null;
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
      landUseFound: !!landUseData,
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
