import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';
import { CityCombobox } from '@/components/common/CityCombobox';
import {
  InternalListing,
  InternalListingFormData,
  INTERNAL_LISTING_STATUSES,
  PROPERTY_TYPES,
  DEAL_TYPES,
  LOADING_TYPES,
} from '@/hooks/useInternalListings';
import { useAgents } from '@/hooks/useAgents';
import { useMillRate } from '@/hooks/useMillRate';
import { useMunicipalMillRate, useUpsertMunicipalMillRate } from '@/hooks/useMunicipalMillRates';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const formSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  display_address: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  submarket: z.string().optional(),
  property_type: z.string().optional(),
  zoning: z.string().optional(),
  size_sf: z.number().optional(),
  warehouse_sf: z.number().optional(),
  office_sf: z.number().optional(),
  second_floor_office_sf: z.number().optional(),
  clear_height_ft: z.number().optional(),
  power: z.string().optional(),
  yard: z.string().optional(),
  loading_type: z.string().optional(),
  dock_doors: z.number().optional(),
  drive_in_doors: z.number().optional(),
  drive_in_door_dimensions: z.array(z.string()).optional(),
  land_acres: z.number().optional(),
  has_land: z.boolean().optional(),
  deal_type: z.string().min(1, 'Deal type is required'),
  asking_rent_psf: z.number().optional(),
  asking_sale_price: z.number().optional(),
  op_costs: z.number().optional(),
  taxes: z.number().optional(),
  cam: z.number().optional(),
  gross_rate: z.number().optional(),
  assessed_value: z.number().optional(),
  estimated_annual_tax: z.number().optional(),
  status: z.string().min(1, 'Status is required'),
  assigned_agent_id: z.string().optional(),
  secondary_agent_id: z.string().optional(),
  owner_name: z.string().optional(),
  owner_contact: z.string().optional(),
  owner_phone: z.string().optional(),
  description: z.string().optional(),
  broker_remarks: z.string().optional(),
  confidential_summary: z.string().optional(),
  brochure_link: z.string().optional(),
  website_link: z.string().optional(),
  additional_features: z.string().optional(),
});

interface InternalListingEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing?: InternalListing | null;
  onSubmit: (data: InternalListingFormData) => void;
  isSubmitting?: boolean;
}

export function InternalListingEditDialog({
  open,
  onOpenChange,
  listing,
  onSubmit,
  isSubmitting,
}: InternalListingEditDialogProps) {
  const { data: allAgents = [] } = useAgents();
  const { rate: calgaryMillRate, year: calgaryMillRateYear } = useMillRate();
  const isEditing = !!listing;
  const [fetchingCityData, setFetchingCityData] = useState(false);
  const [customMillRate, setCustomMillRate] = useState<number | null>(null);
  const [customMillRateYear, setCustomMillRateYear] = useState<number>(new Date().getFullYear());

  // Filter to only show agents from ClearView (the user's own brokerage)
  const agents = allAgents.filter(
    (agent) => agent.brokerage?.name?.toLowerCase().includes('clearview')
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: '',
      display_address: '',
      city: '',
      submarket: '',
      property_type: '',
      zoning: '',
      size_sf: undefined,
      warehouse_sf: undefined,
      office_sf: undefined,
      second_floor_office_sf: undefined,
      clear_height_ft: undefined,
      power: '',
      yard: '',
      loading_type: '',
      dock_doors: undefined,
      drive_in_doors: undefined,
      drive_in_door_dimensions: [],
      land_acres: undefined,
      has_land: false,
      deal_type: 'Lease',
      asking_rent_psf: undefined,
      asking_sale_price: undefined,
      op_costs: undefined,
      taxes: undefined,
      cam: undefined,
      gross_rate: undefined,
      assessed_value: undefined,
      estimated_annual_tax: undefined,
      status: 'Active',
      assigned_agent_id: '',
      secondary_agent_id: '',
      owner_name: '',
      owner_phone: '',
      owner_contact: '',
      description: '',
      broker_remarks: '',
      confidential_summary: '',
      brochure_link: '',
      website_link: '',
      additional_features: '',
    },
  });

  useEffect(() => {
    if (listing) {
      form.reset({
        address: listing.address,
        display_address: listing.display_address || '',
        city: listing.city,
        submarket: listing.submarket || '',
        property_type: listing.property_type || '',
        zoning: listing.zoning || '',
        size_sf: listing.size_sf ?? undefined,
        warehouse_sf: listing.warehouse_sf ?? undefined,
        office_sf: listing.office_sf ?? undefined,
        second_floor_office_sf: listing.second_floor_office_sf ?? undefined,
        clear_height_ft: listing.clear_height_ft ?? undefined,
        power: listing.power || '',
        yard: listing.yard || '',
        loading_type: listing.loading_type || '',
        dock_doors: listing.dock_doors ?? undefined,
        drive_in_doors: listing.drive_in_doors ?? undefined,
        drive_in_door_dimensions: listing.drive_in_door_dimensions || [],
        land_acres: listing.land_acres ?? undefined,
        has_land: listing.has_land ?? false,
        deal_type: listing.deal_type,
        asking_rent_psf: listing.asking_rent_psf ?? undefined,
        asking_sale_price: listing.asking_sale_price ?? undefined,
        op_costs: listing.op_costs ?? undefined,
        taxes: listing.taxes ?? undefined,
        cam: listing.cam ?? undefined,
        gross_rate: listing.gross_rate ?? undefined,
        assessed_value: listing.assessed_value ?? undefined,
        estimated_annual_tax: listing.estimated_annual_tax ?? undefined,
        status: listing.status,
        assigned_agent_id: listing.assigned_agent_id || '',
        secondary_agent_id: listing.secondary_agent_id || '',
        owner_name: listing.owner_name || '',
        owner_contact: listing.owner_contact || '',
        owner_phone: listing.owner_phone || '',
        description: listing.description || '',
        broker_remarks: listing.broker_remarks || '',
        confidential_summary: listing.confidential_summary || '',
        brochure_link: listing.brochure_link || '',
        website_link: listing.website_link || '',
        additional_features: listing.additional_features || '',
      });
    } else {
      form.reset({
        address: '',
        display_address: '',
        city: '',
        submarket: '',
        property_type: '',
        zoning: '',
        size_sf: undefined,
        warehouse_sf: undefined,
        office_sf: undefined,
        second_floor_office_sf: undefined,
        clear_height_ft: undefined,
        power: '',
        yard: '',
        loading_type: '',
        dock_doors: undefined,
        drive_in_doors: undefined,
        drive_in_door_dimensions: [],
        land_acres: undefined,
        has_land: false,
        deal_type: 'Lease',
        asking_rent_psf: undefined,
        asking_sale_price: undefined,
        op_costs: undefined,
        taxes: undefined,
        cam: undefined,
        gross_rate: undefined,
        assessed_value: undefined,
        estimated_annual_tax: undefined,
        status: 'Active',
        assigned_agent_id: '',
        secondary_agent_id: '',
        owner_name: '',
        owner_contact: '',
        owner_phone: '',
        description: '',
        broker_remarks: '',
        confidential_summary: '',
        brochure_link: '',
        website_link: '',
        additional_features: '',
      });
    }
  }, [listing, form]);

  // Watch for asking rent and op costs to auto-calculate gross rate
  const askingRent = form.watch('asking_rent_psf');
  const opCosts = form.watch('op_costs');
  const dealType = form.watch('deal_type');
  const city = form.watch('city');
  const address = form.watch('address');
  const driveInDoors = form.watch('drive_in_doors');
  const driveInDoorDimensions = form.watch('drive_in_door_dimensions') || [];
  const assessedValue = form.watch('assessed_value');

  // Check if this is a Calgary property
  const isCalgary = city?.toLowerCase().includes('calgary');

  // Fetch stored mill rate for non-Calgary municipalities
  const { data: storedMillRate, isLoading: loadingMillRate } = useMunicipalMillRate(
    !isCalgary ? city : null
  );
  const upsertMillRate = useUpsertMunicipalMillRate();

  // Determine which mill rate to use
  const effectiveMillRate = isCalgary ? calgaryMillRate : (customMillRate ?? 0) / 100;
  const effectiveMillRateYear = isCalgary ? calgaryMillRateYear : customMillRateYear;

  // Load stored mill rate when city changes (for non-Calgary)
  useEffect(() => {
    if (!isCalgary && storedMillRate) {
      setCustomMillRate(storedMillRate.mill_rate * 100); // Convert decimal to percentage
      setCustomMillRateYear(storedMillRate.rate_year);
    } else if (!isCalgary && !storedMillRate && !loadingMillRate) {
      // Reset for new municipality
      setCustomMillRate(null);
      setCustomMillRateYear(new Date().getFullYear());
    }
  }, [isCalgary, storedMillRate, loadingMillRate]);

  // Auto-calculate gross rate when asking rent and op costs are both filled
  const calculatedGrossRate = useMemo(() => {
    if (askingRent != null && opCosts != null) {
      return askingRent + opCosts;
    }
    return undefined;
  }, [askingRent, opCosts]);

  // Update gross rate field when calculated value changes
  useEffect(() => {
    if (calculatedGrossRate !== undefined) {
      form.setValue('gross_rate', calculatedGrossRate);
    }
  }, [calculatedGrossRate, form]);

  // Auto-calculate estimated annual tax when assessed value or mill rate changes
  useEffect(() => {
    if (assessedValue != null && assessedValue > 0 && effectiveMillRate > 0) {
      const estimatedTax = assessedValue * effectiveMillRate;
      form.setValue('estimated_annual_tax', Math.round(estimatedTax));
    }
  }, [assessedValue, effectiveMillRate, form]);

  // Save custom mill rate for the municipality
  const handleSaveMillRate = async () => {
    if (!city || isCalgary || customMillRate == null) return;
    
    await upsertMillRate.mutateAsync({
      municipality: city,
      millRate: customMillRate / 100, // Convert percentage to decimal
      rateYear: customMillRateYear,
    });
  };

  // Update drive-in door dimensions array when count changes
  useEffect(() => {
    const count = driveInDoors || 0;
    const currentDimensions = driveInDoorDimensions || [];
    
    if (count > currentDimensions.length) {
      // Add empty slots
      const newDimensions = [...currentDimensions];
      for (let i = currentDimensions.length; i < count; i++) {
        newDimensions.push('');
      }
      form.setValue('drive_in_door_dimensions', newDimensions);
    } else if (count < currentDimensions.length) {
      // Trim excess slots
      form.setValue('drive_in_door_dimensions', currentDimensions.slice(0, count));
    }
  }, [driveInDoors, form]);

  // Fetch Calgary city data for assessed value directly from City of Calgary Open Data API
  const fetchCalgaryData = async () => {
    if (!address || !isCalgary) return;
    
    setFetchingCityData(true);
    try {
      // Parse the address using same logic as fetch-city-data edge function
      const addressParts = address
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
        ? (streetTypeRaw === 'AVENUE' ? 'AV' : streetTypeRaw === 'AVE' ? 'AV' : streetTypeRaw === 'LANE' ? 'LN' : streetTypeRaw === 'STREET' ? 'ST' : streetTypeRaw)
        : null;

      // Many Calgary streets include a number (e.g., "43") right after the street number
      const streetNameNumber = addressParts.slice(1).find((p: string) => /^\d+$/.test(p)) || null;

      // For named streets, grab the street name word
      const streetNameWord = !streetNameNumber 
        ? addressParts.slice(1).find((p: string) => 
            !QUADRANTS.includes(p) && 
            !STREET_TYPES.includes(p) && 
            !/^\d+$/.test(p) &&
            p.length > 0
          ) || null
        : null;

      // Build search patterns from most-specific to least-specific
      const searchPatterns: string[] = [];
      
      // Handle numbered streets (e.g., "4975 43 ST SE")
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
      
      // Last resort: just the street number
      if (streetNumber && searchPatterns.length === 0) {
        searchPatterns.push(streetNumber);
      }

      console.log('Search patterns:', searchPatterns, 'Quadrant:', addressQuadrant);

      // Query City of Calgary Assessment API - try patterns until we get results
      const ASSESSMENT_API = 'https://data.calgary.ca/resource/4bsw-nn7w.json';
      
      let assessmentData: any = null;
      
      for (const pattern of searchPatterns.slice(0, 3)) {
        const escapedValue = pattern.replace(/'/g, "''").replace(/\\/g, '\\\\');
        const whereClause = `address like '%${escapedValue}%'`;
        const params = new URLSearchParams();
        params.set('$where', whereClause);
        params.set('$limit', '50');
        
        console.log('Trying pattern:', pattern);
        
        const response = await fetch(`${ASSESSMENT_API}?${params.toString()}`);
        if (!response.ok) continue;
        
        const data = await response.json();
        console.log(`Pattern "${pattern}" returned ${data?.length || 0} results`);
        
        if (!data || data.length === 0) continue;

        // Filter to just this street number
        const candidates = data.filter((d: any) => d.address?.toUpperCase().startsWith(`${streetNumber} `));
        
        // If we have a quadrant, require it (prevents NW/SE mix-ups)
        const quadrantCandidates = addressQuadrant
          ? candidates.filter((d: any) => d.address?.toUpperCase().includes(` ${addressQuadrant}`))
          : candidates;

        if (!quadrantCandidates.length) continue;

        // Prefer exact street-type match if we have one
        const typeMatch = streetTypeAbbrev
          ? quadrantCandidates.find((d: any) => d.address?.toUpperCase().includes(` ${streetTypeAbbrev} `))
          : null;

        assessmentData = typeMatch || quadrantCandidates[0] || data[0];
        console.log('Selected assessment:', assessmentData?.address);
        console.log('Assessment fields:', Object.keys(assessmentData).join(', '));
        console.log('Assessment data:', JSON.stringify(assessmentData, null, 2));
        break;
      }
      
      if (!assessmentData) {
        toast.error('No assessment data found for this address');
        return;
      }

      // Parse the assessed value - Calgary API returns values as strings like "8720000.0"
      const rawValue = assessmentData.assessed_value || 
                       assessmentData.current_assessed_value || 
                       assessmentData.nr_assessed_value ||
                       assessmentData.current_year_total_assessment || 
                       assessmentData.total_assessed;
      
      console.log('Raw assessment value:', rawValue, typeof rawValue);
      
      // Use parseFloat to handle decimal strings like "8720000.0", then round to integer
      const assessedValue = typeof rawValue === 'number' 
        ? Math.round(rawValue) 
        : Math.round(parseFloat(String(rawValue).replace(/[^0-9.]/g, '')));
      
      if (assessedValue && !isNaN(assessedValue)) {
        form.setValue('assessed_value', assessedValue);
        toast.success(`City data fetched: ${assessmentData.address} - $${assessedValue.toLocaleString()}`);
      } else {
        toast.error('Assessment value not found in city data');
      }
    } catch (err) {
      console.error('Error fetching city data:', err);
      toast.error('Failed to fetch city data');
    } finally {
      setFetchingCityData(false);
    }
  };

  // Update a single door dimension
  const updateDoorDimension = (index: number, value: string) => {
    const current = form.getValues('drive_in_door_dimensions') || [];
    const updated = [...current];
    updated[index] = value;
    form.setValue('drive_in_door_dimensions', updated);
  };

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    const cleanedData: InternalListingFormData = {
      address: data.address,
      city: data.city,
      deal_type: data.deal_type,
      status: data.status,
      submarket: data.submarket || '',
      display_address: data.display_address,
      property_type: data.property_type,
      zoning: data.zoning,
      size_sf: data.size_sf,
      warehouse_sf: data.warehouse_sf,
      office_sf: data.office_sf,
      second_floor_office_sf: data.second_floor_office_sf,
      clear_height_ft: data.clear_height_ft,
      power: data.power,
      yard: data.yard,
      loading_type: data.loading_type,
      dock_doors: data.dock_doors,
      drive_in_doors: data.drive_in_doors,
      drive_in_door_dimensions: data.drive_in_door_dimensions?.filter(d => d.trim() !== ''),
      land_acres: data.land_acres,
      has_land: data.has_land,
      asking_rent_psf: data.asking_rent_psf,
      asking_sale_price: data.asking_sale_price,
      op_costs: data.op_costs,
      taxes: data.taxes,
      cam: data.cam,
      gross_rate: data.gross_rate,
      assessed_value: data.assessed_value,
      estimated_annual_tax: data.estimated_annual_tax,
      assigned_agent_id: data.assigned_agent_id || undefined,
      secondary_agent_id: data.secondary_agent_id || undefined,
      owner_name: data.owner_name,
      owner_contact: data.owner_contact,
      owner_phone: data.owner_phone,
      description: data.description,
      broker_remarks: data.broker_remarks,
      confidential_summary: data.confidential_summary,
      brochure_link: data.brochure_link,
      website_link: data.website_link,
      additional_features: data.additional_features,
    };
    onSubmit(cleanedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Edit Listing' : 'New Internal Listing'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="property" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="property" className="flex-1">Property</TabsTrigger>
                <TabsTrigger value="financial" className="flex-1">Financial</TabsTrigger>
                <TabsTrigger value="assignment" className="flex-1">Assignment</TabsTrigger>
                <TabsTrigger value="marketing" className="flex-1">Marketing</TabsTrigger>
              </TabsList>

              <TabsContent value="property" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 Industrial Way" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="display_address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Display Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Optional marketing-friendly address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <CityCombobox
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="submarket"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Submarket</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="SE Industrial" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="property_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROPERTY_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zoning"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zoning</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="I-G" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="size_sf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Size (SF)</FormLabel>
                        <FormControl>
                          <FormattedNumberInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="50,000"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warehouse_sf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warehouse (SF)</FormLabel>
                        <FormControl>
                          <FormattedNumberInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="45,000"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="office_sf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Office (SF)</FormLabel>
                        <FormControl>
                          <FormattedNumberInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="5,000"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="second_floor_office_sf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Second Floor Office (SF)</FormLabel>
                        <FormControl>
                          <FormattedNumberInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="2,500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clear_height_ft"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clear Height (ft)</FormLabel>
                        <FormControl>
                          <FormattedNumberInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="28"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="loading_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loading Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LOADING_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dock_doors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dock Doors</FormLabel>
                        <FormControl>
                          <FormattedNumberInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="4"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="drive_in_doors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drive-In Doors</FormLabel>
                        <FormControl>
                          <FormattedNumberInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dynamic drive-in door dimensions */}
                  {(driveInDoors ?? 0) > 0 && (
                    <div className="col-span-2 space-y-3 p-4 border rounded-lg bg-muted/30">
                      <FormLabel className="text-sm font-medium">
                        Drive-In Door Dimensions
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Enter dimensions for each drive-in door (e.g., 12' x 14')
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Array.from({ length: driveInDoors || 0 }).map((_, index) => (
                          <div key={index} className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              Door {index + 1}
                            </label>
                            <Input
                              value={driveInDoorDimensions[index] || ''}
                              onChange={(e) => updateDoorDimension(index, e.target.value)}
                              placeholder="12' x 14'"
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="power"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Power</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="600A / 600V" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="yard"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yard</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Fenced, 2 acres" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="land_acres"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Land (acres)</FormLabel>
                        <FormControl>
                          <FormattedNumberInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="5.5"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Features section */}
                  <div className="col-span-2">
                    <FormLabel className="text-sm font-medium mb-3 block">Features</FormLabel>
                    <div className="flex flex-wrap gap-4">
                      <FormField
                        control={form.control}
                        name="has_land"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">Land</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Additional Features */}
                  <FormField
                    control={form.control}
                    name="additional_features"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Additional Features</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="e.g., ESFR sprinklers, LED lighting, heated warehouse, rail access..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deal_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deal Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DEAL_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INTERNAL_LISTING_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(dealType === 'Lease' || dealType === 'Both') && (
                    <FormField
                      control={form.control}
                      name="asking_rent_psf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asking Rent ($/SF)</FormLabel>
                          <FormControl>
                            <FormattedNumberInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="12.50"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {(dealType === 'Sale' || dealType === 'Both') && (
                    <FormField
                      control={form.control}
                      name="asking_sale_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asking Sale Price ($)</FormLabel>
                          <FormControl>
                            <FormattedNumberInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="5,000,000"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Op Costs, Gross Rate row - only show for Lease/Both */}
                  {(dealType === 'Lease' || dealType === 'Both') && (
                    <>
                      <FormField
                        control={form.control}
                        name="op_costs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operating Costs ($/SF)</FormLabel>
                            <FormControl>
                              <FormattedNumberInput
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="4.50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gross_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gross Rate ($/SF)</FormLabel>
                            <FormControl>
                              <FormattedNumberInput
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Auto-calculated"
                                disabled={askingRent != null && opCosts != null}
                              />
                            </FormControl>
                            {askingRent != null && opCosts != null && (
                              <p className="text-xs text-muted-foreground">
                                Auto-calculated: Asking + Op Costs
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="taxes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taxes ($/SF)</FormLabel>
                        <FormControl>
                          <FormattedNumberInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="2.25"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cam"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CAM ($/SF)</FormLabel>
                        <FormControl>
                          <FormattedNumberInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="1.75"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Assessment & Tax Section */}
                  <div className="col-span-2 border-t pt-4 mt-2">
                    <h4 className="text-sm font-semibold mb-3">Assessment & Tax</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="assessed_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assessed Value ($)</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <FormattedNumberInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="5,000,000"
                                  prefix="$"
                                />
                              </FormControl>
                              {isCalgary && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={fetchCalgaryData}
                                  disabled={fetchingCityData || !address}
                                  className="whitespace-nowrap"
                                >
                                  {fetchingCityData ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Fetch'
                                  )}
                                </Button>
                              )}
                            </div>
                            {isCalgary && (
                              <p className="text-xs text-muted-foreground">
                                Click "Fetch" to pull from City of Calgary
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="estimated_annual_tax"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Est. Annual Tax ($)</FormLabel>
                            <FormControl>
                              <FormattedNumberInput
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Auto-calculated"
                                prefix="$"
                                disabled={assessedValue != null && effectiveMillRate > 0}
                              />
                            </FormControl>
                            {assessedValue != null && effectiveMillRate > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Auto-calculated using {effectiveMillRateYear} mill rate ({(effectiveMillRate * 100).toFixed(4)}%)
                              </p>
                            )}
                            {!isCalgary && (!customMillRate || customMillRate === 0) && (
                              <p className="text-xs text-muted-foreground">
                                Enter mill rate below to auto-calculate
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Non-Calgary Mill Rate Inputs */}
                    {!isCalgary && (
                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-dashed">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Mill Rate (%)</label>
                          <FormattedNumberInput
                            value={customMillRate}
                            onChange={(val) => setCustomMillRate(val)}
                            placeholder="e.g. 2.18"
                            suffix="%"
                          />
                          <p className="text-xs text-muted-foreground">
                            {storedMillRate ? `Stored rate for ${city}` : 'Enter municipality mill rate'}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Rate Year</label>
                          <Input
                            type="number"
                            value={customMillRateYear}
                            onChange={(e) => setCustomMillRateYear(parseInt(e.target.value) || new Date().getFullYear())}
                            min={2020}
                            max={2030}
                            className={customMillRateYear ? 'input-filled' : ''}
                          />
                        </div>
                        <div className="space-y-2 flex flex-col justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSaveMillRate}
                            disabled={!customMillRate || upsertMillRate.isPending}
                            className="w-full"
                          >
                            {upsertMillRate.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Rate
                          </Button>
                          <p className="text-xs text-muted-foreground text-center">
                            Save for future {city} listings
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="assignment" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assigned_agent_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Agent</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)} 
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Unassigned</SelectItem>
                            {agents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondary_agent_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Agent</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)} 
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {agents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="owner_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner/Landlord Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ABC Properties Inc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="owner_contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Email</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="john@abcproperties.com" type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="owner_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(403) 555-1234" type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="marketing" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brochure_link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brochure Link</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." type="url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website_link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website Link</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." type="url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Public Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Marketing description for brochures and listings..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="broker_remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broker Remarks</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Internal notes for other brokers..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confidential_summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confidential Summary</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Confidential notes (not shared externally)..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Listing'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
