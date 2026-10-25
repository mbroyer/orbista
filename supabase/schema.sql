-- Entwurf, noch nicht eingebunden. Konten mit Benutzername und PIN.
-- Annahme: Anmeldung über Supabase Auth mit synthetischer E-Mail (<benutzername>@flaggo.local) und PIN als Passwort.

create table public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  country text not null,            -- ISO-Kürzel, z. B. 'DE'
  right_count int not null default 0,
  wrong_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, country)
);

alter table public.progress enable row level security;

create policy "eigener Fortschritt lesen"  on public.progress for select using (auth.uid() = user_id);
create policy "eigener Fortschritt anlegen" on public.progress for insert with check (auth.uid() = user_id);
create policy "eigener Fortschritt ändern" on public.progress for update using (auth.uid() = user_id);
