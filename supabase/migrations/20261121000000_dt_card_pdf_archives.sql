insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dt-card-archives',
  'dt-card-archives',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Active group members can read DT card archives"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'dt-card-archives'
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
      and gm.status = 'activo'
  )
);

create policy "Group admins can add DT card archives"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'dt-card-archives'
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
      and gm.status = 'activo'
      and gm.role = 'admin'
  )
);

create policy "Group admins can update DT card archives"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'dt-card-archives'
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
      and gm.status = 'activo'
      and gm.role = 'admin'
  )
)
with check (
  bucket_id = 'dt-card-archives'
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
      and gm.status = 'activo'
      and gm.role = 'admin'
  )
);
