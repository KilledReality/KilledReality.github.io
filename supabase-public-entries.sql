create or replace function public.add_public_campaign_entry(entry_kind text, entry_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_data jsonb;
  current_entries jsonb;
  clean_entry jsonb;
  entry_id text;
  list_key text;
begin
  if entry_kind not in ('character', 'npc') then
    raise exception 'Unsupported entry kind';
  end if;
  if entry_data is null or jsonb_typeof(entry_data) <> 'object' then
    raise exception 'Entry must be a JSON object';
  end if;
  if pg_column_size(entry_data) > 50000 then
    raise exception 'Entry is too large';
  end if;
  if length(trim(coalesce(entry_data ->> 'name', ''))) < 2 then
    raise exception 'Name is required';
  end if;

  list_key := case when entry_kind = 'character' then 'characters' else 'npcs' end;
  entry_id := regexp_replace(coalesce(nullif(entry_data ->> 'id', ''), gen_random_uuid()::text), '[^a-zA-Z0-9_-]', '', 'g');
  clean_entry := entry_data - 'gmNotes' - 'secrets';
  clean_entry := jsonb_set(clean_entry, '{id}', to_jsonb(entry_id), true);
  clean_entry := jsonb_set(clean_entry, '{gmNotes}', '""'::jsonb, true);
  clean_entry := jsonb_set(clean_entry, '{adminOnlyEdit}', 'false'::jsonb, true);
  if entry_kind = 'npc' then
    clean_entry := jsonb_set(clean_entry, '{secrets}', '""'::jsonb, true);
    clean_entry := jsonb_set(clean_entry, '{public}', 'true'::jsonb, true);
  end if;

  select data
    into current_data
    from public.campaign_state
    where id = 'main'
    for update;
  if current_data is null then
    raise exception 'Campaign state is not initialized';
  end if;

  current_entries := coalesce(current_data -> list_key, '[]'::jsonb);
  if jsonb_typeof(current_entries) <> 'array' then
    current_entries := '[]'::jsonb;
  end if;
  if jsonb_array_length(current_entries) >= 1000 then
    raise exception 'Entry limit reached';
  end if;
  if exists (select 1 from jsonb_array_elements(current_entries) item where item ->> 'id' = entry_id) then
    raise exception 'Entry id already exists';
  end if;

  current_data := jsonb_set(current_data, array[list_key], current_entries || jsonb_build_array(clean_entry), true);
  insert into public.campaign_state_backups (
    campaign_id, data, backup_kind, is_weekly, source_updated_at, size_bytes
  )
  select 'main', state.data, 'revision', false, state.updated_at, pg_column_size(state.data)
  from public.campaign_state state
  where state.id = 'main';
  delete from public.campaign_state_backups backup
  where backup.campaign_id = 'main' and backup.backup_kind = 'revision'
    and backup.id not in (
      select recent.id from public.campaign_state_backups recent
      where recent.campaign_id = 'main' and recent.backup_kind = 'revision'
      order by recent.created_at desc limit 30
    );
  update public.campaign_state
    set data = current_data,
        updated_at = now()
    where id = 'main';
  return current_data;
end;
$$;

revoke all on function public.add_public_campaign_entry(text, jsonb) from public;
grant execute on function public.add_public_campaign_entry(text, jsonb) to anon, authenticated;

create or replace function public.update_public_character(character_id text, character_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_data jsonb;
  current_characters jsonb;
  current_character jsonb;
  clean_character jsonb;
  updated_characters jsonb;
begin
  if character_data is null or jsonb_typeof(character_data) <> 'object' then
    raise exception 'Character must be a JSON object';
  end if;
  if pg_column_size(character_data) > 300000 then
    raise exception 'Character data is too large';
  end if;
  if length(trim(coalesce(character_data ->> 'name', ''))) < 2 then
    raise exception 'Character name is required';
  end if;
  if coalesce(character_data ->> 'id', '') <> character_id then
    raise exception 'Character id cannot be changed';
  end if;
  select data
    into current_data
    from public.campaign_state
    where id = 'main'
    for update;
  if current_data is null then
    raise exception 'Campaign state is not initialized';
  end if;

  current_characters := coalesce(current_data -> 'characters', '[]'::jsonb);
  select item
    into current_character
    from jsonb_array_elements(current_characters) item
    where item ->> 'id' = character_id
    limit 1;
  if current_character is null then
    raise exception 'Character not found';
  end if;
  if lower(coalesce(current_character ->> 'adminOnlyEdit', 'false')) = 'true' then
    raise exception 'Character is admin-only';
  end if;
  if left(coalesce(character_data ->> 'portrait', ''), 5) = 'data:'
     and coalesce(character_data ->> 'portrait', '') is distinct from coalesce(current_character ->> 'portrait', '') then
    raise exception 'Portrait must be uploaded to Storage';
  end if;

  clean_character := character_data - 'gmNotes' - 'adminOnlyEdit';
  clean_character := jsonb_set(
    clean_character,
    '{gmNotes}',
    coalesce(current_character -> 'gmNotes', '""'::jsonb),
    true
  );
  clean_character := jsonb_set(
    clean_character,
    '{adminOnlyEdit}',
    coalesce(current_character -> 'adminOnlyEdit', 'false'::jsonb),
    true
  );

  select jsonb_agg(
    case when item ->> 'id' = character_id then clean_character else item end
    order by ord
  )
    into updated_characters
    from jsonb_array_elements(current_characters) with ordinality entries(item, ord);

  current_data := jsonb_set(current_data, '{characters}', coalesce(updated_characters, '[]'::jsonb), true);
  insert into public.campaign_state_backups (
    campaign_id, data, backup_kind, is_weekly, source_updated_at, size_bytes
  )
  select 'main', state.data, 'revision', false, state.updated_at, pg_column_size(state.data)
  from public.campaign_state state
  where state.id = 'main';
  delete from public.campaign_state_backups backup
  where backup.campaign_id = 'main' and backup.backup_kind = 'revision'
    and backup.id not in (
      select recent.id from public.campaign_state_backups recent
      where recent.campaign_id = 'main' and recent.backup_kind = 'revision'
      order by recent.created_at desc limit 30
    );
  update public.campaign_state
    set data = current_data,
        updated_at = now()
    where id = 'main';
  return current_data;
end;
$$;

revoke all on function public.update_public_character(text, jsonb) from public;
grant execute on function public.update_public_character(text, jsonb) to anon, authenticated;

create or replace function public.update_public_npc(npc_id text, npc_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_data jsonb;
  current_npcs jsonb;
  current_npc jsonb;
  clean_npc jsonb;
  updated_npcs jsonb;
begin
  if npc_data is null or jsonb_typeof(npc_data) <> 'object' then
    raise exception 'NPC must be a JSON object';
  end if;
  if pg_column_size(npc_data) > 300000 then
    raise exception 'NPC data is too large';
  end if;
  if length(trim(coalesce(npc_data ->> 'name', ''))) < 2 then
    raise exception 'NPC name is required';
  end if;
  if coalesce(npc_data ->> 'id', '') <> npc_id then
    raise exception 'NPC id cannot be changed';
  end if;
  select data
    into current_data
    from public.campaign_state
    where id = 'main'
    for update;
  if current_data is null then
    raise exception 'Campaign state is not initialized';
  end if;

  current_npcs := coalesce(current_data -> 'npcs', '[]'::jsonb);
  select item
    into current_npc
    from jsonb_array_elements(current_npcs) item
    where item ->> 'id' = npc_id
    limit 1;
  if current_npc is null then
    raise exception 'NPC not found';
  end if;
  if lower(coalesce(current_npc ->> 'public', 'true')) <> 'true' then
    raise exception 'NPC is not public';
  end if;
  if lower(coalesce(current_npc ->> 'adminOnlyEdit', 'false')) = 'true' then
    raise exception 'NPC is admin-only';
  end if;
  if left(coalesce(npc_data ->> 'portrait', ''), 5) = 'data:'
     and coalesce(npc_data ->> 'portrait', '') is distinct from coalesce(current_npc ->> 'portrait', '') then
    raise exception 'Portrait must be uploaded to Storage';
  end if;

  clean_npc := npc_data - 'gmNotes' - 'secrets' - 'adminOnlyEdit' - 'public';
  clean_npc := jsonb_set(clean_npc, '{gmNotes}', coalesce(current_npc -> 'gmNotes', '""'::jsonb), true);
  clean_npc := jsonb_set(clean_npc, '{secrets}', coalesce(current_npc -> 'secrets', '""'::jsonb), true);
  clean_npc := jsonb_set(
    clean_npc,
    '{adminOnlyEdit}',
    coalesce(current_npc -> 'adminOnlyEdit', 'false'::jsonb),
    true
  );
  clean_npc := jsonb_set(clean_npc, '{public}', coalesce(current_npc -> 'public', 'true'::jsonb), true);

  select jsonb_agg(
    case when item ->> 'id' = npc_id then clean_npc else item end
    order by ord
  )
    into updated_npcs
    from jsonb_array_elements(current_npcs) with ordinality entries(item, ord);

  current_data := jsonb_set(current_data, '{npcs}', coalesce(updated_npcs, '[]'::jsonb), true);
  insert into public.campaign_state_backups (
    campaign_id, data, backup_kind, is_weekly, source_updated_at, size_bytes
  )
  select 'main', state.data, 'revision', false, state.updated_at, pg_column_size(state.data)
  from public.campaign_state state
  where state.id = 'main';
  delete from public.campaign_state_backups backup
  where backup.campaign_id = 'main' and backup.backup_kind = 'revision'
    and backup.id not in (
      select recent.id from public.campaign_state_backups recent
      where recent.campaign_id = 'main' and recent.backup_kind = 'revision'
      order by recent.created_at desc limit 30
    );
  update public.campaign_state
    set data = current_data,
        updated_at = now()
    where id = 'main';
  return current_data;
end;
$$;

revoke all on function public.update_public_npc(text, jsonb) from public;
grant execute on function public.update_public_npc(text, jsonb) to anon, authenticated;

drop policy if exists "Public character portrait uploads" on storage.objects;
create policy "Public character portrait uploads"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'ashana-media'
  and (storage.foldername(name))[1] = 'characters'
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'gif')
);

drop policy if exists "Public NPC portrait uploads" on storage.objects;
create policy "Public NPC portrait uploads"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'ashana-media'
  and (storage.foldername(name))[1] = 'npcs'
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'gif')
);

do $$
begin
  alter publication supabase_realtime add table public.campaign_state;
exception
  when duplicate_object then null;
end $$;

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

notify pgrst, 'reload schema';
