import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SendWithDetails {
  id: string;
  recipient_id: string;
  report_id: string;
  tracking_token: string;
  sent_at: string;
  recipient: {
    company_name: string;
    contact_name: string;
    email: string;
  };
  issue: {
    title: string;
  } | null;
  view_count: number;
  last_viewed_at: string | null;
}

export interface SendInsert {
  recipient_id: string;
  report_id: string;
}

export function useSends() {
  const queryClient = useQueryClient();

  const sendsQuery = useQuery({
    queryKey: ["distribution_sends"],
    queryFn: async () => {
      // Get sends with recipient info
      const { data: sends, error: sendsError } = await supabase
        .from("distribution_sends")
        .select(`
          id,
          recipient_id,
          report_id,
          tracking_token,
          sent_at,
          distribution_recipients!inner (
            company_name,
            contact_name,
            email
          )
        `)
        .order("sent_at", { ascending: false });

      if (sendsError) throw sendsError;

      // Get event counts for each send
      const sendIds = sends?.map(s => s.id) || [];
      
      let eventCounts: Record<string, { count: number; last_viewed: string | null }> = {};
      
      if (sendIds.length > 0) {
        const { data: events, error: eventsError } = await supabase
          .from("distribution_events")
          .select("send_id, timestamp")
          .in("send_id", sendIds)
          .order("timestamp", { ascending: false });

        if (!eventsError && events) {
          eventCounts = events.reduce((acc, event) => {
            if (!acc[event.send_id]) {
              acc[event.send_id] = { count: 0, last_viewed: event.timestamp };
            }
            acc[event.send_id].count++;
            return acc;
          }, {} as Record<string, { count: number; last_viewed: string | null }>);
        }
      }

      // Get issue titles
      const reportIds = [...new Set(sends?.map(s => s.report_id) || [])];
      let issueTitles: Record<string, string> = {};
      
      if (reportIds.length > 0) {
        const { data: issues } = await supabase
          .from("issues")
          .select("id, title")
          .in("id", reportIds);
        
        if (issues) {
          issueTitles = issues.reduce((acc, issue) => {
            acc[issue.id] = issue.title;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return sends?.map(send => ({
        id: send.id,
        recipient_id: send.recipient_id,
        report_id: send.report_id,
        tracking_token: send.tracking_token,
        sent_at: send.sent_at,
        recipient: {
          company_name: (send.distribution_recipients as any).company_name,
          contact_name: (send.distribution_recipients as any).contact_name,
          email: (send.distribution_recipients as any).email,
        },
        issue: issueTitles[send.report_id] ? { title: issueTitles[send.report_id] } : null,
        view_count: eventCounts[send.id]?.count || 0,
        last_viewed_at: eventCounts[send.id]?.last_viewed || null,
      })) as SendWithDetails[];
    },
  });

  const createSend = useMutation({
    mutationFn: async (send: SendInsert) => {
      const { data, error } = await supabase
        .from("distribution_sends")
        .insert(send)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_sends"] });
      toast.success("Send logged");
    },
    onError: (error) => {
      toast.error("Failed to log send: " + error.message);
    },
  });

  const deleteSend = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("distribution_sends")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_sends"] });
      toast.success("Send deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete send: " + error.message);
    },
  });

  return {
    sends: sendsQuery.data ?? [],
    isLoading: sendsQuery.isLoading,
    error: sendsQuery.error,
    createSend,
    deleteSend,
  };
}
