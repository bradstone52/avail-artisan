import { useMemo, useState } from 'react';
import { LayoutGrid, List, Building2 } from 'lucide-react';
import { PublicMarketLayout } from '@/components/public-market/PublicMarketLayout';
import { PublicListingCard } from '@/components/public-market/PublicListingCard';
import { PublicListingRow } from '@/components/public-market/PublicListingRow';
import { PublicMarketFilters } from '@/components/public-market/PublicMarketFilters';
import { usePublicListings, PublicListingFilters } from '@/hooks/usePublicListings';

type ViewMode = 'grid' | 'list';

export default function PublicMarket() {
  const { data: listings = [], isLoading } = usePublicListings();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<PublicListingFilters>({
    search: '', propertyType: '', dealType: '', city: '',
  });

  const cities = useMemo(() => {
    const set = new Set<string>();
    listings.forEach(l => { if (l.city) set.add(l.city); });
    return Array.from(set).sort();
  }, [listings]);

  const propertyTypes = useMemo(() => {
    const set = new Set<string>();
    listings.forEach(l => { if (l.property_type) set.add(l.property_type); });
    return Array.from(set).sort();
  }, [listings]);

  const filtered = useMemo(() => {
    return listings.filter(l => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!((l.display_address || l.address).toLowerCase().includes(s) ||
          l.city.toLowerCase().includes(s) ||
          l.submarket?.toLowerCase().includes(s) ||
          l.listing_number?.toLowerCase().includes(s))) return false;
      }
      if (filters.propertyType && l.property_type !== filters.propertyType) return false;
      if (filters.dealType && l.deal_type !== filters.dealType) return false;
      if (filters.city && l.city !== filters.city) return false;
      if (filters.minSize && (l.size_sf ?? 0) < filters.minSize) return false;
      if (filters.maxSize && (l.size_sf ?? 0) > filters.maxSize) return false;
      return true;
    });
  }, [listings, filters]);

  return (
    <PublicMarketLayout>
      {/* Hero banner */}
      <div className="bg-[hsl(222,47%,11%)] text-white py-14 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-[hsl(38,90%,55%)] text-sm font-semibold uppercase tracking-widest mb-2">ClearView Commercial Realty Inc.</p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Available Industrial Properties</h1>
          <p className="text-[hsl(215,16%,70%)] max-w-xl">
            Browse our current portfolio of industrial, commercial and land listings available for lease or sale across Western Canada.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filter bar */}
        <PublicMarketFilters
          filters={filters}
          onChange={setFilters}
          cities={cities}
          propertyTypes={propertyTypes}
        />

        {/* Results header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-[hsl(215,16%,47%)]">
            {isLoading ? 'Loading listings…' : `${filtered.length} ${filtered.length === 1 ? 'property' : 'properties'} available`}
          </p>
          <div className="flex items-center gap-1 bg-white border border-[hsl(220,13%,87%)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[hsl(38,90%,55%)] text-white' : 'text-[hsl(215,16%,47%)] hover:bg-[hsl(210,40%,96%)]'}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[hsl(38,90%,55%)] text-white' : 'text-[hsl(215,16%,47%)] hover:bg-[hsl(210,40%,96%)]'}`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Listings */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-3'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[hsl(220,13%,87%)] animate-pulse">
                <div className={viewMode === 'grid' ? 'aspect-[4/3] bg-[hsl(210,40%,96%)] rounded-t-xl' : 'h-20 bg-[hsl(210,40%,96%)] rounded-xl'} />
                {viewMode === 'grid' && <div className="p-4 space-y-2"><div className="h-4 bg-[hsl(210,40%,96%)] rounded w-3/4" /><div className="h-3 bg-[hsl(210,40%,96%)] rounded w-1/2" /></div>}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <Building2 className="w-16 h-16 text-[hsl(215,16%,60%)] opacity-20" />
            <h3 className="font-semibold text-[hsl(222,47%,11%)]">No properties found</h3>
            <p className="text-sm text-[hsl(215,16%,47%)] max-w-sm">
              Try adjusting your filters, or{' '}
              <a href="mailto:info@clearviewcommercial.ca" className="text-[hsl(38,90%,55%)] underline">
                contact us
              </a>{' '}
              — we may have unlisted properties that match your requirements.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(l => <PublicListingCard key={l.id} listing={l} />)}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(l => <PublicListingRow key={l.id} listing={l} />)}
          </div>
        )}
      </div>
    </PublicMarketLayout>
  );
}
