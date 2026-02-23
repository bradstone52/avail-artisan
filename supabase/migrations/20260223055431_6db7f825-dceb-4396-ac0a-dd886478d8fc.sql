ALTER TABLE public.statutory_holidays 
ADD CONSTRAINT statutory_holidays_date_jurisdiction_unique 
UNIQUE (holiday_date, jurisdiction);