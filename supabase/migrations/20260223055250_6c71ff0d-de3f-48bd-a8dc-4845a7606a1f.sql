
-- Table to store statutory holidays (Alberta/Canada)
CREATE TABLE public.statutory_holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  holiday_date date NOT NULL,
  name text NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'AB',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate dates
CREATE UNIQUE INDEX idx_statutory_holidays_date ON public.statutory_holidays (holiday_date);

-- Enable RLS
ALTER TABLE public.statutory_holidays ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read holidays
CREATE POLICY "Authenticated users can view holidays"
ON public.statutory_holidays FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage holidays
CREATE POLICY "Admins can manage holidays"
ON public.statutory_holidays FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Seed Alberta statutory holidays for 2025-2030
-- Alberta observes: New Year's, Family Day (3rd Mon Feb), Good Friday, Victoria Day (Mon before May 25),
-- Canada Day (Jul 1), Heritage Day (1st Mon Aug - AB specific), Labour Day (1st Mon Sep),
-- Thanksgiving (2nd Mon Oct), Remembrance Day (Nov 11), Christmas Day (Dec 25)

INSERT INTO public.statutory_holidays (holiday_date, name, jurisdiction) VALUES
-- 2025
('2025-01-01', 'New Year''s Day', 'AB'),
('2025-02-17', 'Family Day', 'AB'),
('2025-04-18', 'Good Friday', 'AB'),
('2025-05-19', 'Victoria Day', 'AB'),
('2025-07-01', 'Canada Day', 'AB'),
('2025-08-04', 'Heritage Day', 'AB'),
('2025-09-01', 'Labour Day', 'AB'),
('2025-10-13', 'Thanksgiving', 'AB'),
('2025-11-11', 'Remembrance Day', 'AB'),
('2025-12-25', 'Christmas Day', 'AB'),
-- 2026
('2026-01-01', 'New Year''s Day', 'AB'),
('2026-02-16', 'Family Day', 'AB'),
('2026-04-03', 'Good Friday', 'AB'),
('2026-05-18', 'Victoria Day', 'AB'),
('2026-07-01', 'Canada Day', 'AB'),
('2026-08-03', 'Heritage Day', 'AB'),
('2026-09-07', 'Labour Day', 'AB'),
('2026-10-12', 'Thanksgiving', 'AB'),
('2026-11-11', 'Remembrance Day', 'AB'),
('2026-12-25', 'Christmas Day', 'AB'),
-- 2027
('2027-01-01', 'New Year''s Day', 'AB'),
('2027-02-15', 'Family Day', 'AB'),
('2027-03-26', 'Good Friday', 'AB'),
('2027-05-24', 'Victoria Day', 'AB'),
('2027-07-01', 'Canada Day', 'AB'),
('2027-08-02', 'Heritage Day', 'AB'),
('2027-09-06', 'Labour Day', 'AB'),
('2027-10-11', 'Thanksgiving', 'AB'),
('2027-11-11', 'Remembrance Day', 'AB'),
('2027-12-25', 'Christmas Day', 'AB'),
-- 2028
('2028-01-01', 'New Year''s Day', 'AB'),
('2028-02-21', 'Family Day', 'AB'),
('2028-04-14', 'Good Friday', 'AB'),
('2028-05-22', 'Victoria Day', 'AB'),
('2028-07-01', 'Canada Day', 'AB'),
('2028-08-07', 'Heritage Day', 'AB'),
('2028-09-04', 'Labour Day', 'AB'),
('2028-10-09', 'Thanksgiving', 'AB'),
('2028-11-11', 'Remembrance Day', 'AB'),
('2028-12-25', 'Christmas Day', 'AB'),
-- 2029
('2029-01-01', 'New Year''s Day', 'AB'),
('2029-02-19', 'Family Day', 'AB'),
('2029-03-30', 'Good Friday', 'AB'),
('2029-05-21', 'Victoria Day', 'AB'),
('2029-07-01', 'Canada Day', 'AB'),
('2029-08-06', 'Heritage Day', 'AB'),
('2029-09-03', 'Labour Day', 'AB'),
('2029-10-08', 'Thanksgiving', 'AB'),
('2029-11-11', 'Remembrance Day', 'AB'),
('2029-12-25', 'Christmas Day', 'AB'),
-- 2030
('2030-01-01', 'New Year''s Day', 'AB'),
('2030-02-18', 'Family Day', 'AB'),
('2030-04-19', 'Good Friday', 'AB'),
('2030-05-20', 'Victoria Day', 'AB'),
('2030-07-01', 'Canada Day', 'AB'),
('2030-08-05', 'Heritage Day', 'AB'),
('2030-09-02', 'Labour Day', 'AB'),
('2030-10-14', 'Thanksgiving', 'AB'),
('2030-11-11', 'Remembrance Day', 'AB'),
('2030-12-25', 'Christmas Day', 'AB');
