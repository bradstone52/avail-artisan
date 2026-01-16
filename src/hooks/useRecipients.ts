import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Recipient {
  id: string;
  company_name: string;
  contact_name: string;
  title: string | null;
  email: string;
  notes: string | null;
  created_at: string;
}

export type RecipientInsert = Omit<Recipient, "id" | "created_at">;
export type RecipientUpdate = Partial<RecipientInsert> & { id: string };

export function useRecipients() {
  const queryClient = useQueryClient();

  const recipientsQuery = useQuery({
    queryKey: ["distribution_recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_recipients")
        .select("*")
        .order("company_name", { ascending: true });

      if (error) throw error;
      return data as Recipient[];
    },
  });

  const createRecipient = useMutation({
    mutationFn: async (recipient: RecipientInsert) => {
      const { data, error } = await supabase
        .from("distribution_recipients")
        .insert(recipient)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_recipients"] });
      toast.success("Recipient added");
    },
    onError: (error) => {
      toast.error("Failed to add recipient: " + error.message);
    },
  });

  const updateRecipient = useMutation({
    mutationFn: async ({ id, ...updates }: RecipientUpdate) => {
      const { data, error } = await supabase
        .from("distribution_recipients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_recipients"] });
      toast.success("Recipient updated");
    },
    onError: (error) => {
      toast.error("Failed to update recipient: " + error.message);
    },
  });

  const deleteRecipient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("distribution_recipients")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_recipients"] });
      toast.success("Recipient deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete recipient: " + error.message);
    },
  });

  return {
    recipients: recipientsQuery.data ?? [],
    isLoading: recipientsQuery.isLoading,
    error: recipientsQuery.error,
    createRecipient,
    updateRecipient,
    deleteRecipient,
  };
}
