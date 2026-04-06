-- VOC Calculator data tables
-- Run this in the Supabase SQL editor for your project.

-- ── saved_analyses ─────────────────────────────────────────────────────────

create table if not exists public.saved_analyses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  label       text not null,
  item        jsonb not null
);

alter table public.saved_analyses enable row level security;

create policy "Users can view their own saved analyses"
  on public.saved_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved analyses"
  on public.saved_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved analyses"
  on public.saved_analyses for delete
  using (auth.uid() = user_id);

create index on public.saved_analyses (user_id, created_at desc);

-- ── search_history ─────────────────────────────────────────────────────────

create table if not exists public.search_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  searched_at timestamptz not null default now(),
  label       text not null,
  item        jsonb not null
);

alter table public.search_history enable row level security;

create policy "Users can view their own search history"
  on public.search_history for select
  using (auth.uid() = user_id);

create policy "Users can insert their own search history"
  on public.search_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own search history"
  on public.search_history for delete
  using (auth.uid() = user_id);

create index on public.search_history (user_id, searched_at desc);

-- Keep at most 50 history entries per user (trigger)
create or replace function public.trim_search_history()
returns trigger language plpgsql as $$
begin
  delete from public.search_history
  where id in (
    select id from public.search_history
    where user_id = new.user_id
    order by searched_at desc
    offset 50
  );
  return new;
end;
$$;

create trigger trim_search_history_after_insert
  after insert on public.search_history
  for each row execute function public.trim_search_history();

-- ── expense_log ────────────────────────────────────────────────────────────

create table if not exists public.expense_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  analysis_id  uuid references public.saved_analyses(id) on delete set null,
  logged_at    timestamptz not null default now(),
  category     text not null, -- fuel | maintenance | insurance | repair | other
  description  text not null,
  amount       numeric(10,2) not null,
  mileage      integer,
  vendor       text,
  under_warranty boolean default false
);

alter table public.expense_log enable row level security;

create policy "Users can manage their own expense log"
  on public.expense_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.expense_log (user_id, logged_at desc);
create index on public.expense_log (analysis_id);
