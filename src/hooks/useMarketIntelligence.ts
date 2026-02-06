import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from './useOrg';
import { InternalListing } from './useInternalListings';

export interface ComparableListing {
  id: string;
  address: string;
  display_address: string | null;
  city: string;
  submarket: string;
  size_sf: number;
  asking_rate_psf: string | null;
  sale_price: string | null;
  listing_type: string | null;
  landlord: string | null;
  broker_source: string | null;
  status: string;
  clear_height_ft: number | null;
  dock_doors: number | null;
  drive_in_doors: number | null;
}

export interface RecentTransaction {
  id: string;
  address: string;
  display_address: string | null;
  city: string;
  submarket: string;
  size_sf: number;
  transaction_type: string;
  transaction_date: string | null;
  sale_price: number | null;
  lease_rate_psf: number | null;
  buyer_tenant_name: string | null;
  buyer_tenant_company: string | null;
}

export interface MarketStats {
  avgAskingRent: number | null;
  minAskingRent: number | null;
  maxAskingRent: number | null;
  avgSalePrice: number | null;
  totalActiveListings: number;
  avgSizeSf: number | null;
}

export interface PricingPosition {
  position: 'below' | 'at' | 'above' | 'unknown';
  percentDiff: number | null;
  marketAvg: number | null;
}

function parseRate(rateStr: string | null | undefined): number | null {
  if (!rateStr) return null;
  // Remove $ and any text, extract the number
  const cleaned = rateStr.replace(/[$,]/g, '').trim();
  const match = cleaned.match(/^[\d.]+/);
  if (!match) return null;
  const val = parseFloat(match[0]);
  return isNaN(val) ? null : val;
}

function parseSalePrice(priceStr: string | null | undefined): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[$,]/g, '').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

export function useMarketIntelligence(listing: InternalListing | null | undefined) {
  const { orgId } = useOrg();

  // Fetch comparable market listings
  const comparablesQuery = useQuery({
    queryKey: ['market-intelligence-comparables', listing?.id, listing?.city, listing?.size_sf, listing?.property_type],
    queryFn: async () => {
      if (!listing || !orgId) return [];

      // Define size range: ±30% of listing size, or ±20,000 SF minimum range
      const sizeSf = listing.size_sf || 0;
      const sizeRange = Math.max(sizeSf * 0.3, 20000);
      const minSize = Math.max(0, sizeSf - sizeRange);
      const maxSize = sizeSf + sizeRange;

      let query = supabase
        .from('market_listings')
        .select(`
          id,
          address,
          display_address,
          city,
          submarket,
          size_sf,
          asking_rate_psf,
          sale_price,
          listing_type,
          landlord,
          broker_source,
          status,
          clear_height_ft,
          dock_doors,
          drive_in_doors
        `)
        .eq('org_id', orgId)
        .in('status', ['Active', 'Pending'])
        .gt('size_sf', 0) // Exclude listings with no size data
        .gte('size_sf', minSize)
        .lte('size_sf', maxSize)
        .order('size_sf', { ascending: false })
        .limit(20);

      // Filter by city
      if (listing.city) {
        query = query.eq('city', listing.city);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching comparables:', error);
        return [];
      }

      return (data || []) as ComparableListing[];
    },
    enabled: !!listing && !!orgId,
  });

  // Fetch recent transactions in the same submarket
  const transactionsQuery = useQuery({
    queryKey: ['market-intelligence-transactions', listing?.city],
    queryFn: async () => {
      if (!listing || !orgId) return [];

      // Get transactions from the last 24 months
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      let query = supabase
        .from('transactions')
        .select(`
          id,
          address,
          display_address,
          city,
          submarket,
          size_sf,
          transaction_type,
          transaction_date,
          sale_price,
          lease_rate_psf,
          buyer_tenant_name,
          buyer_tenant_company
        `)
        .eq('org_id', orgId)
        .in('transaction_type', ['Sale', 'Lease', 'Sublease', 'Renewal'])
        .gte('transaction_date', twoYearsAgo.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false })
        .limit(15);

      // Filter by city
      if (listing.city) {
        query = query.eq('city', listing.city);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return (data || []) as RecentTransaction[];
    },
    enabled: !!listing && !!orgId,
  });

  // Calculate market statistics
  const marketStats: MarketStats = {
    avgAskingRent: null,
    minAskingRent: null,
    maxAskingRent: null,
    avgSalePrice: null,
    totalActiveListings: 0,
    avgSizeSf: null,
  };

  const comparables = comparablesQuery.data || [];
  
  if (comparables.length > 0) {
    marketStats.totalActiveListings = comparables.length;

    // Calculate rent statistics
    const rents = comparables
      .map(c => parseRate(c.asking_rate_psf))
      .filter((r): r is number => r !== null && r > 0);

    if (rents.length > 0) {
      marketStats.avgAskingRent = rents.reduce((a, b) => a + b, 0) / rents.length;
      marketStats.minAskingRent = Math.min(...rents);
      marketStats.maxAskingRent = Math.max(...rents);
    }

    // Calculate sale price statistics (per SF)
    const salePrices = comparables
      .map(c => {
        const price = parseSalePrice(c.sale_price);
        if (price && c.size_sf) return price / c.size_sf;
        return null;
      })
      .filter((p): p is number => p !== null && p > 0);

    if (salePrices.length > 0) {
      marketStats.avgSalePrice = salePrices.reduce((a, b) => a + b, 0) / salePrices.length;
    }

    // Calculate average size
    const sizes = comparables.map(c => c.size_sf).filter((s): s is number => s !== null && s > 0);
    if (sizes.length > 0) {
      marketStats.avgSizeSf = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    }
  }

  // Calculate pricing position for rent
  const rentPosition: PricingPosition = {
    position: 'unknown',
    percentDiff: null,
    marketAvg: marketStats.avgAskingRent,
  };

  if (listing?.asking_rent_psf && marketStats.avgAskingRent) {
    const listingRent = listing.asking_rent_psf;
    const diff = listingRent - marketStats.avgAskingRent;
    const percentDiff = (diff / marketStats.avgAskingRent) * 100;
    
    rentPosition.percentDiff = percentDiff;
    
    if (percentDiff < -5) {
      rentPosition.position = 'below';
    } else if (percentDiff > 5) {
      rentPosition.position = 'above';
    } else {
      rentPosition.position = 'at';
    }
  }

  // Calculate pricing position for sale
  const salePosition: PricingPosition = {
    position: 'unknown',
    percentDiff: null,
    marketAvg: marketStats.avgSalePrice,
  };

  if (listing?.asking_sale_price && listing.size_sf && marketStats.avgSalePrice) {
    const listingPricePsf = listing.asking_sale_price / listing.size_sf;
    const diff = listingPricePsf - marketStats.avgSalePrice;
    const percentDiff = (diff / marketStats.avgSalePrice) * 100;
    
    salePosition.percentDiff = percentDiff;
    
    if (percentDiff < -5) {
      salePosition.position = 'below';
    } else if (percentDiff > 5) {
      salePosition.position = 'above';
    } else {
      salePosition.position = 'at';
    }
  }

  return {
    comparables,
    recentTransactions: transactionsQuery.data || [],
    marketStats,
    rentPosition,
    salePosition,
    isLoading: comparablesQuery.isLoading || transactionsQuery.isLoading,
    isError: comparablesQuery.isError || transactionsQuery.isError,
  };
}
