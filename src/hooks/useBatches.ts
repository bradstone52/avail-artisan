import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Batch {
  id: string;
  name: string;
  period_year: number | null;
  period_month: number | null;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
  status: string;
}

export interface BatchRecipient {
  id: string;
  batch_id: string;
  recipient_id: string;
  replied: boolean;
  reply_date: string | null;
  next_step: string | null;
  owner: string;
  owner_user_id: string | null;
  updated_at: string;
}

export interface RecipientWithBatchStatus {
  id: string;
  company_name: string;
  contact_name: string;
  title: string | null;
  email: string;
  notes: string | null;
  default_owner: string;
  created_at: string;
  batchStatus?: BatchRecipient;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const OWNER_OPTIONS = ["Brad", "Doug", "Angel", "Unassigned"] as const;
export type OwnerOption = typeof OWNER_OPTIONS[number];

export function useBatches() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get all batches
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

  // Get recipients for a specific batch (with batch status joined)
  const useBatchRecipients = (batchId: string | null) => {
    return useQuery({
      queryKey: ["batch_recipients", batchId],
      queryFn: async () => {
        if (!batchId) return [];

        // Get batch recipients with their status
        const { data: batchRecipients, error: brError } = await supabase
          .from("distribution_recipient_batch_status")
          .select("*")
          .eq("batch_id", batchId);

        if (brError) throw brError;

        // Get all recipients that are in this batch
        const recipientIds = batchRecipients?.map(br => br.recipient_id) || [];
        if (recipientIds.length === 0) return [];

        const { data: recipients, error: rError } = await supabase
          .from("distribution_recipients")
          .select("*")
          .in("id", recipientIds)
          .order("company_name", { ascending: true });

        if (rError) throw rError;

        // Create a map for quick lookup
        const statusMap = new Map(batchRecipients?.map(br => [br.recipient_id, br]) || []);

        // Combine recipients with their batch status
        return recipients?.map(recipient => ({
          ...recipient,
          default_owner: (recipient as any).default_owner || "Unassigned",
          batchStatus: statusMap.get(recipient.id) as BatchRecipient | undefined,
        })) as RecipientWithBatchStatus[];
      },
      enabled: !!batchId,
    });
  };

  // Create new batch from selected recipients
  const createBatch = useMutation({
    mutationFn: async ({ 
      name, 
      recipientIds 
    }: { 
      name: string; 
      recipientIds: string[] 
    }) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      // Create new batch
      const { data: newBatch, error: createError } = await supabase
        .from("distribution_batches")
        .insert({
          name: name,
          period_year: year,
          period_month: month + 1,
          is_active: true,
          status: "Active",
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Get default owners for selected recipients
      const { data: recipients, error: recipientsError } = await supabase
        .from("distribution_recipients")
        .select("id, default_owner")
        .in("id", recipientIds);

      if (recipientsError) throw recipientsError;

      // Create status entries for selected recipients
      if (recipients && recipients.length > 0) {
        const statusEntries = recipients.map(r => ({
          batch_id: newBatch.id,
          recipient_id: r.id,
          replied: false,
          reply_date: null,
          next_step: null,
          owner: (r as any).default_owner || "Unassigned",
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
      queryClient.invalidateQueries({ queryKey: ["batch_recipients"] });
      toast.success("New batch created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create batch: " + error.message);
    },
  });

  // Update batch status (Active/Closed)
  const updateBatchStatus = useMutation({
    mutationFn: async ({ batchId, status }: { batchId: string; status: string }) => {
      const { error } = await supabase
        .from("distribution_batches")
        .update({ status, is_active: status === "Active" })
        .eq("id", batchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_batches"] });
      toast.success("Batch status updated");
    },
    onError: (error) => {
      toast.error("Failed to update batch: " + error.message);
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
      updates: Partial<Pick<BatchRecipient, "replied" | "reply_date" | "next_step" | "owner">>;
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
            owner: "Unassigned",
            ...updates,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["batch_recipients", variables.batchId] });
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  return {
    allBatches: allBatchesQuery.data ?? [],
    allBatchesLoading: allBatchesQuery.isLoading,
    useBatchRecipients,
    createBatch,
    updateBatchStatus,
    updateRecipientStatus,
    OWNER_OPTIONS,
  };
}

// Keep for backwards compatibility but simplified
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