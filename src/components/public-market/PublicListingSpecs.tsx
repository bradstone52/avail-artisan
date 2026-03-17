import { CheckCircle2, XCircle, Minus } from 'lucide-react';
import { PublicListing } from '@/hooks/usePublicListings';
import { formatNumber } from '@/lib/format';

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-[hsl(220,13%,91%)] last:border-0">
      <span className="text-sm text-[hsl(215,16%,47%)]">{label}</span>
      <span className="text-sm font-medium text-[hsl(222,47%,11%)] text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function BoolSpec({ label, value }: { label: string; value: boolean | null | undefined }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center gap-2 py-1.5">
      {value ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-[hsl(215,16%,75%)] flex-shrink-0" />
      )}
      <span className={`text-sm ${value ? 'text-[hsl(222,47%,11%)]' : 'text-[hsl(215,16%,60%)]'}`}>{label}</span>
    </div>
  );
}

interface PublicListingSpecsProps {
  listing: PublicListing;
}

export function PublicListingSpecs({ listing }: PublicListingSpecsProps) {
  return (
    <div className="space-y-6">
      {/* Size breakdown */}
      <div>
        <h4 className="text-xs font-semibold text-[hsl(215,16%,47%)] uppercase tracking-wider mb-1">Size</h4>
        <div>
          <SpecRow label="Total Size" value={listing.size_sf ? `${formatNumber(listing.size_sf)} SF` : null} />
          <SpecRow label="Warehouse" value={listing.warehouse_sf ? `${formatNumber(listing.warehouse_sf)} SF` : null} />
          <SpecRow label="Office" value={listing.office_sf ? `${formatNumber(listing.office_sf)} SF` : null} />
          <SpecRow label="2nd Floor Office" value={listing.second_floor_office_sf ? `${formatNumber(listing.second_floor_office_sf)} SF` : null} />
          <SpecRow label="Land" value={listing.land_acres ? `${listing.land_acres} acres` : null} />
        </div>
      </div>

      {/* Building specs */}
      <div>
        <h4 className="text-xs font-semibold text-[hsl(215,16%,47%)] uppercase tracking-wider mb-1">Building</h4>
        <div>
          <SpecRow label="Property Type" value={listing.property_type} />
          <SpecRow label="Zoning" value={listing.zoning} />
          <SpecRow label="Clear Height" value={listing.clear_height_ft ? `${listing.clear_height_ft} ft` : null} />
          <SpecRow label="Power" value={listing.power} />
          <SpecRow label="Yard" value={listing.yard} />
          <SpecRow label="Loading" value={listing.loading_type} />
          <SpecRow label="Dock Doors" value={listing.dock_doors ? String(listing.dock_doors) : null} />
          <SpecRow label="Drive-In Doors" value={listing.drive_in_doors ? String(listing.drive_in_doors) : null} />
          {listing.drive_in_door_dimensions && listing.drive_in_door_dimensions.length > 0 && (
            <SpecRow
              label="Door Dimensions"
              value={listing.drive_in_door_dimensions.map((d, i) => `Door ${i + 1}: ${d}`).join(' · ')}
            />
          )}
        </div>
      </div>

      {/* Features */}
      <div>
        <h4 className="text-xs font-semibold text-[hsl(215,16%,47%)] uppercase tracking-wider mb-2">Features</h4>
        <div className="grid grid-cols-2 gap-x-4">
          <BoolSpec label="Sprinklers" value={listing.has_sprinklers} />
          {listing.has_sprinklers && <BoolSpec label="ESFR Sprinklers" value={listing.sprinklers_esfr} />}
          <BoolSpec label="LED Lighting" value={listing.has_led_lighting} />
          <BoolSpec label="Air Conditioning" value={listing.has_air_conditioning} />
          <BoolSpec label="Rail Access" value={listing.has_rail_access} />
          <BoolSpec label="MUA Units" value={listing.has_mua} />
        </div>
      </div>

      {/* Additional features */}
      {listing.additional_features && (
        <div>
          <h4 className="text-xs font-semibold text-[hsl(215,16%,47%)] uppercase tracking-wider mb-2">Additional Features</h4>
          <p className="text-sm text-[hsl(222,47%,11%)] whitespace-pre-wrap">{listing.additional_features}</p>
        </div>
      )}
    </div>
  );
}
