import { supabase } from '@/integrations/supabase/client';

export interface MatchedProperty {
  id: string;
  address: string;
  city: string | null;
  submarket: string | null;
  size_sf: number | null;
  source: 'property' | 'market_listing' | 'transaction';
  landlord?: string | null;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase().trim().replace(/\s+/g, ' ');
}

export async function checkDuplicateAddress(
  address: string,
  excludeTransactionId?: string
): Promise<MatchedProperty | null> {
  if (!address || address.trim().length < 3) {
    return null;
  }

  const normalized = normalizeAddress(address);

  // Check properties table
  const { data: properties } = await supabase
    .from('properties')
    .select('id, address, city, submarket, size_sf')
    .limit(50);

  if (properties) {
    const match = properties.find(
      (p) => normalizeAddress(p.address) === normalized
    );
    if (match) {
      return {
        id: match.id,
        address: match.address,
        city: match.city,
        submarket: match.submarket,
        size_sf: match.size_sf,
        source: 'property',
      };
    }
  }

  // Check market_listings table
  const { data: listings } = await supabase
    .from('market_listings')
    .select('id, address, city, submarket, size_sf, landlord')
    .limit(50);

  if (listings) {
    const match = listings.find(
      (l) => normalizeAddress(l.address) === normalized
    );
    if (match) {
      return {
        id: match.id,
        address: match.address,
        city: match.city,
        submarket: match.submarket,
        size_sf: match.size_sf,
        landlord: match.landlord,
        source: 'market_listing',
      };
    }
  }

  // Check transactions table (excluding current if editing)
  let transactionQuery = supabase
    .from('transactions')
    .select('id, address, city, submarket, size_sf')
    .limit(50);

  if (excludeTransactionId) {
    transactionQuery = transactionQuery.neq('id', excludeTransactionId);
  }

  const { data: transactions } = await transactionQuery;

  if (transactions) {
    const match = transactions.find(
      (t) => normalizeAddress(t.address) === normalized
    );
    if (match) {
      return {
        id: match.id,
        address: match.address,
        city: match.city,
        submarket: match.submarket,
        size_sf: match.size_sf,
        source: 'transaction',
      };
    }
  }

  return null;
}
