-- Drop the existing admin-only policy for distribution_recipients
DROP POLICY IF EXISTS "Admins can manage recipients" ON public.distribution_recipients;

-- Create new policies allowing org members to manage recipients
CREATE POLICY "Org members can view recipients" 
ON public.distribution_recipients 
FOR SELECT 
USING (true);

CREATE POLICY "Org members can insert recipients" 
ON public.distribution_recipients 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Org members can update recipients" 
ON public.distribution_recipients 
FOR UPDATE 
USING (true);

CREATE POLICY "Org members can delete recipients" 
ON public.distribution_recipients 
FOR DELETE 
USING (true);