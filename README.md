# Fahrgemeinschaft · Pendler-PWA

Eine Web-App, die sich auf iPhone und Android wie eine echte App verhält.
Alle Mitglieder eurer Fahrgemeinschaft sehen denselben Plan auf ihren
eigenen Geräten — kostenlos, ohne App Store, ohne Apple Developer Account.

**Features**
- Wer fährt diese Woche · wöchentlicher Wechsel · faire Aufteilung
- Tägliche Vertretung bei Krankheit/Urlaub
- Voraus-Planung für Urlaub & Krankheit
- Sachsen-Feiertage automatisch
- Echtzeit-Sync zwischen allen Geräten
- Kalender-Export (.ics) für iOS & Android
- Auf Homescreen installierbar (Vollbild, eigenes Icon)

---

## Was du brauchst (alles kostenlos)

| Tool | Wofür | Konto erstellen |
|------|-------|----------------|
| **Node.js** | Lokal die App bauen | https://nodejs.org (Version 20 oder neuer) |
| **Supabase** | Daten-Backend (Datenbank + Live-Sync) | https://supabase.com |
| **Vercel** | App im Internet hosten | https://vercel.com |
| **GitHub** | Code-Speicher (Vercel zieht von dort) | https://github.com |

Reine Anlege-Zeit für die Konten: ~10 Minuten. Alle haben kostenlose
Stufen, die für eine private Pendler-Gruppe locker reichen.

---

## Schritt 1 · Supabase einrichten

**1.1** Geh auf https://supabase.com und melde dich an (am einfachsten
mit GitHub).

**1.2** Klick **New project**. Wähle:
- **Name**: `fahrgemeinschaft` (egal welcher Name)
- **Database Password**: gib ein starkes Passwort ein (musst du dir
  nicht merken — du brauchst es nicht für die App)
- **Region**: **Frankfurt (eu-central-1)** — wichtig für niedrige
  Latenz aus Deutschland

Klick **Create new project**. Es dauert ~1 Minute.

**1.3** Sobald das Projekt bereit ist, links in der Seitenleiste auf
**SQL Editor** → **New query**. Öffne in diesem Projekt die Datei
`supabase/schema.sql`, kopiere den ganzen Inhalt rein und klick **Run**.
Du solltest "Success. No rows returned" sehen.

**1.4** Hol dir die zwei Werte für die App-Konfiguration: links
**Project Settings** (Zahnrad unten) → **API**:
- **Project URL** (sieht aus wie `https://abcdef.supabase.co`)
- **Project API Keys** → **anon public** (ein langer Schlüssel,
  beginnt mit `eyJ...`)

Diese beiden Werte brauchen wir gleich.

---

## Schritt 2 · App lokal einrichten

**2.1** Öffne ein Terminal im entpackten Projektordner und installiere
die Abhängigkeiten:

```bash
npm install
```

Das dauert ~30 Sekunden.

**2.2** Erstelle eine Datei namens `.env` im Hauptverzeichnis (also
neben `package.json`). Inhalt:

```
VITE_SUPABASE_URL=https://abcdef.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...dein-langer-anon-key...
```

Trage deine eigenen Werte aus Schritt 1.4 ein. **Achtung:** keine
Anführungszeichen, keine Leerzeichen um das `=`.

**2.3** Starte die App lokal zum Testen:

```bash
npm run dev
```

Im Terminal erscheint eine URL wie `http://localhost:5173`. Öffne sie
im Browser. Wenn du das Onboarding mit "Neue Fahrgemeinschaft" siehst,
funktioniert alles.

Probier's: Erstelle eine Gruppe, füge ein paar Mitglieder hinzu,
markiere dich als ICH. Im Supabase-Dashboard unter **Table Editor**
→ `groups` siehst du deinen Eintrag — die Daten liegen jetzt online.

Strg-C im Terminal beendet den lokalen Server.

---

## Schritt 3 · Auf Vercel hochladen

Vercel macht aus deinem Projekt eine richtige Webseite mit `https://`-
Adresse, die alle Pendler im Browser öffnen können.

**3.1** Erstelle ein GitHub-Repo (privat ist OK):
- https://github.com/new
- Name: `fahrgemeinschaft`
- **Privat** auswählen
- **Create repository**

**3.2** Im Terminal, im Projektordner:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/fahrgemeinschaft.git
git push -u origin main
```

(Beim ersten Push fragt Git nach deinem Login — verwende einen
[Personal Access Token](https://github.com/settings/tokens) statt
dem Passwort.)

**3.3** Geh auf https://vercel.com/new und melde dich mit GitHub an.
Wähle dein neues `fahrgemeinschaft`-Repo aus. Vercel erkennt Vite
automatisch.

**3.4** Vor dem Deployen: klick **Environment Variables** und trage
beide Werte aus deiner `.env` ein:
- `VITE_SUPABASE_URL` = deine URL
- `VITE_SUPABASE_ANON_KEY` = dein anon-Key

**3.5** Klick **Deploy**. Nach ~1 Minute hast du eine URL wie
`https://fahrgemeinschaft-abc123.vercel.app`. Das ist eure App.

---

## Schritt 4 · Auf den Handys installieren

Schick allen Pendlern den Vercel-Link per WhatsApp/SMS.

**Auf iPhone (Safari):**
1. Link öffnen
2. Teilen-Symbol unten (Quadrat mit Pfeil hoch)
3. **Zum Home-Bildschirm hinzufügen**
4. Fertig — App-Icon erscheint wie bei jeder anderen App

**Auf Android (Chrome):**
1. Link öffnen
2. Drei-Punkte-Menü oben rechts
3. **App installieren** (oder "Zum Startbildschirm hinzufügen")
4. Fertig

Danach öffnet sich die App im Vollbild, ohne Browser-Leiste.

**Innerhalb der App:** Eine Person erstellt die Gruppe und teilt den
6-stelligen Code (z. B. `K7XQ4M`) mit den anderen. Diese geben den
Code beim Onboarding ein und sind sofort dabei.

---

## Updates später

Wenn du was am Code änderst:

```bash
git add .
git commit -m "Beschreibung der Änderung"
git push
```

Vercel deployt automatisch in ~30 Sekunden. Beim nächsten App-Öffnen
sehen alle die neue Version — keine App-Store-Reviews, keine Wartezeit.

---

## Was kostenlos bleibt

| Limit | Eure Nutzung | Abstand |
|-------|--------------|---------|
| Supabase: 500 MB Datenbank | ~5 KB pro Gruppe | × 100.000 |
| Supabase: 5 GB Traffic/Monat | ~10 MB für 4 Personen | × 500 |
| Supabase: 50.000 Users | 4 | × 12.500 |
| Vercel: 100 GB Traffic/Monat | ~50 MB | × 2.000 |

Ein wichtiges Detail bei Supabase: Projekte werden nach **7 Tagen
ohne Aktivität** automatisch pausiert. Bei einer Pendler-App, die
täglich genutzt wird, passiert das nie. Falls doch (z. B. Urlaub):
ein Klick im Dashboard reaktiviert es in 30 Sekunden.

---

## Push-Benachrichtigungen (Schritt 5, optional, später)

Web Push funktioniert auf Android schon out-of-the-box. Auf iPhone
braucht es iOS 16.4+ und die App **muss am Homescreen installiert
sein** (nicht im Browser geöffnet). Die "Du fährst morgen"-Erinnerung
ist eine größere Sache — siehe Punkt 4 unserer Roadmap.

Tipp für jetzt: Der Kalender-Export (`Mehr → Als Kalender exportieren`)
funktioniert sofort und ist in vielen Fällen sogar besser, weil die
Erinnerungen direkt in der nativen Kalender-App landen.

---

## Hilfe / Probleme

- **"Supabase-Konfiguration fehlt"** → `.env`-Datei prüfen, Datei muss
  exakt `.env` heißen (nicht `.env.txt`), Werte ohne Anführungszeichen
- **Keine Live-Updates zwischen Geräten** → im Supabase-Dashboard
  unter **Database → Replication** prüfen, dass `groups` in der
  Publikation `supabase_realtime` enthalten ist
- **Build-Fehler bei `npm run dev`** → Node.js Version prüfen
  (`node --version` sollte ≥ 20 zeigen)
