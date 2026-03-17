import { Link } from 'react-router-dom';
import { MapPin, Ruler, Building2 } from 'lucide-react';
import { PublicListing } from '@/hooks/usePublicListings';
import { formatNumber, formatCurrency } from '@/lib/format';

const dealTypeColors: Record<string, string> = {
  Lease: 'bg-cyan-100 text-cyan-800',
  Sale: 'bg-orange-100 text-orange-800',
  Both: 'bg-violet-100 text-violet-800',
};

interface PublicListingCardProps {
  listing: PublicListing;
}

export function PublicListingCard({ listing }: PublicListingCardProps) {
  const displayAddress = listing.display_address || listing.address;
  const hasPhoto = !!listing.photo_url;

  const askingPrice = listing.deal_type === 'Sale' && listing.asking_sale_price
    ? formatCurrency(listing.asking_sale_price)
    : listing.asking_rent_psf
    ? `$${listing.asking_rent_psf.toFixed(2)}/SF`
    : null;

  return (
    <Link
      to={`/market/${listing.id}`}
      className="group bg-white rounded-xl border border-[hsl(220,13%,87%)] overflow-hidden hover:border-[hsl(38,90%,55%)] hover:shadow-lg transition-all duration-200 flex flex-col"
    >
      {/* Photo */}
      <div className="aspect-[4/3] bg-[hsl(210,40%,96%)] overflow-hidden flex-shrink-0 relative">
        {hasPhoto ? (
          <img
            src={listing.photo_url!}
            alt={displayAddress}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[hsl(215,16%,60%)] gap-2">
            <Building2 className="w-10 h-10 opacity-30" />
            <span className="text-xs opacity-50">No photo available</span>
          </div>
        )}
        {/* Deal type badge overlay */}
        <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${dealTypeColors[listing.deal_type] || 'bg-gray-100 text-gray-700'}`}>
          {listing.deal_type}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Address */}
        <div>
          <h3 className="font-semibold text-[hsl(222,47%,11%)] leading-snug line-clamp-1 group-hover:text-[hsl(38,90%,55%)] transition-colors">
            {displayAddress}
          </h3>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-[hsl(215,16%,47%)]">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="line-clamp-1">{listing.city}{listing.submarket ? ` • ${listing.submarket}` : ''}</span>
          </div>
        </div>

        {/* Specs row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[hsl(215,16%,47%)]">
          {listing.size_sf && (
            <span className="flex items-center gap-1">
              <Ruler className="w-3 h-3" />
              {formatNumber(listing.size_sf)} SF
            </span>
          )}
          {listing.property_type && (
            <span>{listing.property_type}</span>
          )}
          {listing.clear_height_ft && (
            <span>{listing.clear_height_ft}′ clear</span>
          )}
        </div>

        {/* Listing number */}
        {listing.listing_number && (
          <p className="text-xs text-[hsl(215,16%,60%)]">#{listing.listing_number}</p>
        )}

        {/* Asking price — pushed to bottom */}
        <div className="mt-auto pt-2 border-t border-[hsl(220,13%,91%)]">
          {askingPrice ? (
            <p className="text-lg font-bold text-[hsl(222,47%,11%)]">{askingPrice}</p>
          ) : (
            <p className="text-sm text-[hsl(215,16%,60%)]">Pricing upon request</p>
          )}
          {listing.gross_rate && listing.deal_type !== 'Sale' && (
            <p className="text-xs text-[hsl(215,16%,47%)]">Gross ${listing.gross_rate.toFixed(2)}/SF</p>
          )}
        </div>
      </div>
    </Link>
  );
}
