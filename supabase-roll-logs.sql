create table if not exists public.roll_logs (
  id text primary key,
  actor text not null default 'Партия',
  label text not null default '',
  formula text not null,
  rolls jsonb not null default '[]'::jsonb,
  total integer not null,
  created_at timestamptz not null default now()
);

create index if not exists roll_logs_created_at_idx
  on public.roll_logs (created_at desc);

alter table public.roll_logs enable row level security;

drop policy if exists "roll logs are readable by everyone" on public.roll_logs;
create policy "roll logs are readable by everyone"
  on public.roll_logs
  for select
  using (true);

drop policy if exists "roll logs can be inserted by everyone" on public.roll_logs;
create policy "roll logs can be inserted by everyone"
  on public.roll_logs
  for insert
  with check (true);

drop policy if exists "roll logs can be deleted by admins" on public.roll_logs;
create policy "roll logs can be deleted by admins"
  on public.roll_logs
  for delete
  using (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.role = 'admin'
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.roll_logs;
exception
  when duplicate_object then null;
end $$;
