import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Mail, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { PublicMarketLayout } from '@/components/public-market/PublicMarketLayout';
import { PublicListingSpecs } from '@/components/public-market/PublicListingSpecs';
import { PublicListingPhotos } from '@/components/public-market/PublicListingPhotos';
import { PublicListingInquiryForm } from '@/components/public-market/PublicListingInquiryForm';
import { usePublicListing, usePublicListingPhotos } from '@/hooks/usePublicListings';
import { formatCurrency } from '@/lib/format';

const dealTypeColors: Record<string, string> = {
  Lease: 'bg-cyan-100 text-cyan-800',
  Sale: 'bg-orange-100 text-orange-800',
  Both: 'bg-violet-100 text-violet-800',
};

export default function PublicMarketDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading, error } = usePublicListing(id);
  const { data: photos = [] } = usePublicListingPhotos(id);

  if (isLoading) {
    return (
      <PublicMarketLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(38,90%,55%)]" />
        </div>
      </PublicMarketLayout>
    );
  }

  if (error || !listing) {
    return (
      <PublicMarketLayout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-[hsl(222,47%,11%)] mb-3">Listing Not Found</h2>
          <p className="text-[hsl(215,16%,47%)] mb-6">This listing may have been removed or is no longer available.</p>
          <Link to="/market" className="inline-flex items-center gap-2 text-[hsl(38,90%,55%)] font-semibold hover:underline">
            <ArrowLeft className="w-4 h-4" />
            View all available properties
          </Link>
        </div>
      </PublicMarketLayout>
    );
  }

  const displayAddress = listing.display_address || listing.address;
  const askingRent = (listing.deal_type === 'Lease' || listing.deal_type === 'Both') && listing.asking_rent_psf;
  const askingSale = (listing.deal_type === 'Sale' || listing.deal_type === 'Both') && listing.asking_sale_price;

  return (
    <PublicMarketLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)]">
          <Link to="/market" className="hover:text-[hsl(38,90%,55%)] transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Available Properties
          </Link>
          <span>/</span>
          <span className="text-[hsl(222,47%,11%)] font-medium truncate">{displayAddress}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${dealTypeColors[listing.deal_type] || 'bg-gray-100 text-gray-700'}`}>
                For {listing.deal_type === 'Both' ? 'Lease & Sale' : listing.deal_type}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                Active
              </span>
              {listing.listing_number && (
                <span className="text-xs text-[hsl(215,16%,47%)]">#{listing.listing_number}</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[hsl(222,47%,11%)]">{displayAddress}</h1>
            <div className="flex items-center gap-1 mt-1 text-[hsl(215,16%,47%)]">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{listing.city}{listing.submarket ? ` • ${listing.submarket}` : ''}</span>
            </div>
          </div>
        </div>

        {/* Main content: two-column layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: photos + description + specs */}
          <div className="lg:col-span-2 space-y-8">
            {/* Photos */}
            <PublicListingPhotos photos={photos} mainPhotoUrl={listing.photo_url} address={displayAddress} />

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-lg font-semibold text-[hsl(222,47%,11%)] mb-2">About This Property</h2>
                <p className="text-sm text-[hsl(215,16%,40%)] whitespace-pre-wrap leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Specs */}
            <div>
              <h2 className="text-lg font-semibold text-[hsl(222,47%,11%)] mb-4">Property Specifications</h2>
              <PublicListingSpecs listing={listing} />
            </div>

            {/* Brochure link */}
            {listing.brochure_link && (
              <a
                href={listing.brochure_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[hsl(38,90%,55%)] hover:underline font-medium"
              >
                <FileText className="w-4 h-4" />
                Download Brochure
              </a>
            )}
          </div>

          {/* Right: pricing + agent + inquiry */}
          <div className="space-y-5">
            {/* Pricing card */}
            <div className="bg-white border border-[hsl(220,13%,87%)] rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-[hsl(222,47%,11%)]">Pricing</h3>
              {askingRent && (
                <div>
                  <p className="text-xs text-[hsl(215,16%,47%)] uppercase tracking-wider">Asking Rent</p>
                  <p className="text-2xl font-bold text-[hsl(222,47%,11%)]">${listing.asking_rent_psf!.toFixed(2)}<span className="text-sm font-normal text-[hsl(215,16%,47%)]">/SF/yr</span></p>
                </div>
              )}
              {askingSale && (
                <div>
                  <p className="text-xs text-[hsl(215,16%,47%)] uppercase tracking-wider">Asking Price</p>
                  <p className="text-2xl font-bold text-[hsl(222,47%,11%)]">{formatCurrency(listing.asking_sale_price!)}</p>
                </div>
              )}
              {!askingRent && !askingSale && (
                <p className="text-[hsl(215,16%,47%)] text-sm">Pricing available upon request</p>
              )}
              {listing.op_costs && (
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(215,16%,47%)]">Operating Costs</span>
                  <span className="font-medium">${listing.op_costs.toFixed(2)}/SF</span>
                </div>
              )}
              {listing.taxes && (
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(215,16%,47%)]">Taxes</span>
                  <span className="font-medium">${listing.taxes.toFixed(2)}/SF</span>
                </div>
              )}
              {listing.cam && (
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(215,16%,47%)]">CAM</span>
                  <span className="font-medium">${listing.cam.toFixed(2)}/SF</span>
                </div>
              )}
              {listing.gross_rate && listing.deal_type !== 'Sale' && (
                <div className="pt-2 border-t border-[hsl(220,13%,91%)] flex justify-between text-sm font-semibold">
                  <span>Gross Rate</span>
                  <span>${listing.gross_rate.toFixed(2)}/SF</span>
                </div>
              )}
              {listing.website_link && (
                <a
                  href={listing.website_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[hsl(38,90%,55%)] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Listing Website
                </a>
              )}
            </div>

            {/* Agent card */}
            {(listing.assigned_agent || listing.secondary_agent) && (
              <div className="bg-white border border-[hsl(220,13%,87%)] rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-[hsl(222,47%,11%)]">Listing Agent</h3>
                {[listing.assigned_agent, listing.secondary_agent].filter(Boolean).map((agent) => (
                  <div key={agent!.id} className="space-y-2">
                    <p className="font-medium text-[hsl(222,47%,11%)]">{agent!.name}</p>
                    {agent!.phone && (
                      <a href={`tel:${agent!.phone}`} className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] hover:text-[hsl(38,90%,55%)] transition-colors">
                        <Phone className="w-3.5 h-3.5" />
                        {agent!.phone}
                      </a>
                    )}
                    {agent!.email && (
                      <a href={`mailto:${agent!.email}`} className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] hover:text-[hsl(38,90%,55%)] transition-colors">
                        <Mail className="w-3.5 h-3.5" />
                        {agent!.email}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Inquiry form */}
            <div className="bg-white border border-[hsl(220,13%,87%)] rounded-xl p-5">
              <h3 className="font-semibold text-[hsl(222,47%,11%)] mb-4">Request Information</h3>
              <PublicListingInquiryForm listingId={listing.id} listingAddress={displayAddress} />
            </div>
          </div>
        </div>
      </div>
    </PublicMarketLayout>
  );
}
