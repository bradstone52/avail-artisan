import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface MarketListingData {
  id?: string;
  listing_id?: string;
  address?: string;
  display_address?: string | null;
  city?: string;
  submarket?: string;
  size_sf?: number;
  warehouse_sf?: number | null;
  office_sf?: number | null;
  clear_height_ft?: number | null;
  dock_doors?: number | null;
  drive_in_doors?: number | null;
  power_amps?: string | null;
  voltage?: string | null;
  yard_area?: string | null;
  sprinkler?: string | null;
  cranes?: string | null;
  crane_tons?: string | null;
  zoning?: string | null;
  landlord?: string | null;
  broker_source?: string | null;
  link?: string | null;
  status?: string;
  yard?: string | null;
  cross_dock?: string | null;
  trailer_parking?: string | null;
  land_acres?: string | null;
  mua?: string | null;
  op_costs?: string | null;
  asking_rate_psf?: string | null;
  gross_rate?: string | null;
  sale_price?: string | null;
  condo_fees?: string | null;
  property_tax?: string | null;
  sublease_exp?: string | null;
  listing_type?: string | null;
  availability_date?: string | null;
  notes_public?: string | null;
  internal_note?: string | null;
}

export interface Transaction {
  id: string;
  org_id: string | null;
  market_listing_id: string | null;
  listing_id: string | null;
  property_id: string | null;
  address: string;
  display_address: string | null;
  city: string;
  submarket: string;
  size_sf: number;
  transaction_type: 'Sale' | 'Lease' | 'Sublease' | 'Unknown/Removed';
  transaction_date: string | null;
  closing_date: string | null;
  listing_removal_date: string | null;
  sale_price: number | null;
  lease_rate_psf: number | null;
  lease_term_months: number | null;
  buyer_tenant_name: string | null;
  buyer_tenant_company: string | null;
  seller_landlord_name: string | null;
  seller_landlord_company: string | null;
  listing_broker_name: string | null;
  listing_broker_company: string | null;
  selling_broker_name: string | null;
  selling_broker_company: string | null;
  commission_percent: number | null;
  commission_amount: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Snapshot of listing at time of transaction (for undo/display)
  market_listing_snapshot: MarketListingData | null;
  // Joined market listing data (null if listing was deleted)
  market_listing?: MarketListingData | null;
}

export interface TransactionInput {
  market_listing_id?: string | null;
  listing_id?: string | null;
  property_id?: string | null;
  address: string;
  display_address?: string | null;
  city?: string;
  submarket?: string;
  size_sf?: number;
  transaction_type: 'Sale' | 'Lease' | 'Sublease' | 'Unknown/Removed';
  transaction_date?: string | null;
  closing_date?: string | null;
  listing_removal_date?: string | null;
  sale_price?: number | null;
  lease_rate_psf?: number | null;
  lease_term_months?: number | null;
  buyer_tenant_name?: string | null;
  buyer_tenant_company?: string | null;
  seller_landlord_name?: string | null;
  seller_landlord_company?: string | null;
  listing_broker_name?: string | null;
  listing_broker_company?: string | null;
  selling_broker_name?: string | null;
  selling_broker_company?: string | null;
  commission_percent?: number | null;
  commission_amount?: number | null;
  notes?: string | null;
  market_listing_snapshot?: Json | null;
}

export function useTransactions() {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!user || !orgId) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions((data || []).map(t => ({
        ...t,
        market_listing_snapshot: t.market_listing_snapshot as unknown as MarketListingData | null,
      })) as Transaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [user, orgId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const createTransaction = async (input: TransactionInput): Promise<Transaction | null> => {
    if (!user || !orgId) {
      toast.error('You must be logged in');
      return null;
    }

    try {
      let listingSnapshot: Json | null = null;
      let propertyId: string | null = input.property_id || null;

      // If there's a linked market listing, fetch the full record for snapshot and deletion
      if (input.market_listing_id) {
        const { data: listingData, error: listingError } = await supabase
          .from('market_listings')
          .select('*')
          .eq('id', input.market_listing_id)
          .single();

        if (listingError) {
          // Listing may have already been deleted by a previous transaction
          if (listingError.code === 'PGRST116') {
            toast.error('This listing has already been processed');
            return null;
          }
          console.error('Error fetching listing for snapshot:', listingError);
        } else if (listingData) {
          // Store full listing as snapshot for undo
          listingSnapshot = listingData as unknown as Json;
        }
      }

      // Delete the market listing FIRST to prevent race conditions with duplicate submissions
      // This acts as an atomic lock - only the first transaction to delete succeeds
      if (input.market_listing_id) {
        const { data: deletedRows, error: deleteError } = await supabase
          .from('market_listings')
          .delete()
          .eq('id', input.market_listing_id)
          .select('id');

        if (deleteError) {
          console.error('Error deleting market listing:', deleteError);
          toast.error('Failed to process listing');
          return null;
        }
        
        // If no rows were deleted, the listing was already processed
        if (!deletedRows || deletedRows.length === 0) {
          toast.error('This listing has already been processed');
          return null;
        }
      }

      // Auto-link to property by address if not already set
      if (!propertyId && input.address) {
        const { data: matchedProperty } = await supabase
          .from('properties')
          .select('id')
          .ilike('address', input.address.trim())
          .limit(1)
          .maybeSingle();
        
        if (matchedProperty) {
          propertyId = matchedProperty.id;
        }
      }

      // Create the transaction with snapshot and property link
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...input,
          property_id: propertyId,
          market_listing_snapshot: listingSnapshot,
          org_id: orgId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        // If transaction creation fails after delete, try to restore the listing
        if (listingSnapshot && input.market_listing_id) {
          console.error('Transaction creation failed, attempting to restore listing...');
          const snapshot = listingSnapshot as Record<string, Json | undefined>;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, created_at: _createdAt, ...restoreData } = snapshot;
          await supabase
            .from('market_listings')
            .insert(restoreData as unknown as {
              address: string;
              listing_id: string;
              user_id: string;
              [key: string]: unknown;
            });
        }
        throw error;
      }
      
      toast.success('Transaction created');
      // Don't block navigation on refreshing the list.
      void fetchTransactions();
      return {
        ...data,
        market_listing_snapshot: data.market_listing_snapshot as unknown as MarketListingData | null,
      } as Transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to create transaction');
      return null;
    }
  };

  const updateTransaction = async (id: string, input: Partial<TransactionInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update(input)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Transaction updated');
      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
      return false;
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Transaction deleted');
      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
      return false;
    }
  };

  const deleteTransactions = async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return true;
    
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids);

      if (error) throw error;
      
      toast.success(`${ids.length} transaction${ids.length > 1 ? 's' : ''} deleted`);
      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Error deleting transactions:', error);
      toast.error('Failed to delete transactions');
      return false;
    }
  };

  const getTransaction = useCallback(async (id: string): Promise<Transaction | null> => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        ...data,
        market_listing_snapshot: data.market_listing_snapshot as unknown as MarketListingData | null,
      } as Transaction;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }, []);

  const undoTransaction = async (id: string): Promise<boolean> => {
    try {
      // Get the transaction with the snapshot
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('market_listing_id, market_listing_snapshot')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If there's a snapshot, restore the listing from it
      if (transaction?.market_listing_snapshot && typeof transaction.market_listing_snapshot === 'object' && !Array.isArray(transaction.market_listing_snapshot)) {
        const snapshot = transaction.market_listing_snapshot as Record<string, Json | undefined>;
        
        // Remove fields that shouldn't be in insert (auto-generated or conflicting)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, created_at: _createdAt, ...restoreData } = snapshot;
        
        // Cast to the expected insert type
        const { error: insertError } = await supabase
          .from('market_listings')
          .insert(restoreData as unknown as {
            address: string;
            listing_id: string;
            user_id: string;
            [key: string]: unknown;
          });

        if (insertError) {
          console.error('Error restoring listing:', insertError);
          throw insertError;
        }
      }

      // Delete the transaction
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Transaction undone — listing restored');
      void fetchTransactions();
      return true;
    } catch (error) {
      console.error('Error undoing transaction:', error);
      toast.error('Failed to undo transaction');
      return false;
    }
  };

  return {
    transactions,
    isLoading,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    deleteTransactions,
    getTransaction,
    undoTransaction,
  };
}
