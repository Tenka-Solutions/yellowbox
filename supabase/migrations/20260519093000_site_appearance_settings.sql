-- Global visual appearance settings for HubCafe.
-- The frontend keeps CSS defaults in src/app/globals.css and only reads this
-- row when Supabase is available.

create table if not exists public.site_appearance_settings (
  id uuid primary key default gen_random_uuid(),
  site_key text unique not null default 'hubcafe',
  settings jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint site_appearance_settings_site_key_not_blank
    check (length(trim(site_key)) > 0),
  constraint site_appearance_settings_settings_object
    check (jsonb_typeof(settings) = 'object')
);

drop trigger if exists site_appearance_settings_set_updated_at
on public.site_appearance_settings;

create trigger site_appearance_settings_set_updated_at
before update on public.site_appearance_settings
for each row
execute function public.set_updated_at();

alter table public.site_appearance_settings enable row level security;

drop policy if exists "Public can read site appearance settings"
on public.site_appearance_settings;

create policy "Public can read site appearance settings"
on public.site_appearance_settings
for select
using (site_key = 'hubcafe');

drop policy if exists "Admins manage site appearance settings"
on public.site_appearance_settings;

create policy "Admins manage site appearance settings"
on public.site_appearance_settings
for all
using (
  public.has_role('super_admin')
  or public.has_role('catalog_editor')
)
with check (
  site_key = 'hubcafe'
  and (
    public.has_role('super_admin')
    or public.has_role('catalog_editor')
  )
);
