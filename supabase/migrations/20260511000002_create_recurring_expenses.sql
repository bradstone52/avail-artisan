create table recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(10,2) not null,
  paid_by text not null check (paid_by in ('Brad Stone', 'Doug Johannson')),
  frequency text not null check (frequency in ('monthly', 'quarterly', 'annual')),
  next_due date not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
alter table recurring_expenses enable row level security;
create policy "Allow all" on recurring_expenses for all using (true);
