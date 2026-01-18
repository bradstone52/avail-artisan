import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Batch {
  id: string;
  name: string;
  period_year: number;
  period_month: number;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
}

export interface RecipientBatchStatus {
  id: string;
  batch_id: string;
  recipient_id: string;
  replied: boolean;
  reply_date: string | null;
  next_step: string | null;
  owner_user_id: string | null;
  updated_at: string;
}

export interface RecipientWithStatus {
  id: string;
  company_name: string;
  contact_name: string;
  title: string | null;
  email: string;
  notes: string | null;
  created_at: string;
  status?: RecipientBatchStatus;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function useBatches() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get active batch
  const activeBatchQuery = useQuery({
    queryKey: ["distribution_batches", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_batches")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as Batch | null;
    },
  });

  // Get all batches for history dropdown
  const allBatchesQuery = useQuery({
    queryKey: ["distribution_batches", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_batches")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Batch[];
    },
  });

  // Get recipients with status for a specific batch
  const useRecipientsWithStatus = (batchId: string | null) => {
    return useQuery({
      queryKey: ["recipients_with_status", batchId],
      queryFn: async () => {
        if (!batchId) return [];

        // First get all recipients
        const { data: recipients, error: recipientsError } = await supabase
          .from("distribution_recipients")
          .select("*")
          .order("company_name", { ascending: true });

        if (recipientsError) throw recipientsError;

        // Then get status for this batch
        const { data: statuses, error: statusError } = await supabase
          .from("distribution_recipient_batch_status")
          .select("*")
          .eq("batch_id", batchId);

        if (statusError) throw statusError;

        // Create a map for quick lookup
        const statusMap = new Map(statuses?.map(s => [s.recipient_id, s]) || []);

        // Combine recipients with their status
        return recipients?.map(recipient => ({
          ...recipient,
          status: statusMap.get(recipient.id) as RecipientBatchStatus | undefined,
        })) as RecipientWithStatus[];
      },
      enabled: !!batchId,
    });
  };

  // Create new batch
  const createBatch = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-indexed
      const batchName = `Distribution Availabilities — ${MONTH_NAMES[month]} ${year}`;

      // First, deactivate all existing batches
      const { error: deactivateError } = await supabase
        .from("distribution_batches")
        .update({ is_active: false })
        .eq("is_active", true);

      if (deactivateError) throw deactivateError;

      // Create new active batch
      const { data: newBatch, error: createError } = await supabase
        .from("distribution_batches")
        .insert({
          name: batchName,
          period_year: year,
          period_month: month + 1, // Store as 1-indexed
          is_active: true,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Get all recipients
      const { data: recipients, error: recipientsError } = await supabase
        .from("distribution_recipients")
        .select("id");

      if (recipientsError) throw recipientsError;

      // Create status entries for all recipients
      if (recipients && recipients.length > 0) {
        const statusEntries = recipients.map(r => ({
          batch_id: newBatch.id,
          recipient_id: r.id,
          replied: false,
          reply_date: null,
          next_step: null,
          owner_user_id: null,
        }));

        const { error: statusError } = await supabase
          .from("distribution_recipient_batch_status")
          .insert(statusEntries);

        if (statusError) throw statusError;
      }

      return newBatch as Batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_batches"] });
      queryClient.invalidateQueries({ queryKey: ["recipients_with_status"] });
      toast.success("New batch created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create batch: " + error.message);
    },
  });

  // Update recipient batch status
  const updateRecipientStatus = useMutation({
    mutationFn: async ({
      batchId,
      recipientId,
      updates,
    }: {
      batchId: string;
      recipientId: string;
      updates: Partial<Pick<RecipientBatchStatus, "replied" | "reply_date" | "next_step" | "owner_user_id">>;
    }) => {
      // First check if status exists
      const { data: existing } = await supabase
        .from("distribution_recipient_batch_status")
        .select("id")
        .eq("batch_id", batchId)
        .eq("recipient_id", recipientId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("distribution_recipient_batch_status")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("distribution_recipient_batch_status")
          .insert({
            batch_id: batchId,
            recipient_id: recipientId,
            ...updates,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipients_with_status", variables.batchId] });
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  return {
    activeBatch: activeBatchQuery.data,
    activeBatchLoading: activeBatchQuery.isLoading,
    allBatches: allBatchesQuery.data ?? [],
    useRecipientsWithStatus,
    createBatch,
    updateRecipientStatus,
  };
}

// Hook to get app users for owner dropdown
export function useAppUsers() {
  return useQuery({
    queryKey: ["app_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
