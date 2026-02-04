import { useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';
import {
  InternalListing,
  InternalListingFormData,
  INTERNAL_LISTING_STATUSES,
  PROPERTY_TYPES,
  DEAL_TYPES,
  LOADING_TYPES,
} from '@/hooks/useInternalListings';
import { useAgents } from '@/hooks/useAgents';

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
  clear_height_ft: z.number().optional(),
  power: z.string().optional(),
  yard: z.string().optional(),
  loading_type: z.string().optional(),
  dock_doors: z.number().optional(),
  drive_in_doors: z.number().optional(),
  land_acres: z.number().optional(),
  deal_type: z.string().min(1, 'Deal type is required'),
  asking_rent_psf: z.number().optional(),
  asking_sale_price: z.number().optional(),
  op_costs: z.number().optional(),
  taxes: z.number().optional(),
  cam: z.number().optional(),
  status: z.string().min(1, 'Status is required'),
  assigned_agent_id: z.string().optional(),
  secondary_agent_id: z.string().optional(),
  owner_name: z.string().optional(),
  owner_contact: z.string().optional(),
  description: z.string().optional(),
  broker_remarks: z.string().optional(),
  confidential_summary: z.string().optional(),
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
  const isEditing = !!listing;

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
      clear_height_ft: undefined,
      power: '',
      yard: '',
      loading_type: '',
      dock_doors: undefined,
      drive_in_doors: undefined,
      land_acres: undefined,
      deal_type: 'Lease',
      asking_rent_psf: undefined,
      asking_sale_price: undefined,
      op_costs: undefined,
      taxes: undefined,
      cam: undefined,
      status: 'Active',
      assigned_agent_id: '',
      secondary_agent_id: '',
      owner_name: '',
      owner_contact: '',
      description: '',
      broker_remarks: '',
      confidential_summary: '',
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
        clear_height_ft: listing.clear_height_ft ?? undefined,
        power: listing.power || '',
        yard: listing.yard || '',
        loading_type: listing.loading_type || '',
        dock_doors: listing.dock_doors ?? undefined,
        drive_in_doors: listing.drive_in_doors ?? undefined,
        land_acres: listing.land_acres ?? undefined,
        deal_type: listing.deal_type,
        asking_rent_psf: listing.asking_rent_psf ?? undefined,
        asking_sale_price: listing.asking_sale_price ?? undefined,
        op_costs: listing.op_costs ?? undefined,
        taxes: listing.taxes ?? undefined,
        cam: listing.cam ?? undefined,
        status: listing.status,
        assigned_agent_id: listing.assigned_agent_id || '',
        secondary_agent_id: listing.secondary_agent_id || '',
        owner_name: listing.owner_name || '',
        owner_contact: listing.owner_contact || '',
        description: listing.description || '',
        broker_remarks: listing.broker_remarks || '',
        confidential_summary: listing.confidential_summary || '',
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
        clear_height_ft: undefined,
        power: '',
        yard: '',
        loading_type: '',
        dock_doors: undefined,
        drive_in_doors: undefined,
        land_acres: undefined,
        deal_type: 'Lease',
        asking_rent_psf: undefined,
        asking_sale_price: undefined,
        op_costs: undefined,
        taxes: undefined,
        cam: undefined,
        status: 'Active',
        assigned_agent_id: '',
        secondary_agent_id: '',
        owner_name: '',
        owner_contact: '',
        description: '',
        broker_remarks: '',
        confidential_summary: '',
      });
    }
  }, [listing, form]);

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
      clear_height_ft: data.clear_height_ft,
      power: data.power,
      yard: data.yard,
      loading_type: data.loading_type,
      dock_doors: data.dock_doors,
      drive_in_doors: data.drive_in_doors,
      land_acres: data.land_acres,
      asking_rent_psf: data.asking_rent_psf,
      asking_sale_price: data.asking_sale_price,
      op_costs: data.op_costs,
      taxes: data.taxes,
      cam: data.cam,
      assigned_agent_id: data.assigned_agent_id || undefined,
      secondary_agent_id: data.secondary_agent_id || undefined,
      owner_name: data.owner_name,
      owner_contact: data.owner_contact,
      description: data.description,
      broker_remarks: data.broker_remarks,
      confidential_summary: data.confidential_summary,
    };
    onSubmit(cleanedData);
  };

  const dealType = form.watch('deal_type');

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
                          <Input {...field} placeholder="Calgary" />
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
                        <FormLabel>Owner Contact</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="john@abcproperties.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="marketing" className="space-y-4 mt-4">
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
