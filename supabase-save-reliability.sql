begin;

create or replace function public.save_campaign_state_resilient(
  p_data jsonb,
  p_trash_entries jsonb default '[]'::jsonb,
  p_expected_updated_at timestamptz default null,
  p_client_version text default null
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
  if p_client_version is distinct from '2026-08-27.1' then
    raise exception 'CLIENT_UPDATE_REQUIRED: refresh the Ashana site before saving';
  end if;
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

revoke all on function public.save_campaign_state_resilient(jsonb, jsonb, timestamptz, text) from public;
grant execute on function public.save_campaign_state_resilient(jsonb, jsonb, timestamptz, text) to authenticated;

-- Prevent cached clients from competing with the resilient save protocol.
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
begin
  if not public.is_campaign_admin() then
    raise exception 'Admin access required';
  end if;
  raise exception 'CLIENT_UPDATE_REQUIRED: refresh the Ashana site before saving';
end;
$$;

revoke all on function public.save_campaign_state_guarded(jsonb, jsonb, timestamptz) from public;
grant execute on function public.save_campaign_state_guarded(jsonb, jsonb, timestamptz) to authenticated;

notify pgrst, 'reload schema';

commit;
