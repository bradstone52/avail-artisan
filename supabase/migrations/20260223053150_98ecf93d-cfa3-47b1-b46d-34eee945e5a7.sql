ALTER TABLE deals
  ADD COLUMN lease_rate_psf numeric,
  ADD COLUMN lease_term_months integer,
  ADD COLUMN commencement_date date,
  ADD COLUMN expiry_date date;