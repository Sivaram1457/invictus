create table if not exists public.player_registration_requests (
  id uuid primary key default gen_random_uuid(),
  source_submission_id text not null,
  player_name text not null,
  efootball_id text,
  profile_photo_reference text,
  squad_photo_reference text,
  requested_team text,
  contact_reference text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid,
  rejection_reason text,
  created_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_registration_requests_source_submission_key unique (source_submission_id)
);

create index if not exists player_registration_requests_status_idx
  on public.player_registration_requests(status, submitted_at desc);

create unique index if not exists players_efootball_id_unique_idx
  on public.players(efootball_id)
  where efootball_id is not null and length(trim(efootball_id)) > 0;

alter table public.player_registration_requests enable row level security;

revoke all on public.player_registration_requests from anon, authenticated;

create policy player_registration_requests_admin_read
  on public.player_registration_requests for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy player_registration_requests_admin_update
  on public.player_registration_requests for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.touch_player_registration_request_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_registration_requests_updated_at on public.player_registration_requests;
create trigger player_registration_requests_updated_at
before update on public.player_registration_requests
for each row execute function public.touch_player_registration_request_updated_at();
