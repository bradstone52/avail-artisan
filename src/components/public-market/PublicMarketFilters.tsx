import { Search, X } from 'lucide-react';
import { PublicListingFilters } from '@/hooks/usePublicListings';

interface PublicMarketFiltersProps {
  filters: PublicListingFilters;
  onChange: (filters: PublicListingFilters) => void;
  cities: string[];
  propertyTypes: string[];
}

export function PublicMarketFilters({ filters, onChange, cities, propertyTypes }: PublicMarketFiltersProps) {
  const set = (key: keyof PublicListingFilters, value: string | number | undefined) =>
    onChange({ ...filters, [key]: value });

  const hasActiveFilters = filters.search || filters.propertyType || filters.dealType || filters.city || filters.minSize || filters.maxSize;

  const clear = () =>
    onChange({ search: '', propertyType: '', dealType: '', city: '', minSize: undefined, maxSize: undefined });

  return (
    <div className="bg-white border border-[hsl(220,13%,87%)] rounded-xl p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,16%,47%)]" />
        <input
          type="text"
          placeholder="Search by address, city or submarket…"
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-[hsl(220,13%,87%)] rounded-lg bg-[hsl(210,20%,98%)] placeholder:text-[hsl(215,16%,60%)] focus:outline-none focus:ring-2 focus:ring-[hsl(38,90%,55%)] focus:border-transparent transition-all"
        />
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <select
          value={filters.propertyType}
          onChange={e => set('propertyType', e.target.value)}
          className="text-sm border border-[hsl(220,13%,87%)] rounded-lg px-3 py-2.5 bg-[hsl(210,20%,98%)] text-[hsl(222,47%,11%)] focus:outline-none focus:ring-2 focus:ring-[hsl(38,90%,55%)] focus:border-transparent transition-all"
        >
          <option value="">All Property Types</option>
          {propertyTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filters.dealType}
          onChange={e => set('dealType', e.target.value)}
          className="text-sm border border-[hsl(220,13%,87%)] rounded-lg px-3 py-2.5 bg-[hsl(210,20%,98%)] text-[hsl(222,47%,11%)] focus:outline-none focus:ring-2 focus:ring-[hsl(38,90%,55%)] focus:border-transparent transition-all"
        >
          <option value="">Lease or Sale</option>
          <option value="Lease">For Lease</option>
          <option value="Sale">For Sale</option>
          <option value="Both">Lease &amp; Sale</option>
        </select>

        <select
          value={filters.city}
          onChange={e => set('city', e.target.value)}
          className="text-sm border border-[hsl(220,13%,87%)] rounded-lg px-3 py-2.5 bg-[hsl(210,20%,98%)] text-[hsl(222,47%,11%)] focus:outline-none focus:ring-2 focus:ring-[hsl(38,90%,55%)] focus:border-transparent transition-all"
        >
          <option value="">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min SF"
            value={filters.minSize ?? ''}
            onChange={e => set('minSize', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full text-sm border border-[hsl(220,13%,87%)] rounded-lg px-3 py-2.5 bg-[hsl(210,20%,98%)] focus:outline-none focus:ring-2 focus:ring-[hsl(38,90%,55%)] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clear}
          className="flex items-center gap-1.5 text-xs text-[hsl(215,16%,47%)] hover:text-[hsl(0,84%,60%)] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear all filters
        </button>
      )}
    </div>
  );
}
