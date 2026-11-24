-- Run once in a new BetterMe Supabase project.
create table public.entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_key text not null check (length(entry_key) between 1 and 200),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 65536),
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_key)
);
alter table public.entries enable row level security;
revoke all on public.entries from anon;
grant select, insert, update on public.entries to authenticated;
create policy "Read own entries" on public.entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own entries" on public.entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own entries" on public.entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create function public.touch_betterme_entry() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger betterme_updated_at before update on public.entries for each row execute function public.touch_betterme_entry();
