begin;

alter table public.leads
  add column if not exists website text,
  add column if not exists instagram text;

update public.leads
set website = null
where website is not null
  and btrim(website) = '';

update public.leads
set instagram = null
where instagram is not null
  and btrim(instagram) = '';

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'leads_website_not_blank'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_website_not_blank
      check (website is null or btrim(website) <> '');
  end if;
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'leads_instagram_not_blank'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_instagram_not_blank
      check (instagram is null or btrim(instagram) <> '');
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
