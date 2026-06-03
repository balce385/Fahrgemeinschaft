-- ════════════════════════════════════════════════════════════════════
--  tier2_auth_rls.sql
--  Fahrgemeinschaft · TIER 2 — E-Mail-Login (Magic-Link) + Row Level Security
--  --------------------------------------------------------------------
--  Macht aus der offenen Tier-1-Tabelle eine abgesicherte Variante:
--    • jede·r muss angemeldet sein (Supabase Auth, passwortlos)
--    • jede Gruppe hat eine·n Eigentümer·in (owner_id) = Admin
--    • Mitglieder "claimen" ihren Platz (auth.users  ⇄  member.id im JSON)
--    • RLS erzwingt serverseitig: nur Mitglieder/Eigentümer dürfen schreiben
--
--  Idempotent: kann gefahrlos mehrfach ausgeführt werden.
--  Einfügen im Supabase-Dashboard unter  SQL Editor  →  Run.
--
--  WICHTIG: Sobald diese RLS aktiv ist, MUSS die App angemeldet sein
--  (storage.js: VITE_REQUIRE_LOGIN != "false"). Der anonyme Tier-1-Zugriff
--  ist danach gesperrt.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Tabellen ─────────────────────────────────────────────────────

-- Gruppen-Daten. "data" haelt den kompletten Gruppen-State als JSON
-- (members, trips, weeklyAssignments, kmPerTrip, …) — identisch zu Tier 1.
create table if not exists public.groups (
  code        text primary key,
  data        jsonb       not null default '{}'::jsonb,
  owner_id    uuid        references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Falls die Tabelle aus Tier 1 schon existiert: fehlende Spalten ergänzen.
alter table public.groups add column if not exists owner_id   uuid references auth.users (id) on delete set null;
alter table public.groups add column if not exists created_at timestamptz not null default now();
alter table public.groups add column if not exists updated_at timestamptz not null default now();

-- Wer ist welches Mitglied? Verbindet eine·n angemeldete·n User mit der
-- member.id innerhalb des Gruppen-JSON. Pro Gruppe genau ein Platz je User
-- (PK) und jeder Platz nur einmal vergeben (unique) → kein "Platz-Klau".
create table if not exists public.group_members (
  code        text        not null references public.groups (code) on delete cascade,
  user_id     uuid        not null references auth.users (id)      on delete cascade,
  member_id   text        not null,
  created_at  timestamptz not null default now(),
  primary key (code, user_id),
  unique      (code, member_id)
);

-- ── 2. Helfer: ist User Mitglied? (SECURITY DEFINER, umgeht RLS) ─────
-- Wird in der groups-UPDATE-Policy benutzt. Als DEFINER-Funktion vermeidet
-- es, dass beim Prüfen der groups-Policy zusätzlich die group_members-Policy
-- ausgewertet wird (sauberer + schneller, keine Policy-Rekursion).
create or replace function public.is_group_member(p_code text, p_uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where code = p_code and user_id = p_uid
  );
$$;

revoke all on function public.is_group_member(text, uuid) from public;
grant execute on function public.is_group_member(text, uuid) to authenticated;

-- ── 3. Row Level Security aktivieren ────────────────────────────────
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

-- ── 4. Policies: groups ─────────────────────────────────────────────

-- Lesen: jede·r Angemeldete darf eine Gruppe per Code laden (zum Beitreten).
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select
  using (auth.uid() is not null);

-- Anlegen: nur als Eigentümer·in der eigenen Gruppe.
-- (In der Praxis läuft das über die RPC create_group() unten.)
drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups
  for insert
  with check (owner_id = auth.uid());

-- Ändern: Eigentümer·in ODER ein·e geclaimte·s Mitglied der Gruppe.
drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups
  for update
  using (
    owner_id = auth.uid()
    or public.is_group_member(code, auth.uid())
  )
  with check (
    owner_id = auth.uid()
    or public.is_group_member(code, auth.uid())
  );

-- Löschen: nur Eigentümer·in.
drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups
  for delete
  using (owner_id = auth.uid());

-- ── 5. Policies: group_members ──────────────────────────────────────

-- Lesen: eigene Claims + (für Admins) alle Claims der eigenen Gruppen.
drop policy if exists gm_select on public.group_members;
create policy gm_select on public.group_members
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.groups g
      where g.code = group_members.code and g.owner_id = auth.uid()
    )
  );

-- Claimen / Ändern / Lösen: immer nur den EIGENEN Platz.
drop policy if exists gm_insert on public.group_members;
create policy gm_insert on public.group_members
  for insert
  with check (user_id = auth.uid());

drop policy if exists gm_update on public.group_members;
create policy gm_update on public.group_members
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists gm_delete on public.group_members;
create policy gm_delete on public.group_members
  for delete
  using (user_id = auth.uid());

-- ── 6. RPC: Gruppe anlegen (Ersteller·in wird Eigentümer·in/Admin) ──
create or replace function public.create_group(p_code text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.groups (code, data, owner_id, updated_at)
  values (p_code, coalesce(p_data, '{}'::jsonb), auth.uid(), now())
  on conflict (code) do nothing;

  -- Code bereits vergeben und gehört jemand anderem? → Kollision melden.
  if not exists (
    select 1 from public.groups
    where code = p_code and owner_id = auth.uid()
  ) then
    raise exception 'group code % already exists', p_code
      using errcode = 'unique_violation';
  end if;
end;
$$;

revoke all on function public.create_group(text, jsonb) from public;
grant execute on function public.create_group(text, jsonb) to authenticated;

-- ── 7. (Optional) Bestehende Tier-1-Gruppen einer Person zuordnen ───
-- Vor dem Aktivieren von RLS angelegte Gruppen haben owner_id = NULL und
-- wären sonst nicht mehr editierbar. Einmalig die eigene User-ID setzen
-- (zu finden unter  Authentication → Users  im Dashboard):
--
--   update public.groups
--   set owner_id = '00000000-0000-0000-0000-000000000000'  -- ← deine auth.users.id
--   where owner_id is null;
--
-- ════════════════════════════════════════════════════════════════════
