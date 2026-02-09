
CREATE TABLE public.deal_important_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_important_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deal important dates" ON public.deal_important_dates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_important_dates.deal_id AND deals.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deals d JOIN public.org_members om ON om.org_id = d.org_id WHERE d.id = deal_important_dates.deal_id AND om.user_id = auth.uid())
  );

CREATE POLICY "Users can insert deal important dates" ON public.deal_important_dates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_important_dates.deal_id AND deals.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deals d JOIN public.org_members om ON om.org_id = d.org_id WHERE d.id = deal_important_dates.deal_id AND om.user_id = auth.uid())
  );

CREATE POLICY "Users can update deal important dates" ON public.deal_important_dates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_important_dates.deal_id AND deals.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deals d JOIN public.org_members om ON om.org_id = d.org_id WHERE d.id = deal_important_dates.deal_id AND om.user_id = auth.uid())
  );

CREATE POLICY "Users can delete deal important dates" ON public.deal_important_dates
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_important_dates.deal_id AND deals.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deals d JOIN public.org_members om ON om.org_id = d.org_id WHERE d.id = deal_important_dates.deal_id AND om.user_id = auth.uid())
  );
