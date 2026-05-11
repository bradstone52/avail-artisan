create table shared_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(10,2),
  paid_by text not null check (paid_by in ('Brad Stone', 'Doug Johannson')),
  expense_date date not null default current_date,
  settled boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table shared_expenses enable row level security;
create policy "Allow all" on shared_expenses for all using (true);
