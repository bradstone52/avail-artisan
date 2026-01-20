import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  org_id: string | null;
  market_listing_id: string | null;
  listing_id: string | null;
  address: string;
  display_address: string | null;
  city: string;
  submarket: string;
  size_sf: number;
  transaction_type: 'Sale' | 'Lease' | 'Sublease';
  transaction_date: string | null;
  closing_date: string | null;
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
  // Joined market listing data
  market_listing?: {
    id: string;
    listing_id: string;
    address: string;
    display_address: string | null;
    city: string;
    submarket: string;
    size_sf: number;
    warehouse_sf: number | null;
    office_sf: number | null;
    clear_height_ft: number | null;
    dock_doors: number | null;
    drive_in_doors: number | null;
    power_amps: string | null;
    voltage: string | null;
    yard_area: string | null;
    sprinkler: string | null;
    cranes: string | null;
    crane_tons: string | null;
    zoning: string | null;
    landlord: string | null;
    broker_source: string | null;
    link: string | null;
    status: string;
  } | null;
}

export interface TransactionInput {
  market_listing_id?: string | null;
  listing_id?: string | null;
  address: string;
  display_address?: string | null;
  city?: string;
  submarket?: string;
  size_sf?: number;
  transaction_type: 'Sale' | 'Lease' | 'Sublease';
  transaction_date?: string | null;
  closing_date?: string | null;
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
        .select(`
          *,
          market_listing:market_listings(
            id, listing_id, address, display_address, city, submarket,
            size_sf, warehouse_sf, office_sf, clear_height_ft,
            dock_doors, drive_in_doors, power_amps, voltage,
            yard_area, sprinkler, cranes, crane_tons, zoning,
            landlord, broker_source, link, status
          )
        `)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
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
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...input,
          org_id: orgId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Transaction created');
      // Don't block navigation on refreshing the list.
      // (Fetching can be slow due to joins + ordering.)
      void fetchTransactions();
      return data as Transaction;
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

  const getTransaction = useCallback(async (id: string): Promise<Transaction | null> => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          market_listing:market_listings(
            id, listing_id, address, display_address, city, submarket,
            size_sf, warehouse_sf, office_sf, clear_height_ft,
            dock_doors, drive_in_doors, power_amps, voltage,
            yard_area, sprinkler, cranes, crane_tons, zoning,
            landlord, broker_source, link, status
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Transaction;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }, []);

  const undoTransaction = async (id: string): Promise<boolean> => {
    try {
      // First get the transaction to find the linked market listing
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('market_listing_id')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If there's a linked market listing, restore its status to "Active"
      if (transaction?.market_listing_id) {
        const { error: updateError } = await supabase
          .from('market_listings')
          .update({ status: 'Active' })
          .eq('id', transaction.market_listing_id);

        if (updateError) throw updateError;
      }

      // Delete the transaction
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Transaction undone — listing restored to Active');
      await fetchTransactions();
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
    getTransaction,
    undoTransaction,
  };
}
