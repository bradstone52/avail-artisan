import { Link } from 'react-router-dom';
import { MapPin, Building2, ChevronRight } from 'lucide-react';
import { PublicListing } from '@/hooks/usePublicListings';
import { formatNumber, formatCurrency } from '@/lib/format';

const dealTypeColors: Record<string, string> = {
  Lease: 'bg-cyan-100 text-cyan-800',
  Sale: 'bg-orange-100 text-orange-800',
  Both: 'bg-violet-100 text-violet-800',
};

interface PublicListingRowProps {
  listing: PublicListing;
}

export function PublicListingRow({ listing }: PublicListingRowProps) {
  const displayAddress = listing.display_address || listing.address;

  const askingPrice = listing.deal_type === 'Sale' && listing.asking_sale_price
    ? formatCurrency(listing.asking_sale_price)
    : listing.asking_rent_psf
    ? `$${listing.asking_rent_psf.toFixed(2)}/SF`
    : '—';

  return (
    <Link
      to={`/market/${listing.id}`}
      className="group flex items-center gap-4 bg-white border border-[hsl(220,13%,87%)] rounded-xl px-4 py-4 hover:border-[hsl(38,90%,55%)] hover:shadow-md transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg bg-[hsl(210,40%,96%)] flex-shrink-0 overflow-hidden">
        {listing.photo_url ? (
          <img src={listing.photo_url} alt={displayAddress} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-6 h-6 text-[hsl(215,16%,60%)] opacity-40" />
          </div>
        )}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="font-semibold text-[hsl(222,47%,11%)] group-hover:text-[hsl(38,90%,55%)] transition-colors truncate">
            {displayAddress}
          </h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${dealTypeColors[listing.deal_type] || 'bg-gray-100 text-gray-700'}`}>
            {listing.deal_type}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-[hsl(215,16%,47%)]">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span>{listing.city}{listing.submarket ? ` • ${listing.submarket}` : ''}</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-[hsl(215,16%,60%)]">
          {listing.size_sf && <span>{formatNumber(listing.size_sf)} SF</span>}
          {listing.property_type && <span>{listing.property_type}</span>}
          {listing.clear_height_ft && <span>{listing.clear_height_ft}′ clear</span>}
          {listing.dock_doors ? <span>{listing.dock_doors} dock</span> : null}
          {listing.drive_in_doors ? <span>{listing.drive_in_doors} drive-in</span> : null}
        </div>
      </div>

      {/* Price + chevron */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="font-bold text-[hsl(222,47%,11%)]">{askingPrice}</p>
          {listing.gross_rate && listing.deal_type !== 'Sale' && (
            <p className="text-xs text-[hsl(215,16%,47%)]">Gross ${listing.gross_rate.toFixed(2)}/SF</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-[hsl(215,16%,47%)] group-hover:text-[hsl(38,90%,55%)] transition-colors" />
      </div>
    </Link>
  );
}
