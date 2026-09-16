begin;

create extension if not exists pg_cron with schema extensions;

create or replace function public.is_campaign_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

revoke all on function public.is_campaign_admin() from public;
grant execute on function public.is_campaign_admin() to authenticated;

create table if not exists public.campaign_trash (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null default gen_random_uuid(),
  campaign_id text not null default 'main',
  item_type text not null,
  item_label text not null,
  restore_path jsonb not null,
  item_index integer not null default 0,
  item_data jsonb not null,
  deleted_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  deleted_by uuid references auth.users(id) on delete set null
);

create index if not exists campaign_trash_campaign_deleted_idx
  on public.campaign_trash (campaign_id, deleted_at desc);
create index if not exists campaign_trash_expiry_idx
  on public.campaign_trash (expires_at);
create index if not exists campaign_trash_batch_idx
  on public.campaign_trash (batch_id);

alter table public.campaign_trash enable row level security;

drop policy if exists "Admins can read campaign trash" on public.campaign_trash;
create policy "Admins can read campaign trash"
on public.campaign_trash
for select
to authenticated
using (public.is_campaign_admin());

drop policy if exists "Admins can delete campaign trash" on public.campaign_trash;
create policy "Admins can delete campaign trash"
on public.campaign_trash
for delete
to authenticated
using (public.is_campaign_admin());

revoke all on table public.campaign_trash from anon;
revoke all on table public.campaign_trash from authenticated;
grant select, delete on table public.campaign_trash to authenticated;

create table if not exists public.campaign_state_backups (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null default 'main',
  data jsonb not null,
  backup_kind text not null default 'daily',
  is_weekly boolean not null default false,
  created_at timestamptz not null default now(),
  source_updated_at timestamptz,
  size_bytes bigint not null default 0
);

create index if not exists campaign_backups_campaign_created_idx
  on public.campaign_state_backups (campaign_id, created_at desc);
create index if not exists campaign_backups_kind_idx
  on public.campaign_state_backups (campaign_id, backup_kind, created_at desc);

alter table public.campaign_state_backups enable row level security;

drop policy if exists "Admins can read campaign backups" on public.campaign_state_backups;
create policy "Admins can read campaign backups"
on public.campaign_state_backups
for select
to authenticated
using (public.is_campaign_admin());

revoke all on table public.campaign_state_backups from anon;
revoke all on table public.campaign_state_backups from authenticated;
grant select on table public.campaign_state_backups to authenticated;

create or replace function public.save_campaign_state_with_trash(
  p_data jsonb,
  p_trash_entries jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry jsonb;
  v_batch_id uuid := gen_random_uuid();
begin
  if not public.is_campaign_admin() then
    raise exception 'Admin access required';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Campaign data must be a JSON object';
  end if;
  if p_trash_entries is null or jsonb_typeof(p_trash_entries) <> 'array' then
    raise exception 'Trash entries must be a JSON array';
  end if;

  delete from public.campaign_trash
  where expires_at <= now();

  for v_entry in
    select value from jsonb_array_elements(p_trash_entries)
  loop
    if jsonb_typeof(v_entry -> 'itemData') = 'object'
       and jsonb_typeof(v_entry -> 'restorePath') = 'array' then
      insert into public.campaign_trash (
        batch_id,
        campaign_id,
        item_type,
        item_label,
        restore_path,
        item_index,
        item_data,
        deleted_by
      ) values (
        v_batch_id,
        'main',
        left(coalesce(nullif(v_entry ->> 'itemType', ''), 'Объект'), 120),
        left(coalesce(nullif(v_entry ->> 'itemLabel', ''), 'Без названия'), 240),
        v_entry -> 'restorePath',
        greatest(0, coalesce((v_entry ->> 'itemIndex')::integer, 0)),
        v_entry -> 'itemData',
        auth.uid()
      );
    end if;
  end loop;

  insert into public.campaign_state (id, data, updated_at, updated_by)
  values ('main', p_data, now(), auth.uid())
  on conflict (id) do update
    set data = excluded.data,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;

  return p_data;
end;
$$;

revoke all on function public.save_campaign_state_with_trash(jsonb, jsonb) from public;
grant execute on function public.save_campaign_state_with_trash(jsonb, jsonb) to authenticated;

create or replace function public.save_campaign_state_guarded(
  p_data jsonb,
  p_trash_entries jsonb default '[]'::jsonb,
  p_expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry jsonb;
  v_batch_id uuid := gen_random_uuid();
  v_current_data jsonb;
  v_current_updated_at timestamptz;
  v_new_updated_at timestamptz := clock_timestamp();
  v_exists boolean := false;
begin
  if not public.is_campaign_admin() then
    raise exception 'Admin access required';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Campaign data must be a JSON object';
  end if;
  if p_trash_entries is null or jsonb_typeof(p_trash_entries) <> 'array' then
    raise exception 'Trash entries must be a JSON array';
  end if;

  select data, updated_at
    into v_current_data, v_current_updated_at
    from public.campaign_state
    where id = 'main'
    for update;
  v_exists := found;

  if v_exists and (p_expected_updated_at is null or v_current_updated_at is distinct from p_expected_updated_at) then
    raise exception 'CAMPAIGN_VERSION_CONFLICT: expected %, current %', p_expected_updated_at, v_current_updated_at;
  end if;
  if not v_exists and p_expected_updated_at is not null then
    raise exception 'CAMPAIGN_VERSION_CONFLICT: campaign was removed or replaced';
  end if;

  if v_exists
     and v_current_data is not distinct from p_data
     and jsonb_array_length(p_trash_entries) = 0 then
    return jsonb_build_object(
      'updated_at', v_current_updated_at,
      'backup_created', false
    );
  end if;

  delete from public.campaign_trash where expires_at <= now();

  if v_exists and v_current_data is distinct from p_data then
    insert into public.campaign_state_backups (
      campaign_id, data, backup_kind, is_weekly, source_updated_at, size_bytes
    ) values (
      'main', v_current_data, 'revision', false, v_current_updated_at, pg_column_size(v_current_data)
    );
  end if;

  for v_entry in select value from jsonb_array_elements(p_trash_entries)
  loop
    if jsonb_typeof(v_entry -> 'itemData') = 'object'
       and jsonb_typeof(v_entry -> 'restorePath') = 'array' then
      insert into public.campaign_trash (
        batch_id, campaign_id, item_type, item_label, restore_path,
        item_index, item_data, deleted_by
      ) values (
        v_batch_id,
        'main',
        left(coalesce(nullif(v_entry ->> 'itemType', ''), 'Объект'), 120),
        left(coalesce(nullif(v_entry ->> 'itemLabel', ''), 'Без названия'), 240),
        v_entry -> 'restorePath',
        greatest(0, coalesce((v_entry ->> 'itemIndex')::integer, 0)),
        v_entry -> 'itemData',
        auth.uid()
      );
    end if;
  end loop;

  insert into public.campaign_state (id, data, updated_at, updated_by)
  values ('main', p_data, v_new_updated_at, auth.uid())
  on conflict (id) do update
    set data = excluded.data,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;

  delete from public.campaign_state_backups backup
  where backup.campaign_id = 'main'
    and backup.backup_kind = 'revision'
    and backup.id not in (
      select recent.id
      from public.campaign_state_backups recent
      where recent.campaign_id = 'main'
        and recent.backup_kind = 'revision'
      order by recent.created_at desc
      limit 30
    );

  return jsonb_build_object(
    'updated_at', v_new_updated_at,
    'backup_created', v_exists and v_current_data is distinct from p_data
  );
end;
$$;

revoke all on function public.save_campaign_state_guarded(jsonb, jsonb, timestamptz) from public;
grant execute on function public.save_campaign_state_guarded(jsonb, jsonb, timestamptz) to authenticated;

-- Old cached tabs must refresh instead of overwriting a newer campaign snapshot.
create or replace function public.save_campaign_state_with_trash(
  p_data jsonb,
  p_trash_entries jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_campaign_admin() then
    raise exception 'Admin access required';
  end if;
  raise exception 'CLIENT_UPDATE_REQUIRED: refresh the Ashana site before saving';
end;
$$;

create or replace function public.create_campaign_backup(p_kind text default 'daily')
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_data jsonb;
  v_updated_at timestamptz;
  v_backup_id uuid;
  v_is_monday boolean;
  v_kind text;
begin
  if auth.uid() is not null and not public.is_campaign_admin() then
    raise exception 'Admin access required';
  end if;

  select data, updated_at
    into v_data, v_updated_at
    from public.campaign_state
    where id = 'main';

  if v_data is null then
    raise exception 'Campaign state is not initialized';
  end if;

  v_is_monday := extract(isodow from (now() at time zone 'Europe/Berlin')) = 1;
  v_kind := case when v_is_monday then 'weekly' else 'daily' end;

  insert into public.campaign_state_backups (
    campaign_id,
    data,
    backup_kind,
    is_weekly,
    source_updated_at,
    size_bytes
  ) values (
    'main',
    v_data,
    v_kind,
    v_kind = 'weekly',
    v_updated_at,
    pg_column_size(v_data)
  )
  returning id into v_backup_id;

  delete from public.campaign_state_backups backup
  where backup.campaign_id = 'main'
    and backup.backup_kind = 'daily'
    and backup.id not in (
      select recent.id
      from public.campaign_state_backups recent
      where recent.campaign_id = 'main'
        and recent.backup_kind = 'daily'
      order by recent.created_at desc
      limit 7
    );

  delete from public.campaign_trash
  where expires_at <= now();

  return v_backup_id;
end;
$$;

revoke all on function public.create_campaign_backup(text) from public;
grant execute on function public.create_campaign_backup(text) to authenticated;

create or replace function public.restore_campaign_backup(p_backup_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_data jsonb;
begin
  if not public.is_campaign_admin() then
    raise exception 'Admin access required';
  end if;

  select data
    into v_data
    from public.campaign_state_backups
    where id = p_backup_id
      and campaign_id = 'main';

  if v_data is null then
    raise exception 'Backup not found';
  end if;

  perform public.create_campaign_backup('daily');

  update public.campaign_state
    set data = v_data,
        updated_at = now(),
        updated_by = auth.uid()
    where id = 'main';

  return v_data;
end;
$$;

revoke all on function public.restore_campaign_backup(uuid) from public;
grant execute on function public.restore_campaign_backup(uuid) to authenticated;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'ashana-daily-campaign-backup'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'ashana-daily-campaign-backup',
    '15 2 * * *',
    'select public.create_campaign_backup(''daily'');'
  );
end;
$$;

do $$
begin
  update public.campaign_state_backups
    set backup_kind = case when is_weekly then 'weekly' else 'daily' end
    where backup_kind not in ('daily', 'weekly', 'revision');

  if not exists (
    select 1 from public.campaign_state_backups where campaign_id = 'main'
  ) then
    perform public.create_campaign_backup('daily');
  end if;
end;
$$;

insert into public.campaign_state_backups (
  campaign_id, data, backup_kind, is_weekly, source_updated_at, size_bytes
)
select 'main', state.data, 'revision', false, state.updated_at, pg_column_size(state.data)
from public.campaign_state state
where state.id = 'main'
  and not exists (
    select 1
    from public.campaign_state_backups backup
    where backup.campaign_id = 'main'
      and backup.backup_kind = 'revision'
      and backup.source_updated_at = state.updated_at
  );

notify pgrst, 'reload schema';

commit;
