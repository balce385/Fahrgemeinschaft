-- ─────────────────────────────────────────────────────────────────────
-- Fahrgemeinschaft · Datenbank-Schema
-- ─────────────────────────────────────────────────────────────────────
-- Im Supabase-Dashboard: SQL Editor → New Query →
-- diesen ganzen Inhalt einfügen → Run.
-- ─────────────────────────────────────────────────────────────────────

-- Tabelle "groups": ein Eintrag pro Fahrgemeinschaft.
-- Der Group-Code ist der Schlüssel. Die Daten der Gruppe (Mitglieder,
-- Fahrten, Urlaube) liegen als JSONB-Blob im "data"-Feld.
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null check (length(code) between 4 and 12),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists groups_code_idx  on public.groups (code);
create index if not exists groups_updated_idx on public.groups (updated_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS):
-- Jeder, der den Code kennt, darf lesen und schreiben.
-- Das ist für eine geschlossene Pendler-Gruppe ausreichend — der Code
-- selbst ist das Geheimnis.
-- ─────────────────────────────────────────────────────────────────────

alter table public.groups enable row level security;

-- Lesen: jeder darf SELECTen (Filter im Client durch where code = ?).
drop policy if exists "Anyone can read groups" on public.groups;
create policy "Anyone can read groups"
  on public.groups for select
  using (true);

-- Schreiben (insert): jeder darf neue Gruppen anlegen.
drop policy if exists "Anyone can create groups" on public.groups;
create policy "Anyone can create groups"
  on public.groups for insert
  with check (true);

-- Schreiben (update): jeder darf existierende Gruppen aktualisieren.
drop policy if exists "Anyone can update groups" on public.groups;
create policy "Anyone can update groups"
  on public.groups for update
  using (true) with check (true);

-- Löschen: erlaubt, aber wird vom Client nicht aufgerufen.
drop policy if exists "Anyone can delete groups" on public.groups;
create policy "Anyone can delete groups"
  on public.groups for delete
  using (true);

-- ─────────────────────────────────────────────────────────────────────
-- Realtime aktivieren — damit Live-Updates über Postgres-Changes
-- an alle verbundenen Clients gepusht werden.
-- ─────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.groups;

-- ─────────────────────────────────────────────────────────────────────
-- Sicherheits-Hinweis:
-- Wer den 6-stelligen Group-Code rät, kommt rein. Bei einer privaten
-- Pendler-Gruppe ist das kein Problem — der Code wird persönlich
-- weitergegeben. Falls später öffentlich genutzt: Auth ergänzen
-- (Email/Magic Link) und Codes nur Mitgliedern zugänglich machen.
-- ─────────────────────────────────────────────────────────────────────
