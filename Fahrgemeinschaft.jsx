import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Car,
  Calendar,
  BarChart3,
  Settings as SettingsIcon,
  Trash2,
  Thermometer,
  Plane,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Download,
  RotateCcw,
  Users,
  Clock,
  CalendarPlus,
  Bell,
  BellOff,
  X,
  Sparkles,
  ArrowRight,
  CalendarDays,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────
const C = {
  bg: "#0b0b0d",
  bg2: "#131318",
  surface: "#1a1a20",
  surface2: "#22222a",
  surface3: "#2a2a33",
  border: "#2a2a33",
  borderSoft: "#1e1e26",
  text: "#f4f1ea",
  textDim: "#8b8b95",
  textFaint: "#5a5a64",
  amber: "#f5a524",
  amberDim: "#7a5210",
  amberSoft: "#3a2a10",
  green: "#86efac",
  greenDim: "#1d3b2a",
  red: "#fb7185",
  redDim: "#3b1d22",
  blue: "#7dd3fc",
  violet: "#c4b5fd",
};

const FONT_DISPLAY = `"Instrument Serif", "Cormorant Garamond", Georgia, serif`;
const FONT_BODY = `"Manrope", -apple-system, BlinkMacSystemFont, sans-serif`;
const FONT_MONO = `"JetBrains Mono", "SF Mono", Consolas, monospace`;

const PALETTE = ["#f5a524", "#7dd3fc", "#86efac", "#fb7185", "#c4b5fd", "#fde68a", "#fca5a5", "#a7f3d0"];

// Durchschnittlicher CO₂-Ausstoß eines Pkw, in KILOGRAMM pro Kilometer.
// 0.12 kg/km = 120 g/km (Flottenmittel). Das Ergebnis ist damit bereits in kg —
// nicht zusätzlich durch 1000 teilen!
const CO2_KG_PER_KM = 0.12;

// ─────────────────────────────────────────────────────────────────────
// DATES
// ─────────────────────────────────────────────────────────────────────
const DAYS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const DAYS_DE_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parseYmd = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const startOfWeek = (d) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const isWorkday = (d) => {
  const w = d.getDay();
  return w >= 1 && w <= 5;
};
const formatDateLong = (d) => `${DAYS_DE_LONG[d.getDay()]}, ${d.getDate()}. ${MONTHS_DE[d.getMonth()]}`;
const formatDateShort = (d) => `${d.getDate()}. ${MONTHS_DE[d.getMonth()].slice(0, 3)}`;

function isoWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

// ─────────────────────────────────────────────────────────────────────
// SACHSEN-FEIERTAGE (berechnet aus Osterdatum)
// ─────────────────────────────────────────────────────────────────────
function getEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getSaxonHolidays(year) {
  const easter = getEaster(year);
  const out = {};
  const add = (d, name) => { out[ymd(d)] = name; };
  add(new Date(year, 0, 1), "Neujahr");
  add(addDays(easter, -2), "Karfreitag");
  add(addDays(easter, 1), "Ostermontag");
  add(new Date(year, 4, 1), "Tag der Arbeit");
  add(addDays(easter, 39), "Christi Himmelfahrt");
  add(addDays(easter, 50), "Pfingstmontag");
  add(new Date(year, 9, 3), "Tag der Deutschen Einheit");
  add(new Date(year, 9, 31), "Reformationstag");
  // Buß- und Bettag: Mittwoch vor 23. November
  const bb = new Date(year, 10, 22);
  while (bb.getDay() !== 3) bb.setDate(bb.getDate() - 1);
  add(bb, "Buß- und Bettag");
  add(new Date(year, 11, 25), "1. Weihnachtsfeiertag");
  add(new Date(year, 11, 26), "2. Weihnachtsfeiertag");
  return out;
}

// Cache: berechne für aktuelles Jahr ± 1
const HOLIDAYS_CACHE = {};
function holidayFor(date) {
  const y = date.getFullYear();
  if (!HOLIDAYS_CACHE[y]) HOLIDAYS_CACHE[y] = getSaxonHolidays(y);
  return HOLIDAYS_CACHE[y][ymd(date)] || null;
}
function isHoliday(date) {
  return Boolean(holidayFor(date));
}
function isCommuteDay(date) {
  return isWorkday(date) && !isHoliday(date);
}

// ─────────────────────────────────────────────────────────────────────
// STORAGE (lokal + geteilt pro Gruppe)
// ─────────────────────────────────────────────────────────────────────
const STORAGE_KEY_LOCAL = "fg:local:v3";
const STORAGE_KEY_LEGACY = "fg:state:v2";

const defaultLocal = {
  groupCode: null,
  myMemberId: null,
  notificationsEnabled: false,
};

const defaultGroup = {
  members: [],
  trips: {},
  weeklyAssignments: {},
  swapRequests: [],
  kmPerTrip: 30,
  adminMemberId: null,
  updatedAt: 0,
  lastEditor: null,
  createdAt: new Date().toISOString(),
};

function generateGroupCode() {
  // Verwirrende Zeichen weggelassen (0/O, 1/I/L)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function normalizeCode(code) {
  return (code || "").toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
}
function groupKey(code) { return `group:${code}`; }

async function loadLocal() {
  try {
    const r = await window.storage.get(STORAGE_KEY_LOCAL);
    if (r && r.value) return JSON.parse(r.value);
  } catch (e) {}
  return null;
}
async function saveLocal(s) {
  try { await window.storage.set(STORAGE_KEY_LOCAL, JSON.stringify(s)); }
  catch (e) { console.error("saveLocal", e); }
}
async function loadGroup(code) {
  try {
    const r = await window.storage.get(groupKey(code), true);
    if (r && r.value) return JSON.parse(r.value);
  } catch (e) {}
  return null;
}
async function saveGroup(code, s) {
  try { await window.storage.set(groupKey(code), JSON.stringify(s), true); }
  catch (e) { console.error("saveGroup", e); throw e; }
}

// Migration v2 → v3 (alte Single-Device-Daten in eine neue Gruppe überführen)
async function loadLegacy() {
  try {
    const r = await window.storage.get(STORAGE_KEY_LEGACY);
    if (r && r.value) return JSON.parse(r.value);
  } catch (e) {}
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// LOGIK: ZÄHLER
// ─────────────────────────────────────────────────────────────────────
function daysDrivenCount(memberId, state) {
  let n = 0;
  Object.values(state.trips).forEach((t) => {
    if (t.driverId === memberId && !t.solo) n++;
  });
  return n;
}
function weeksDrivenCount(memberId, state) {
  const weeks = new Set();
  Object.entries(state.trips).forEach(([date, trip]) => {
    if (trip.driverId === memberId && !trip.solo) {
      weeks.add(ymd(startOfWeek(parseYmd(date))));
    }
  });
  return weeks.size;
}
function statusOf(state, dateKey, memberId) {
  return state.trips[dateKey]?.attendance?.[memberId];
}
function isAvailableOn(state, date, memberId) {
  if (!isCommuteDay(date)) return false;
  const s = statusOf(state, ymd(date), memberId);
  return s !== "sick" && s !== "vacation" && s !== "off" && s !== "solo";
}

// ─────────────────────────────────────────────────────────────────────
// LOGIK: BERECHTIGUNGEN (Admin + "jede·r nur eigene Daten")
// ─────────────────────────────────────────────────────────────────────
// Wer ist Admin? Explizit gesetzt, sonst das erste Mitglied (damit
// Bestands-Gruppen nicht ausgesperrt werden und die·der Ersteller·in,
// die·der das erste Mitglied anlegt, automatisch Admin wird).
function effectiveAdminId(group) {
  return group?.adminMemberId || group?.members?.[0]?.id || null;
}
function isAdminUser(group, myMemberId) {
  return Boolean(myMemberId) && myMemberId === effectiveAdminId(group);
}

// Tausch-Anfragen (mitglieder-getrieben) sicher abgleichen.
// Erlaubte Aktionen eines Mitglieds (me) in EINEM Schreibvorgang:
//   • Anfrage anlegen: fromMemberId === me, status "pending" (keine Wochen-Änderung).
//   • eigene offene Anfrage zurückziehen: pending → "cancelled".
//   • an mich gerichtete Anfrage (toMemberId === me): pending → "declined" ODER
//     pending → "accepted"; nur beim ANNEHMEN werden GENAU die beiden in der Anfrage
//     benannten Wochen in weeklyAssignments getauscht.
//   • eigene erledigte Anfragen (cancelled/declined/accepted) entfernen (aufräumen).
// Eine Woche kann nur getauscht werden, wenn sie der jeweiligen Person aktuell
// auch wirklich gehört (getWeekDriver). Alles andere wird auf den alten Stand
// zurückgesetzt → kein unbefugtes Umbuchen fremder Wochen.
function reconcileSwaps(prevGroup, nextGroup, me) {
  const prevReqs = Array.isArray(prevGroup.swapRequests) ? prevGroup.swapRequests : [];
  const nextReqs = Array.isArray(nextGroup.swapRequests) ? nextGroup.swapRequests : [];
  const memberIds = new Set((prevGroup.members || []).map((m) => m.id));
  const isWeekKey = (k) => typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const ownsWeek = (mid, weekKey) => {
    if (!isWeekKey(weekKey)) return false;
    const wd = getWeekDriver(prevGroup, parseYmd(weekKey));
    return Boolean(wd) && wd.id === mid;
  };

  const prevById = new Map(prevReqs.map((r) => [r.id, r]));
  const nextById = new Map(nextReqs.map((r) => [r.id, r]));

  const out = prevReqs.map((r) => ({ ...r })); // Basis = alter Stand
  const outById = new Map(out.map((r) => [r.id, r]));
  const weeklyAssignments = { ...(prevGroup.weeklyAssignments || {}) };

  // 1) Neue Anfragen (in next, nicht in prev)
  nextReqs.forEach((r) => {
    if (!r || prevById.has(r.id)) return;
    const valid =
      r.status === "pending" &&
      r.fromMemberId === me &&
      memberIds.has(r.toMemberId) && r.toMemberId !== me &&
      ownsWeek(me, r.fromWeekKey) &&
      (r.toWeekKey == null || (isWeekKey(r.toWeekKey) && ownsWeek(r.toMemberId, r.toWeekKey)));
    if (valid) {
      out.push({
        id: String(r.id),
        fromMemberId: me,
        fromWeekKey: r.fromWeekKey,
        toMemberId: r.toMemberId,
        toWeekKey: r.toWeekKey == null ? null : r.toWeekKey,
        status: "pending",
        createdAt: r.createdAt || Date.now(),
      });
    }
  });

  // 2) Entfernte Anfragen: nur erledigte, an denen me beteiligt ist (aufräumen)
  prevReqs.forEach((p) => {
    if (nextById.has(p.id)) return;
    const involved = p.fromMemberId === me || p.toMemberId === me;
    if (involved && p.status !== "pending") {
      const idx = out.findIndex((r) => r.id === p.id);
      if (idx >= 0) out.splice(idx, 1);
    }
  });

  // 3) Status-Übergänge (id in prev und next)
  prevReqs.forEach((p) => {
    const n = nextById.get(p.id);
    if (!n || n.status === p.status) return;
    if (p.status !== "pending") return; // aus erledigt heraus: nichts erlaubt
    const target = outById.get(p.id);
    if (!target) return;
    if (n.status === "cancelled" && p.fromMemberId === me) {
      target.status = "cancelled";
    } else if (n.status === "declined" && p.toMemberId === me) {
      target.status = "declined";
    } else if (n.status === "accepted" && p.toMemberId === me) {
      if (
        ownsWeek(p.fromMemberId, p.fromWeekKey) &&
        (p.toWeekKey == null || ownsWeek(p.toMemberId, p.toWeekKey))
      ) {
        target.status = "accepted";
        weeklyAssignments[p.fromWeekKey] = p.toMemberId;
        if (p.toWeekKey != null) weeklyAssignments[p.toWeekKey] = p.fromMemberId;
      }
    }
  });

  return { swapRequests: out, weeklyAssignments };
}

// Felder, die nur der·die Admin ändern darf:
//   members, weeklyAssignments, kmPerTrip, adminMemberId,
//   sowie pro Tag: driverId / solo / fremde Anwesenheiten.
// Ein normales Mitglied darf ausschliesslich die EIGENE Anwesenheit
// (krank / Urlaub / mitgefahren / solo) an einem Tag setzen.
// Diese Funktion baut aus dem alten Stand + den gewuenschten Aenderungen
// einen "bereinigten" neuen Stand: alles, was das Mitglied nicht aendern
// darf, wird auf den alten Stand zurueckgesetzt. So bleibt der Plan auch
// dann geschuetzt, wenn irgendwo in der UI ein Knopf vergessen wurde.
function enforcePermissions(prevGroup, nextGroup, myMemberId) {
  // Admin (oder Ersteinrichtung ohne Mitglieder) darf alles.
  if (isAdminUser(nextGroup, myMemberId) || (prevGroup.members?.length || 0) === 0) {
    return nextGroup;
  }
  // Kein eigenes Mitglied gewaehlt -> gar keine geteilten Aenderungen erlaubt.
  if (!myMemberId) {
    return {
      ...nextGroup,
      members: prevGroup.members,
      weeklyAssignments: prevGroup.weeklyAssignments,
      swapRequests: prevGroup.swapRequests || [],
      kmPerTrip: prevGroup.kmPerTrip,
      adminMemberId: prevGroup.adminMemberId,
      trips: prevGroup.trips,
    };
  }

  // Tausch-Anfragen + die daraus erlaubten Wochen-Zuweisungen sicher abgleichen.
  const swap = reconcileSwaps(prevGroup, nextGroup, myMemberId);

  // Geschuetzte Felder unveraendert uebernehmen (weeklyAssignments nur via Tausch).
  const result = {
    ...nextGroup,
    members: prevGroup.members,
    weeklyAssignments: swap.weeklyAssignments,
    swapRequests: swap.swapRequests,
    kmPerTrip: prevGroup.kmPerTrip,
    adminMemberId: prevGroup.adminMemberId,
  };

  // Trips bereinigen: alter Stand ist die Basis, nur die EIGENE
  // Anwesenheit des Mitglieds wird aus dem gewuenschten Stand uebernommen.
  const prevTrips = prevGroup.trips || {};
  const nextTrips = nextGroup.trips || {};
  const trips = {};
  const allDates = new Set([...Object.keys(prevTrips), ...Object.keys(nextTrips)]);

  allDates.forEach((dateKey) => {
    const prevTrip = prevTrips[dateKey];
    const nextTrip = nextTrips[dateKey];
    // Basis = alter Trip (driverId/solo/fremde Anwesenheit unangetastet).
    const base = prevTrip
      ? { ...prevTrip, attendance: { ...(prevTrip.attendance || {}) } }
      : { attendance: {} };

    // Gewuenschter eigener Status an diesem Tag.
    const desiredOwn = nextTrip?.attendance?.[myMemberId];
    if (desiredOwn === undefined) {
      // "drove" duerfen Mitglieder NICHT fuer sich selbst setzen (das macht
      // der·die Admin ueber die Fahrer-Auswahl). Eigenen Status entfernen.
      if (base.attendance[myMemberId] && base.attendance[myMemberId] !== "drove") {
        delete base.attendance[myMemberId];
      }
    } else if (desiredOwn !== "drove") {
      base.attendance[myMemberId] = desiredOwn;
    }

    const hasContent = base.driverId || Object.keys(base.attendance).length > 0;
    if (hasContent) trips[dateKey] = base;
  });

  result.trips = trips;
  return result;
}

// ─────────────────────────────────────────────────────────────────────
// LOGIK: WOCHEN- & TAGES-FAHRER (mit Vor-Projektion)
// ─────────────────────────────────────────────────────────────────────
function pickWinner(state, weekStart, counts) {
  const available = state.members.filter((m) =>
    [0, 1, 2, 3, 4].some((i) => isAvailableOn(state, addDays(weekStart, i), m.id))
  );
  if (available.length === 0) return null;
  const sorted = [...available].sort((a, b) => {
    const ca = counts[a.id] || 0;
    const cb = counts[b.id] || 0;
    if (ca !== cb) return ca - cb;
    // Tiebreak: Mitglieder-Reihenfolge (round-robin)
    return state.members.indexOf(a) - state.members.indexOf(b);
  });
  return { id: sorted[0].id, source: "auto" };
}

function getWeekDriver(state, weekStart) {
  const weekKey = ymd(weekStart);

  // 1. Manuelle Zuweisung?
  if (state.weeklyAssignments?.[weekKey]) {
    return { id: state.weeklyAssignments[weekKey], source: "manual" };
  }
  // 2. Schon im Verlauf der Woche jemand zugewiesen (logged)?
  for (let i = 0; i < 5; i++) {
    const d = addDays(weekStart, i);
    if (!isCommuteDay(d)) continue;
    const trip = state.trips[ymd(d)];
    if (trip?.driverId && !trip.solo) return { id: trip.driverId, source: "logged" };
  }
  // 3. Projektion
  if (state.members.length === 0) return null;

  // Initialisiere Zähler aus tatsächlichen Fahrten
  const counts = {};
  const driverWeeks = {};
  state.members.forEach((m) => {
    counts[m.id] = 0;
    driverWeeks[m.id] = new Set();
  });
  Object.entries(state.trips).forEach(([date, trip]) => {
    if (trip.driverId && !trip.solo && driverWeeks[trip.driverId]) {
      driverWeeks[trip.driverId].add(ymd(startOfWeek(parseYmd(date))));
    }
  });
  state.members.forEach((m) => {
    counts[m.id] = driverWeeks[m.id].size;
  });

  const today = new Date();
  const currentWeekStart = startOfWeek(today);

  // Vergangenheit oder aktuelle Woche → direkt aus Real-Zählern
  if (weekStart.getTime() <= currentWeekStart.getTime()) {
    return pickWinner(state, weekStart, counts);
  }

  // Zukunft: simuliere alle Wochen zwischen current und target und akkumuliere
  let cursor = new Date(currentWeekStart);
  while (cursor.getTime() < weekStart.getTime()) {
    const cKey = ymd(cursor);

    // Wer fährt diese Zwischen-Woche?
    let projectedId = null;
    if (state.weeklyAssignments?.[cKey]) {
      projectedId = state.weeklyAssignments[cKey];
    } else {
      // Hat schon jemand gefahren in dieser Woche?
      for (let i = 0; i < 5; i++) {
        const d = addDays(cursor, i);
        if (!isCommuteDay(d)) continue;
        const trip = state.trips[ymd(d)];
        if (trip?.driverId && !trip.solo) { projectedId = trip.driverId; break; }
      }
      if (!projectedId) {
        const w = pickWinner(state, cursor, counts);
        if (w) projectedId = w.id;
      }
    }

    // Zähler erhöhen, falls noch nicht durch reale Trips abgedeckt
    if (projectedId && !driverWeeks[projectedId]?.has(cKey)) {
      counts[projectedId] = (counts[projectedId] || 0) + 1;
      driverWeeks[projectedId]?.add(cKey);
    }

    cursor = addDays(cursor, 7);
  }

  return pickWinner(state, weekStart, counts);
}

function computeDayDriver(state, date) {
  if (!isCommuteDay(date)) return null;
  const dateKey = ymd(date);
  const trip = state.trips[dateKey];
  // Schon protokolliert
  if (trip?.driverId) return { id: trip.driverId, source: "logged", isSubstitute: false, solo: !!trip.solo };

  // Wochenfahrer (jetzt mit Projektion)
  const wk = getWeekDriver(state, startOfWeek(date));
  if (!wk) return null;

  // Ist der Wochenfahrer heute verfügbar?
  if (isAvailableOn(state, date, wk.id)) {
    return { id: wk.id, source: wk.source, isSubstitute: false };
  }
  // Vertretung: verfügbare Person mit wenigsten Fahrtagen
  const available = state.members.filter((m) => isAvailableOn(state, date, m.id));
  if (available.length === 0) return null;
  const sorted = [...available].sort((a, b) => {
    const da = daysDrivenCount(a.id, state);
    const db = daysDrivenCount(b.id, state);
    if (da !== db) return da - db;
    return state.members.indexOf(a) - state.members.indexOf(b);
  });
  return { id: sorted[0].id, source: "substitute", isSubstitute: true, originalDriverId: wk.id };
}

// Liefert die "gefahrene Wochen"-Zähler so, wie sie zum Zeitpunkt der
// Entscheidung für diese Woche stehen (inkl. Vor-Projektion der Wochen
// dazwischen). Identische Logik wie getWeekDriver, aber nur lesend.
function weekDriverCounts(state, weekStart) {
  const counts = {};
  const driverWeeks = {};
  state.members.forEach((m) => { counts[m.id] = 0; driverWeeks[m.id] = new Set(); });
  Object.entries(state.trips).forEach(([date, trip]) => {
    if (trip.driverId && !trip.solo && driverWeeks[trip.driverId]) {
      driverWeeks[trip.driverId].add(ymd(startOfWeek(parseYmd(date))));
    }
  });
  state.members.forEach((m) => { counts[m.id] = driverWeeks[m.id].size; });

  const currentWeekStart = startOfWeek(new Date());
  if (weekStart.getTime() <= currentWeekStart.getTime()) return counts;

  let cursor = new Date(currentWeekStart);
  while (cursor.getTime() < weekStart.getTime()) {
    const cKey = ymd(cursor);
    let projectedId = null;
    if (state.weeklyAssignments?.[cKey]) {
      projectedId = state.weeklyAssignments[cKey];
    } else {
      for (let i = 0; i < 5; i++) {
        const d = addDays(cursor, i);
        if (!isCommuteDay(d)) continue;
        const trip = state.trips[ymd(d)];
        if (trip?.driverId && !trip.solo) { projectedId = trip.driverId; break; }
      }
      if (!projectedId) { const w = pickWinner(state, cursor, counts); if (w) projectedId = w.id; }
    }
    if (projectedId && !driverWeeks[projectedId]?.has(cKey)) {
      counts[projectedId] = (counts[projectedId] || 0) + 1;
      driverWeeks[projectedId]?.add(cKey);
    }
    cursor = addDays(cursor, 7);
  }
  return counts;
}

// Erklärt in Worten, warum diese Person die·der Wochenfahrer·in ist –
// mit Bezug auf die Statistik (gefahrene Wochen vs. fairer Anteil).
function explainWeekDriver(state, weekStart, wd) {
  if (!wd || state.members.length === 0) return null;
  const wkKey = ymd(weekStart);
  if (state.weeklyAssignments?.[wkKey]) {
    return "Diese Woche wurde manuell festgelegt – überschreibt die faire Rotation.";
  }
  if (wd.source === "logged") {
    return "Aus dem Verlauf übernommen – diese Woche wurde bereits gefahren.";
  }

  const counts = weekDriverCounts(state, weekStart);
  // Verfügbare Personen für diese Woche (wie bei der Auswahl).
  const available = state.members.filter((m) =>
    [0, 1, 2, 3, 4].some((i) => isAvailableOn(state, addDays(weekStart, i), m.id))
  );
  const total = state.members.reduce((a, m) => a + (counts[m.id] || 0), 0);
  const avg = state.members.length ? total / state.members.length : 0;
  const myCount = counts[wd.id] || 0;
  const dev = myCount - avg;

  const availCounts = available.map((m) => counts[m.id] || 0);
  const minAvail = availCounts.length ? Math.min(...availCounts) : 0;
  const tiedAtMin = available.filter((m) => (counts[m.id] || 0) === minAvail);
  const globalMin = Math.min(...state.members.map((m) => counts[m.id] || 0));

  // Der·die eigentlich am wenigsten Gefahrene ist abwesend?
  let prefix = "";
  if (myCount > globalMin) {
    prefix = "Übernimmt, weil wer weniger gefahren ist diese Woche abwesend ist. ";
  }

  const devTxt = dev < -0.05
    ? `${Math.abs(dev).toFixed(1)} unter`
    : dev > 0.05
    ? `${dev.toFixed(1)} über`
    : "genau auf";

  if (tiedAtMin.length > 1 && myCount === minAvail) {
    return `${prefix}Gleichstand bei ${myCount} gefahrenen Wochen – nach Mitglieder-Reihenfolge ist diese Person dran (${devTxt} dem fairen Schnitt von ${avg.toFixed(1)}).`;
  }
  return `${prefix}Bisher am seltensten gefahren: ${myCount} Woche${myCount === 1 ? "" : "n"} – das ist ${devTxt} dem fairen Schnitt von ${avg.toFixed(1)}. Deshalb als Nächste·r dran.`;
}

// Für eine MANUELL gesetzte Woche: wen hätte die App fair vorgeschlagen
// (ohne den Eingriff) und was bewirkt die Übersteuerung? Liefert null, wenn
// die Woche nicht manuell ist. Rein lesend (arbeitet auf einem Klon).
function manualWeekImpact(state, weekStart) {
  const wkKey = ymd(weekStart);
  const manualId = state.weeklyAssignments?.[wkKey];
  if (!manualId) return null;
  const manual = state.members.find((m) => m.id === manualId) || null;

  // Fairer Vorschlag = was die Rotation OHNE diese manuelle Zuweisung (und ohne
  // die ggf. schon geloggten Fahrer·innen dieser Woche) wählen würde.
  const weeklyAssignments = { ...(state.weeklyAssignments || {}) };
  delete weeklyAssignments[wkKey];
  const trips = { ...state.trips };
  for (let i = 0; i < 5; i++) {
    const dk = ymd(addDays(weekStart, i));
    if (trips[dk]?.driverId) {
      const t = { ...trips[dk] };
      delete t.driverId; delete t.solo;
      trips[dk] = t;
    }
  }
  const fairWd = getWeekDriver({ ...state, weeklyAssignments, trips }, weekStart);
  const fair = fairWd ? (state.members.find((m) => m.id === fairWd.id) || null) : null;
  const sameAsFair = Boolean(fair && manual) && fair.id === manual.id;

  // Wie steht die fair vorgeschlagene Person zum Schnitt (Kontext)?
  const counts = weekDriverCounts(state, weekStart);
  const total = state.members.reduce((a, m) => a + (counts[m.id] || 0), 0);
  const avg = state.members.length ? total / state.members.length : 0;
  let fairDevText = "";
  if (fair) {
    const dev = (counts[fair.id] || 0) - avg;
    fairDevText = dev < -0.05 ? `${Math.abs(dev).toFixed(1)} unter dem Schnitt`
      : dev > 0.05 ? `${dev.toFixed(1)} über dem Schnitt` : "genau auf dem Schnitt";
  }
  return { manual, fair, sameAsFair, fairDevText };
}

// ─────────────────────────────────────────────────────────────────────
// LOGIK: VORAUSSCHAU / IMPACT ("Was passiert, wenn ich fahre?")
// ─────────────────────────────────────────────────────────────────────
// Simuliert die kommenden Wochen mit DERSELBEN Logik wie getWeekDriver
// (pickWinner + Projektion) und liefert die·den Fahrer·in je Woche.
// Reine Feiertagswochen werden übersprungen. Rein lesend – ändert nichts.
function projectDriverTimeline(state, fromWeekStart, weeks) {
  const counts = {};
  const driverWeeks = {};
  state.members.forEach((m) => { counts[m.id] = 0; driverWeeks[m.id] = new Set(); });
  Object.entries(state.trips).forEach(([date, trip]) => {
    if (trip.driverId && !trip.solo && driverWeeks[trip.driverId]) {
      driverWeeks[trip.driverId].add(ymd(startOfWeek(parseYmd(date))));
    }
  });
  state.members.forEach((m) => { counts[m.id] = driverWeeks[m.id].size; });

  const timeline = [];
  let cursor = new Date(fromWeekStart);
  for (let w = 0; w < weeks; w++) {
    const cKey = ymd(cursor);
    const commuteDays = [0, 1, 2, 3, 4].map((i) => addDays(cursor, i)).filter(isCommuteDay);
    if (commuteDays.length === 0) { cursor = addDays(cursor, 7); continue; } // reine Feiertagswoche

    let driverId = null;
    if (state.weeklyAssignments?.[cKey]) {
      driverId = state.weeklyAssignments[cKey];
    } else {
      for (let i = 0; i < 5; i++) {
        const d = addDays(cursor, i);
        if (!isCommuteDay(d)) continue;
        const trip = state.trips[ymd(d)];
        if (trip?.driverId && !trip.solo) { driverId = trip.driverId; break; }
      }
      if (!driverId) { const win = pickWinner(state, cursor, counts); if (win) driverId = win.id; }
    }
    if (driverId && !driverWeeks[driverId]?.has(cKey)) {
      counts[driverId] = (counts[driverId] || 0) + 1;
      driverWeeks[driverId]?.add(cKey);
    }
    timeline.push({ weekStart: new Date(cursor), weekKey: cKey, driverId, iso: isoWeek(cursor) });
    cursor = addDays(cursor, 7);
  }
  return timeline;
}

// Liefert die persönliche Auswirkung für EINE Person: aktueller Stand
// (Abweichung vom fairen Schnitt, in Wochen), ob sie diese Woche dran ist,
// und wann ihr nächster Einsatz wäre. Basis ist die wochenbasierte Zählung –
// konsistent mit Planung/WhyPanel.
function driverImpact(state, today, memberId) {
  if (!memberId || state.members.length === 0) return null;
  const N = state.members.length;
  const weekStart = startOfWeek(today);

  const counts = weekDriverCounts(state, weekStart);
  const total = state.members.reduce((a, m) => a + (counts[m.id] || 0), 0);
  const fair = N ? total / N : 0;
  const myCount = counts[memberId] || 0;
  const devNow = myCount - fair;
  // Wenn ich diese Woche fahre: mein Zähler +1 und der Gesamtschnitt steigt mit.
  const devAfter = (myCount + 1) - (total + 1) / N;

  const wd = getWeekDriver(state, weekStart);
  const iAmThisWeek = Boolean(wd) && wd.id === memberId;
  const thisWeekDriver = wd ? state.members.find((m) => m.id === wd.id) : null;

  const timeline = projectDriverTimeline(state, weekStart, 26);
  const myWeeks = timeline.filter((t) => t.driverId === memberId);
  const futureMine = myWeeks.filter((t) => t.weekStart.getTime() > weekStart.getTime());
  // "Danach frei bis": der nächste Einsatz NACH dieser Woche, sonst der nächste überhaupt.
  const nextMine = iAmThisWeek ? (futureMine[0] || null) : (myWeeks[0] || null);

  return { N, fair, myCount, devNow, devAfter, iAmThisWeek, thisWeekDriver, nextMine };
}

// Baut die Nudge-Nachricht für die·den angemeldete·n Nutzer·in – aber nur,
// wenn sie·er an einem Pendeltag tatsächlich diese Woche dran ist.
function buildDriveNudge(state, today) {
  if (!state.myMemberId || !isCommuteDay(today)) return null;
  const imp = driverImpact(state, today, state.myMemberId);
  if (!imp || !imp.iAmThisWeek) return null;
  const me = state.members.find((m) => m.id === state.myMemberId);
  const next = imp.nextMine ? ` Danach frei bis KW ${imp.nextMine.iso}.` : "";
  return {
    title: "🚗 Du bist diese Woche dran",
    body: `${me?.name?.split(" ")[0] || "Du"}, übernimm die Woche — fair gerechnet.${next} Einfach fahren, passt.`,
  };
}

// ─────────────────────────────────────────────────────────────────────
// UI: Avatar, Card, Button
// ─────────────────────────────────────────────────────────────────────
function Avatar({ member, size = 36 }) {
  if (!member) return null;
  const initials = member.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg, ${member.color}, ${member.color}cc)`,
        color: "#0b0b0d",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONT_MONO, fontWeight: 700, fontSize: size * 0.38,
        flexShrink: 0,
        boxShadow: `0 0 0 1px ${member.color}33, 0 0 12px ${member.color}22`,
      }}
    >{initials}</div>
  );
}
function Card({ children, style, ...rest }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, ...style }} {...rest}>
      {children}
    </div>
  );
}
function Btn({ children, onClick, variant = "default", style, disabled, ...rest }) {
  const variants = {
    default: { bg: C.surface2, fg: C.text, border: C.border },
    primary: { bg: C.amber, fg: "#0b0b0d", border: C.amber },
    ghost: { bg: "transparent", fg: C.textDim, border: "transparent" },
    danger: { bg: "transparent", fg: C.red, border: C.border },
    soft: { bg: C.bg2, fg: C.text, border: C.border },
  };
  const v = variants[variant] || variants.default;
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        background: v.bg, color: v.fg, border: `1px solid ${v.border}`,
        borderRadius: 10, padding: "10px 14px",
        fontFamily: FONT_BODY, fontWeight: 600, fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        display: "inline-flex", alignItems: "center", gap: 8,
        transition: "all 150ms ease", ...style,
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      {...rest}
    >{children}</button>
  );
}
function StatusPill({ active, color, label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? `${color}22` : "transparent",
        border: `1px solid ${active ? color : C.border}`,
        color: active ? color : C.textDim,
        borderRadius: 999, padding: "5px 9px",
        fontSize: 12, fontFamily: FONT_BODY, fontWeight: 600,
        display: "inline-flex", alignItems: "center", gap: 4,
        cursor: "pointer", transition: "all 150ms ease",
      }}
    >{icon}{label}</button>
  );
}
function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.18em",
      color: C.textFaint, textTransform: "uppercase", marginBottom: 10, ...style,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MODAL: Tagesdetail (für Planung & Woche)
// ─────────────────────────────────────────────────────────────────────
function DayDetailSheet({ date, state, setState, onClose }) {
  if (!date) return null;
  const dateKey = ymd(date);
  const trip = state.trips[dateKey] || { attendance: {} };
  const holiday = holidayFor(date);
  const weekend = !isWorkday(date);
  const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
  const [pendingDriver, setPendingDriver] = useState(null);

  const dayDriver = computeDayDriver(state, date);
  const driverObj = dayDriver ? state.members.find((m) => m.id === dayDriver.id) : null;

  const weekKey = ymd(startOfWeek(date));

  function setAttendance(memberId, status) {
    const next = { ...state };
    const t = { ...(next.trips[dateKey] || { attendance: {} }) };
    t.attendance = { ...(t.attendance || {}) };
    if (t.attendance[memberId] === status) {
      delete t.attendance[memberId];
    } else {
      t.attendance[memberId] = status;
    }
    next.trips = { ...next.trips, [dateKey]: t };
    setState(next);
  }
  function setTodayOnly(memberId) {
    const next = { ...state };
    const t = { ...(next.trips[dateKey] || { attendance: {} }) };
    t.driverId = memberId;
    delete t.solo;
    t.attendance = { ...(t.attendance || {}) };
    t.attendance[memberId] = "drove";
    next.trips = { ...next.trips, [dateKey]: t };
    setState(next);
    setPendingDriver(null);
  }
  function setSolo(memberId) {
    const next = { ...state };
    const t = { ...(next.trips[dateKey] || { attendance: {} }) };
    t.attendance = { ...(t.attendance || {}) };
    if (t.attendance[memberId] === "solo") {
      delete t.attendance[memberId];
    } else {
      t.attendance[memberId] = "solo";
      // Solo-Person ist nicht der Fahrgemeinschafts-Fahrer
      if (t.driverId === memberId) { delete t.driverId; delete t.solo; }
    }
    next.trips = { ...next.trips, [dateKey]: t };
    setState(next);
    setPendingDriver(null);
  }
  function setWholeWeek(memberId) {
    const next = { ...state };
    next.weeklyAssignments = { ...(next.weeklyAssignments || {}), [weekKey]: memberId };
    const t = { ...(next.trips[dateKey] || { attendance: {} }) };
    t.driverId = memberId;
    delete t.solo;
    t.attendance = { ...(t.attendance || {}) };
    t.attendance[memberId] = "drove";
    next.trips = { ...next.trips, [dateKey]: t };
    setState(next);
    setPendingDriver(null);
  }
  function handleFahrerTap(memberId) {
    if (trip.driverId === memberId) {
      const next = { ...state };
      const t = { ...(next.trips[dateKey] || { attendance: {} }) };
      delete t.driverId;
      t.attendance = { ...(t.attendance || {}) };
      delete t.attendance[memberId];
      next.trips = { ...next.trips, [dateKey]: t };
      setState(next);
      return;
    }
    setPendingDriver(memberId);
  }
  function clearTrip() {
    const next = { ...state };
    const t = { ...next.trips };
    delete t[dateKey];
    next.trips = t;
    setState(next);
    setPendingDriver(null);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "#000a", zIndex: 100,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        backdropFilter: "blur(4px)", animation: "fadein 200ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bg2, borderTop: `1px solid ${C.border}`,
          borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 720,
          maxHeight: "86vh", overflow: "auto",
          padding: "20px 18px 30px", animation: "slideup 280ms cubic-bezier(.2,.9,.3,1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.18em", color: C.textFaint, marginBottom: 4 }}>
              {dateKey} · KW {isoWeek(date)}
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontStyle: "italic", color: C.text, lineHeight: 1.1 }}>
              {formatDateLong(date)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.textDim, borderRadius: 8, padding: 6, cursor: "pointer" }}
          ><X size={18} /></button>
        </div>

        {holiday ? (
          <Card style={{ padding: 18, textAlign: "center", borderColor: C.amberDim, background: `${C.amber}08` }}>
            <Sparkles size={22} color={C.amber} style={{ margin: "0 auto 8px" }} />
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontStyle: "italic", color: C.amber }}>{holiday}</div>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>Gesetzlicher Feiertag in Sachsen — keine Fahrt</div>
          </Card>
        ) : weekend ? (
          <Card style={{ padding: 18, textAlign: "center" }}>
            <Clock size={22} color={C.textDim} style={{ margin: "0 auto 8px" }} />
            <div style={{ color: C.text, fontWeight: 600 }}>Wochenende</div>
          </Card>
        ) : (
          <>
            {driverObj && (
              <Card style={{ padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar member={driverObj} size={42} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: C.textDim }}>
                    {dayDriver.source === "logged"
                      ? "Hat gefahren"
                      : dayDriver.isSubstitute
                      ? "Vertretung"
                      : dayDriver.source === "manual"
                      ? "Manuell zugewiesen"
                      : "Vorschlag"}
                  </div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontStyle: "italic", color: C.text }}>
                    {driverObj.name}
                  </div>
                </div>
                <Car size={20} color={C.amber} />
              </Card>
            )}

            <SectionLabel>{isPast ? "Erfasst" : "Status setzen"}</SectionLabel>
            <Card style={{ padding: 4 }}>
              {state.members.map((m, i) => {
                const status = trip.attendance?.[m.id];
                const isDriver = trip.driverId === m.id;
                const isWeekDriver = state.weeklyAssignments?.[weekKey] === m.id;
                const isPending = pendingDriver === m.id;
                return (
                  <div key={m.id}
                    style={{
                      padding: "12px 12px",
                      borderBottom: i < state.members.length - 1 ? `1px solid ${C.borderSoft}` : "none",
                      display: "flex", alignItems: "center", gap: 10,
                      background: isPending ? `${C.amber}06` : "transparent",
                    }}
                  >
                    <Avatar member={m} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: C.text, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {m.name}
                        {isWeekDriver && !isPending && (
                          <span style={{
                            fontSize: 9, fontFamily: FONT_MONO, color: C.blue,
                            border: `1px solid ${C.blue}55`, padding: "1px 5px", borderRadius: 3, letterSpacing: "0.1em",
                          }}>WOCHE</span>
                        )}
                      </div>
                      {isPending && (
                        <div style={{ fontSize: 11, color: C.amber, marginTop: 2 }}>Wann fährt {m.name}?</div>
                      )}
                    </div>
                    {state.isAdmin && isPending ? (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button onClick={() => setWholeWeek(m.id)} style={{
                          background: C.amber, color: "#0b0b0d", border: "none",
                          borderRadius: 999, padding: "5px 10px",
                          fontSize: 11, fontFamily: FONT_BODY, fontWeight: 700, cursor: "pointer",
                        }}>Diese Woche</button>
                        <button onClick={() => setTodayOnly(m.id)} style={{
                          background: `${C.blue}22`, color: C.blue, border: `1px solid ${C.blue}55`,
                          borderRadius: 999, padding: "5px 10px",
                          fontSize: 11, fontFamily: FONT_BODY, fontWeight: 600, cursor: "pointer",
                        }}>Nur dieser Tag</button>
                        <button onClick={() => setPendingDriver(null)} style={{
                          background: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                          borderRadius: 999, padding: "5px 7px", cursor: "pointer",
                          display: "inline-flex", alignItems: "center",
                        }}><X size={11} /></button>
                      </div>
                    ) : (state.isAdmin || m.id === state.myMemberId) ? (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {state.isAdmin && (
                          <StatusPill active={isDriver} color={C.amber} label="Fahrer" icon={<Car size={11} />} onClick={() => handleFahrerTap(m.id)} />
                        )}
                        <StatusPill active={status === "rode"} color={C.blue} label="Mit" icon={<Users size={11} />} onClick={() => setAttendance(m.id, "rode")} />
                        <StatusPill active={status === "solo"} color={C.textDim} label="Solo" icon={<Car size={11} />} onClick={() => setSolo(m.id)} />
                        <StatusPill active={status === "sick"} color={C.red} label="Krank" icon={<Thermometer size={11} />} onClick={() => setAttendance(m.id, "sick")} />
                        <StatusPill active={status === "vacation"} color={C.green} label="Urlaub" icon={<Plane size={11} />} onClick={() => setAttendance(m.id, "vacation")} />
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, fontFamily: FONT_MONO, color: C.textDim }}>
                        {isDriver ? <span style={{ color: C.amber }}>fährt</span>
                          : status === "rode" ? "mit"
                          : status === "solo" ? "solo"
                          : status === "sick" ? <span style={{ color: C.red }}>krank</span>
                          : status === "vacation" ? <span style={{ color: C.green }}>Urlaub</span>
                          : "—"}
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>

            {state.isAdmin && (trip.driverId || Object.keys(trip.attendance || {}).length > 0) && (
              <Btn variant="ghost" onClick={clearTrip} style={{ width: "100%", marginTop: 12, justifyContent: "center" }}>
                <RotateCcw size={14} />Tag zurücksetzen
              </Btn>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// VIEW: HEUTE
// ─────────────────────────────────────────────────────────────────────
// Formatiert eine Abweichung in Wochen: +0.7 / −0.3 / ±0.0
function fmtDev(d) {
  const sign = d > 0.05 ? "+" : d < -0.05 ? "−" : "±";
  return `${sign}${Math.abs(d).toFixed(1)}`;
}

// Zeigt der·dem gerade angemeldeten Nutzer·in direkt beim Öffnen, wie sie·er
// gerade steht und was eine Fahrt bewirkt – sachlich begründet statt "vertrau einfach".
function ForecastCard({ state, today }) {
  const me = state.myMemberId ? state.members.find((m) => m.id === state.myMemberId) : null;
  const todayKey = ymd(today);
  const imp = useMemo(() => (me ? driverImpact(state, today, me.id) : null), [state, todayKey, me?.id]);
  if (!me || !imp) return null;

  const nextTxt = imp.nextMine
    ? `KW ${imp.nextMine.iso} · ${formatDateShort(imp.nextMine.weekStart)}`
    : "kein Einsatz in Sicht";
  const devColor = (d) => (d < -0.05 ? C.green : d > 0.05 ? C.amber : C.textDim);

  if (imp.iAmThisWeek) {
    return (
      <Card style={{
        padding: 16, marginBottom: 12, borderColor: C.amber,
        background: `linear-gradient(135deg, ${C.amber}1e, ${C.amber}06)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.amber}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Car size={18} color={C.amber} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.amber, fontWeight: 700, fontSize: 15 }}>Du bist diese Woche dran</div>
            <div style={{ color: C.textDim, fontSize: 12 }}>Eine Woche fahren — danach hast du frei.</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, background: C.bg2, borderRadius: 10, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, fontFamily: FONT_MONO, color: C.textFaint, letterSpacing: "0.08em", marginBottom: 4 }}>STAND JETZT</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: devColor(imp.devNow) }}>{fmtDev(imp.devNow)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", color: C.textFaint }}><ArrowRight size={16} /></div>
          <div style={{ flex: 1, background: C.bg2, borderRadius: 10, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, fontFamily: FONT_MONO, color: C.textFaint, letterSpacing: "0.08em", marginBottom: 4 }}>NACH DER WOCHE</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: devColor(imp.devAfter) }}>{fmtDev(imp.devAfter)}</div>
          </div>
          <div style={{ flex: 1.3, background: C.bg2, borderRadius: 10, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, fontFamily: FONT_MONO, color: C.textFaint, letterSpacing: "0.08em", marginBottom: 4 }}>DANACH FREI BIS</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.blue, lineHeight: 1.2, marginTop: 3 }}>{nextTxt}</div>
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, background: `${C.amber}10`, border: `1px solid ${C.amberDim}`, borderRadius: 10, padding: "10px 12px" }}>
          Passt so — die App hat fair gerechnet. Übernimm die Woche, dann bist du wieder vorn. 🚗
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.blue}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CalendarDays size={18} color={C.blue} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>
            {imp.thisWeekDriver ? `Diese Woche fährt ${imp.thisWeekDriver.name.split(" ")[0]} — du hast frei` : "Diese Woche fährt niemand"}
          </div>
          <div style={{ color: C.textDim, fontSize: 12.5, marginTop: 2 }}>
            Du bist als Nächstes dran: <span style={{ color: C.blue }}>{nextTxt}</span> · Stand {fmtDev(imp.devNow)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TodayView({ state, setState, today, onTabChange }) {
  const todayKey = ymd(today);
  const trip = state.trips[todayKey] || { attendance: {} };
  const holiday = holidayFor(today);
  const weekend = !isWorkday(today);
  const [pendingDriver, setPendingDriver] = useState(null); // member.id wenn Auswahl offen

  const dayDriver = useMemo(() => computeDayDriver(state, today), [state, todayKey]);
  const driver = dayDriver ? state.members.find((m) => m.id === dayDriver.id) : null;

  const me = state.myMemberId ? state.members.find((m) => m.id === state.myMemberId) : null;
  const iAmDriving = me && dayDriver && dayDriver.id === me.id;

  const currentWeekKey = ymd(startOfWeek(today));
  const currentWeekDriver = useMemo(() => getWeekDriver(state, startOfWeek(today)), [state, currentWeekKey]);

  function setAttendance(memberId, status) {
    const next = { ...state };
    const t = { ...(next.trips[todayKey] || { attendance: {} }) };
    t.attendance = { ...(t.attendance || {}) };
    if (t.attendance[memberId] === status) {
      delete t.attendance[memberId];
    } else {
      t.attendance[memberId] = status;
    }
    next.trips = { ...next.trips, [todayKey]: t };
    setState(next);
  }
  function setTodayDriver(memberId) {
    const next = { ...state };
    const t = { ...(next.trips[todayKey] || { attendance: {} }) };
    t.driverId = memberId;
    delete t.solo;
    t.attendance = { ...(t.attendance || {}) };
    t.attendance[memberId] = "drove";
    next.trips = { ...next.trips, [todayKey]: t };
    setState(next);
    setPendingDriver(null);
  }
  function setSoloToday(memberId) {
    const next = { ...state };
    const t = { ...(next.trips[todayKey] || { attendance: {} }) };
    t.attendance = { ...(t.attendance || {}) };
    if (t.attendance[memberId] === "solo") {
      delete t.attendance[memberId];
    } else {
      t.attendance[memberId] = "solo";
      if (t.driverId === memberId) { delete t.driverId; delete t.solo; }
    }
    next.trips = { ...next.trips, [todayKey]: t };
    setState(next);
    setPendingDriver(null);
  }
  function setWeekDriverHere(memberId) {
    const next = { ...state };
    next.weeklyAssignments = { ...(next.weeklyAssignments || {}), [currentWeekKey]: memberId };
    const t = { ...(next.trips[todayKey] || { attendance: {} }) };
    t.driverId = memberId;
    delete t.solo;
    t.attendance = { ...(t.attendance || {}) };
    t.attendance[memberId] = "drove";
    next.trips = { ...next.trips, [todayKey]: t };
    setState(next);
    setPendingDriver(null);
  }
  function handleFahrerTap(memberId) {
    if (trip.driverId === memberId) {
      // Schon Fahrer → Auswahl zurücknehmen
      const next = { ...state };
      const t = { ...(next.trips[todayKey] || { attendance: {} }) };
      delete t.driverId;
      t.attendance = { ...(t.attendance || {}) };
      delete t.attendance[memberId];
      next.trips = { ...next.trips, [todayKey]: t };
      setState(next);
      return;
    }
    // Neue Wahl: zwischen "Diese Woche" und "Nur heute" entscheiden lassen
    setPendingDriver(memberId);
  }
  function clearTrip() {
    const next = { ...state };
    const t = { ...next.trips };
    delete t[todayKey];
    next.trips = t;
    setState(next);
    setPendingDriver(null);
  }

  return (
    <div style={{ padding: "20px 18px 100px", maxWidth: 720, margin: "0 auto" }}>
      <SectionLabel style={{ marginBottom: 6 }}>Heute · {todayKey}</SectionLabel>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: C.text, lineHeight: 1.1, fontStyle: "italic", marginBottom: 24 }}>
        {formatDateLong(today)}
      </div>

      {state.members.length === 0 ? (
        <Card style={{ padding: 32, textAlign: "center" }}>
          <Users size={32} color={C.amber} style={{ margin: "0 auto 12px" }} />
          <div style={{ color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Noch keine Fahrgemeinschaft</div>
          <div style={{ color: C.textDim, fontSize: 14, marginBottom: 16 }}>
            Füge zuerst die Mitglieder eurer Fahrgemeinschaft hinzu.
          </div>
          <Btn variant="primary" onClick={() => onTabChange("settings")}>
            <UserPlus size={16} />Mitglieder anlegen
          </Btn>
        </Card>
      ) : holiday ? (
        <Card style={{ padding: 28, textAlign: "center", borderColor: C.amberDim, background: `${C.amber}08` }}>
          <Sparkles size={28} color={C.amber} style={{ margin: "0 auto 10px" }} />
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontStyle: "italic", color: C.amber }}>{holiday}</div>
          <div style={{ fontSize: 13, color: C.textDim, marginTop: 6 }}>Gesetzlicher Feiertag in Sachsen — heute fährt niemand zur Arbeit.</div>
        </Card>
      ) : weekend ? (
        <Card style={{ padding: 28, textAlign: "center" }}>
          <Clock size={28} color={C.textDim} style={{ margin: "0 auto 10px" }} />
          <div style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>Wochenende</div>
          <div style={{ color: C.textDim, fontSize: 14, marginTop: 4 }}>Heute fährt niemand zur Arbeit.</div>
        </Card>
      ) : (
        <>
          <ForecastCard state={state} today={today} />

          {iAmDriving && !trip.driverId && (
            <Card style={{
              padding: 14, marginBottom: 12, borderColor: C.amber,
              background: `linear-gradient(135deg, ${C.amber}22, ${C.amber}08)`,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <Bell size={18} color={C.amber} />
              <div style={{ flex: 1 }}>
                <div style={{ color: C.amber, fontWeight: 700, fontSize: 14 }}>Du fährst heute</div>
                <div style={{ color: C.textDim, fontSize: 12 }}>Vergiss nicht, deine Mitfahrer abzuholen.</div>
              </div>
            </Card>
          )}

          <Card style={{
            padding: 24, marginBottom: 16,
            background: `linear-gradient(160deg, ${C.surface}, ${C.bg2})`,
            borderColor: trip.driverId ? C.amberDim : C.border,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: -40, right: -40, width: 160, height: 160,
              borderRadius: "50%", background: `radial-gradient(circle, ${C.amber}22, transparent 70%)`,
            }} />
            <div style={{ position: "relative" }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.18em", color: C.amber,
                textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 8,
              }}>
                <Car size={14} />
                {trip.driverId
                  ? (state.weeklyAssignments?.[currentWeekKey] === trip.driverId
                      ? "Wochenfahrer"
                      : "Heute gefahren")
                  : dayDriver?.isSubstitute ? "Vertretung heute"
                  : "Vorschlag"}
              </div>
              {driver ? (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <Avatar member={driver} size={56} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: C.text, lineHeight: 1, fontStyle: "italic" }}>
                      {driver.name}
                    </div>
                    <div style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>
                      {trip.driverId ? "fährt heute"
                        : dayDriver.isSubstitute ? "übernimmt für " + (state.members.find((m) => m.id === dayDriver.originalDriverId)?.name || "Wochenfahrer")
                        : "ist als Nächste·r dran"}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: C.textDim, fontSize: 14 }}>
                  Niemand verfügbar — alle krank oder im Urlaub?
                </div>
              )}
            </div>
          </Card>

          <WhyPanel state={state} weekStart={startOfWeek(today)} />

          <SectionLabel style={{ marginTop: 24 }}>Status erfassen</SectionLabel>
          <Card style={{ padding: 4, marginBottom: 16 }}>
            {state.members.map((m, i) => {
              const status = trip.attendance?.[m.id];
              const isDriver = trip.driverId === m.id;
              const isWeekDriver = state.weeklyAssignments?.[currentWeekKey] === m.id;
              const isPending = pendingDriver === m.id;
              return (
                <div key={m.id} style={{
                  padding: "14px 14px",
                  borderBottom: i < state.members.length - 1 ? `1px solid ${C.borderSoft}` : "none",
                  display: "flex", alignItems: "center", gap: 12,
                  background: isPending ? `${C.amber}06` : "transparent",
                  transition: "background 200ms ease",
                }}>
                  <Avatar member={m} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.text, fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {m.name}
                      {state.myMemberId === m.id && (
                        <span style={{
                          fontSize: 9, fontFamily: FONT_MONO, color: C.amber,
                          border: `1px solid ${C.amberDim}`, padding: "1px 5px", borderRadius: 3, letterSpacing: "0.1em",
                        }}>ICH</span>
                      )}
                      {isWeekDriver && !isPending && (
                        <span style={{
                          fontSize: 9, fontFamily: FONT_MONO, color: C.blue,
                          border: `1px solid ${C.blue}55`, padding: "1px 5px", borderRadius: 3, letterSpacing: "0.1em",
                        }}>WOCHE</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>
                      {isPending ? <span style={{ color: C.amber }}>Wann fährt {m.name}?</span>
                        : isDriver ? "🚗 fährt"
                        : status === "rode" ? "🚙 mitgefahren"
                        : status === "solo" ? "🚗 solo (nicht gewertet)"
                        : status === "sick" ? "🤒 krank"
                        : status === "vacation" ? "✈️ Urlaub"
                        : status === "off" ? "— frei"
                        : "noch offen"}
                    </div>
                  </div>
                  {state.isAdmin && isPending ? (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button onClick={() => setWeekDriverHere(m.id)} style={{
                        background: C.amber, color: "#0b0b0d", border: "none",
                        borderRadius: 999, padding: "6px 12px",
                        fontSize: 12, fontFamily: FONT_BODY, fontWeight: 700, cursor: "pointer",
                      }}>Diese Woche</button>
                      <button onClick={() => setTodayDriver(m.id)} style={{
                        background: `${C.blue}22`, color: C.blue, border: `1px solid ${C.blue}55`,
                        borderRadius: 999, padding: "6px 12px",
                        fontSize: 12, fontFamily: FONT_BODY, fontWeight: 600, cursor: "pointer",
                      }}>Nur heute</button>
                      <button onClick={() => setPendingDriver(null)} style={{
                        background: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                        borderRadius: 999, padding: "6px 8px", cursor: "pointer",
                        display: "inline-flex", alignItems: "center",
                      }}><X size={12} /></button>
                    </div>
                  ) : (state.isAdmin || m.id === state.myMemberId) ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {state.isAdmin && (
                        <StatusPill active={isDriver} color={C.amber} label="Fahrer" icon={<Car size={13} />} onClick={() => handleFahrerTap(m.id)} />
                      )}
                      <StatusPill active={status === "rode"} color={C.blue} label="Mit" icon={<Users size={13} />} onClick={() => setAttendance(m.id, "rode")} />
                      <StatusPill active={status === "solo"} color={C.textDim} label="Solo" icon={<Car size={13} />} onClick={() => setSoloToday(m.id)} />
                      <StatusPill active={status === "sick"} color={C.red} label="Krank" icon={<Thermometer size={13} />} onClick={() => setAttendance(m.id, "sick")} />
                      <StatusPill active={status === "vacation"} color={C.green} label="Urlaub" icon={<Plane size={13} />} onClick={() => setAttendance(m.id, "vacation")} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </Card>

          {state.isAdmin && (trip.driverId || Object.keys(trip.attendance || {}).length > 0) && (
            <Btn variant="ghost" onClick={clearTrip} style={{ width: "100%", justifyContent: "center" }}>
              <RotateCcw size={14} />Heute zurücksetzen
            </Btn>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// GESAMTBILD: Warum diese·r Fahrer·in?  (Fairness-Ledger + Verfügbarkeit + Ausblick)
// ─────────────────────────────────────────────────────────────────────
function memberWeekStatus(state, weekStart, memberId) {
  const commute = [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i)).filter(isCommuteDay);
  if (commute.length === 0) return { available: false, label: "Feiertage", color: C.amber };
  if (commute.some((d) => isAvailableOn(state, d, memberId))) return { available: true, label: "verfügbar", color: C.green };
  const statuses = commute.map((d) => statusOf(state, ymd(d), memberId));
  if (statuses.includes("vacation")) return { available: false, label: "Urlaub", color: C.green };
  if (statuses.includes("sick")) return { available: false, label: "krank", color: C.red };
  if (statuses.includes("off")) return { available: false, label: "frei", color: C.textDim };
  return { available: false, label: "abwesend", color: C.textDim };
}

function WhyPanel({ state, weekStart }) {
  const [open, setOpen] = useState(false);
  if (state.members.length === 0) return null;

  const wd = getWeekDriver(state, weekStart);
  const proposed = wd ? state.members.find((m) => m.id === wd.id) : null;
  const counts = weekDriverCounts(state, weekStart);
  const total = state.members.reduce((a, m) => a + (counts[m.id] || 0), 0);
  const fair = state.members.length ? total / state.members.length : 0;
  const maxCount = Math.max(1, ...state.members.map((m) => counts[m.id] || 0));
  const ranked = [...state.members].sort((a, b) => {
    const d = (counts[a.id] || 0) - (counts[b.id] || 0);
    return d !== 0 ? d : state.members.indexOf(a) - state.members.indexOf(b);
  });
  const reason = explainWeekDriver(state, weekStart, wd);
  const outlook = [1, 2, 3].map((k) => {
    const ws = addDays(weekStart, 7 * k);
    const d = getWeekDriver(state, ws);
    return { ws, member: d ? state.members.find((m) => m.id === d.id) : null };
  });

  return (
    <Card style={{ padding: 0, marginTop: 12, overflow: "hidden", borderColor: open ? `${C.blue}44` : C.border }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", background: "transparent", border: "none", cursor: "pointer",
        padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, color: C.text, fontFamily: FONT_BODY,
      }}>
        <BarChart3 size={15} color={C.blue} />
        <div style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 600 }}>
          Warum {proposed ? proposed.name.split(" ")[0] : "niemand"}? · Gesamtbild
        </div>
        {open ? <ChevronUp size={16} color={C.textDim} /> : <ChevronDown size={16} color={C.textDim} />}
      </button>

      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          {reason && (
            <div style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.5, marginBottom: 14 }}>{reason}</div>
          )}

          <SectionLabel style={{ marginBottom: 2 }}>Gefahrene Wochen · fairer Schnitt {fair.toFixed(1)}</SectionLabel>
          <div style={{ fontSize: 10.5, color: C.textFaint, marginBottom: 10, lineHeight: 1.4 }}>
            In Wochen gezählt — der Schnitt steigt mit jeder geplanten Woche.
          </div>
          {ranked.map((m) => {
            const c = counts[m.id] || 0;
            const dev = c - fair;
            const av = memberWeekStatus(state, weekStart, m.id);
            const isProposed = proposed && m.id === proposed.id;
            return (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "7px 8px",
                borderRadius: 8, marginBottom: 4,
                background: isProposed ? `${C.amber}10` : "transparent",
                border: `1px solid ${isProposed ? C.amberDim : "transparent"}`,
              }}>
                <Avatar member={m} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name.split(" ")[0]}</span>
                    {isProposed && (
                      <span style={{ fontSize: 8, fontFamily: FONT_MONO, color: C.amber, border: `1px solid ${C.amberDim}`, padding: "1px 4px", borderRadius: 3, letterSpacing: "0.08em" }}>DRAN</span>
                    )}
                  </div>
                  <div style={{ height: 4, background: C.bg2, borderRadius: 99, overflow: "hidden", marginTop: 4 }}>
                    <div style={{ width: `${(c / maxCount) * 100}%`, height: "100%", background: m.color, borderRadius: 99, opacity: av.available ? 1 : 0.4 }} />
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 60 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 14, color: C.text, lineHeight: 1 }}>{c}<span style={{ fontSize: 9, color: C.textFaint }}> Wo</span></div>
                  <div style={{ fontSize: 9.5, fontFamily: FONT_MONO, color: av.available ? C.textFaint : av.color }}>
                    {av.available ? `${dev > 0 ? "+" : ""}${dev.toFixed(1)}` : av.label}
                  </div>
                </div>
              </div>
            );
          })}

          <SectionLabel style={{ marginTop: 14, marginBottom: 8 }}>Ausblick</SectionLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {outlook.map(({ ws, member }, i) => (
              <div key={i} style={{ flex: 1, background: C.bg2, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 9, fontFamily: FONT_MONO, color: C.textFaint, marginBottom: 5 }}>KW {isoWeek(ws)}</div>
                {member ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "center" }}><Avatar member={member} size={22} /></div>
                    <div style={{ fontSize: 10, color: C.textDim, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.name.split(" ")[0]}</div>
                  </>
                ) : <div style={{ fontSize: 10, color: C.textFaint, padding: "6px 0" }}>—</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// WOCHEN TAUSCHEN (Anfrage → Bestätigung)
// ─────────────────────────────────────────────────────────────────────
function weekLabel(weekKey) {
  const ws = parseYmd(weekKey);
  return `KW ${isoWeek(ws)} (${ws.getDate()}.–${addDays(ws, 4).getDate()}. ${MONTHS_DE[addDays(ws, 4).getMonth()].slice(0, 3)}.)`;
}
function createSwapRequest(state, setState, { fromMemberId, fromWeekKey, toMemberId, toWeekKey }) {
  const req = {
    id: `${fromWeekKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fromMemberId, fromWeekKey, toMemberId, toWeekKey: toWeekKey || null,
    status: "pending", createdAt: Date.now(),
  };
  setState({ ...state, swapRequests: [...(state.swapRequests || []), req] });
}
function acceptSwap(state, setState, req) {
  const swapRequests = (state.swapRequests || []).map((r) => (r.id === req.id ? { ...r, status: "accepted" } : r));
  const weeklyAssignments = { ...(state.weeklyAssignments || {}) };
  weeklyAssignments[req.fromWeekKey] = req.toMemberId;
  if (req.toWeekKey) weeklyAssignments[req.toWeekKey] = req.fromMemberId;
  setState({ ...state, swapRequests, weeklyAssignments });
}
function setSwapStatus(state, setState, reqId, status) {
  setState({ ...state, swapRequests: (state.swapRequests || []).map((r) => (r.id === reqId ? { ...r, status } : r)) });
}
function removeSwap(state, setState, reqId) {
  setState({ ...state, swapRequests: (state.swapRequests || []).filter((r) => r.id !== reqId) });
}

// Sheet zum Anlegen einer Tausch-Anfrage für eine konkrete (eigene) Woche.
function SwapSheet({ state, setState, fromWeekKey, fromMemberId, today, onClose }) {
  const others = state.members.filter((m) => m.id !== fromMemberId);
  const [toMemberId, setToMemberId] = useState(others[0]?.id || "");
  const [toWeekKey, setToWeekKey] = useState(null); // null = "nur abgeben"

  // Wochen, in denen die Zielperson (ab dieser Woche) fährt – als Tauschoptionen.
  const targetWeeks = useMemo(() => {
    if (!toMemberId) return [];
    const start = startOfWeek(today);
    const out = [];
    for (let i = 0; i < 8; i++) {
      const ws = addDays(start, i * 7);
      const key = ymd(ws);
      if (key === fromWeekKey) continue;
      const wd = getWeekDriver(state, ws);
      if (wd && wd.id === toMemberId) out.push(key);
    }
    return out;
  }, [state, toMemberId, today, fromWeekKey]);

  useEffect(() => { setToWeekKey(null); }, [toMemberId]);

  function submit() {
    if (!toMemberId) return;
    createSwapRequest(state, setState, { fromMemberId, fromWeekKey, toMemberId, toWeekKey });
    onClose();
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "#000a", zIndex: 120,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      backdropFilter: "blur(4px)", animation: "fadein 200ms ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.bg2, borderTop: `1px solid ${C.border}`, borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 720, maxHeight: "86vh", overflow: "auto",
        padding: "20px 18px 30px", animation: "slideup 280ms cubic-bezier(.2,.9,.3,1)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.18em", color: C.textFaint, marginBottom: 4 }}>DEINE WOCHE</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontStyle: "italic", color: C.text }}>{weekLabel(fromWeekKey)}</div>
          </div>
          <button onClick={onClose} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.textDim, borderRadius: 8, padding: 6, cursor: "pointer" }}><X size={18} /></button>
        </div>

        <SectionLabel>Mit wem tauschen?</SectionLabel>
        <select value={toMemberId} onChange={(e) => setToMemberId(e.target.value)} style={{
          width: "100%", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "10px 12px", color: C.text, fontFamily: FONT_BODY, fontSize: 14, marginBottom: 16, outline: "none",
        }}>
          {others.map((m) => <option key={m.id} value={m.id} style={{ background: C.bg2 }}>{m.name}</option>)}
        </select>

        <SectionLabel>Wie?</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          <button onClick={() => setToWeekKey(null)} style={{
            textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
            background: toWeekKey === null ? `${C.amber}16` : C.surface,
            border: `1px solid ${toWeekKey === null ? C.amber : C.border}`, color: C.text,
            fontFamily: FONT_BODY, fontSize: 14,
          }}>
            <div style={{ fontWeight: 600 }}>Woche abgeben</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>Die andere Person übernimmt deine Woche – du bekommst keine zurück.</div>
          </button>
          {targetWeeks.map((key) => (
            <button key={key} onClick={() => setToWeekKey(key)} style={{
              textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
              background: toWeekKey === key ? `${C.amber}16` : C.surface,
              border: `1px solid ${toWeekKey === key ? C.amber : C.border}`, color: C.text,
              fontFamily: FONT_BODY, fontSize: 14,
            }}>
              <div style={{ fontWeight: 600 }}>Tauschen ↔ {weekLabel(key)}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>Ihr tauscht beide Wochen – du fährst dafür diese.</div>
            </button>
          ))}
        </div>

        <Btn variant="primary" onClick={submit} disabled={!toMemberId} style={{ width: "100%", justifyContent: "center" }}>
          <ArrowRight size={16} />Tausch anfragen
        </Btn>
        <div style={{ fontSize: 11, color: C.textFaint, textAlign: "center", marginTop: 10 }}>
          Wird erst wirksam, wenn die andere Person zustimmt.
        </div>
      </div>
    </div>
  );
}

// Liste der Tausch-Anfragen, die mich betreffen (eingehend + ausgehend).
function SwapRequestsList({ state, setState }) {
  const me = state.myMemberId;
  if (!me) return null;
  const reqs = state.swapRequests || [];
  const nameOf = (id) => state.members.find((m) => m.id === id)?.name.split(" ")[0] || "?";
  const incoming = reqs.filter((r) => r.toMemberId === me && r.status === "pending");
  const outgoing = reqs.filter((r) => r.fromMemberId === me && r.status === "pending");
  const resolved = reqs.filter((r) => (r.fromMemberId === me || r.toMemberId === me) && r.status !== "pending");
  if (incoming.length === 0 && outgoing.length === 0 && resolved.length === 0) return null;

  const swapText = (r) => r.toWeekKey
    ? `${weekLabel(r.fromWeekKey)} ↔ ${weekLabel(r.toWeekKey)}`
    : `übernimmt ${weekLabel(r.fromWeekKey)}`;

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel>Tausch-Anfragen</SectionLabel>
      <Card style={{ padding: 4 }}>
        {incoming.map((r) => (
          <div key={r.id} style={{ padding: "12px", borderBottom: `1px solid ${C.borderSoft}` }}>
            <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>
              <b>{nameOf(r.fromMemberId)}</b> möchte tauschen: <span style={{ color: C.textDim }}>{swapText(r)}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="primary" onClick={() => acceptSwap(state, setState, r)} style={{ flex: 1, justifyContent: "center", padding: "8px" }}>Annehmen</Btn>
              <Btn onClick={() => setSwapStatus(state, setState, r.id, "declined")} style={{ flex: 1, justifyContent: "center", padding: "8px" }}>Ablehnen</Btn>
            </div>
          </div>
        ))}
        {outgoing.map((r) => (
          <div key={r.id} style={{ padding: "12px", borderBottom: `1px solid ${C.borderSoft}`, display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={15} color={C.textDim} />
            <div style={{ flex: 1, fontSize: 12.5, color: C.textDim }}>
              An <b style={{ color: C.text }}>{nameOf(r.toMemberId)}</b>: {swapText(r)} · <span style={{ color: C.amber }}>wartet</span>
            </div>
            <button onClick={() => setSwapStatus(state, setState, r.id, "cancelled")} style={{ background: "transparent", border: "none", color: C.textDim, cursor: "pointer", padding: 4 }}><X size={15} /></button>
          </div>
        ))}
        {resolved.slice(-3).map((r, i, arr) => (
          <div key={r.id} style={{ padding: "10px 12px", borderBottom: i < arr.length - 1 ? `1px solid ${C.borderSoft}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, fontSize: 12, color: C.textFaint }}>
              {swapText(r)} · {r.status === "accepted" ? <span style={{ color: C.green }}>getauscht</span> : r.status === "declined" ? "abgelehnt" : "zurückgezogen"}
            </div>
            <button onClick={() => removeSwap(state, setState, r.id)} style={{ background: "transparent", border: "none", color: C.textFaint, cursor: "pointer", padding: 4 }}><X size={14} /></button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// VIEW: WOCHE
// ─────────────────────────────────────────────────────────────────────
function WeekView({ state, setState, today }) {
  const [offset, setOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const weekStart = startOfWeek(addDays(today, offset * 7));
  const days = [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));
  const wk = getWeekDriver(state, weekStart);
  const weekDriverObj = wk ? state.members.find((m) => m.id === wk.id) : null;
  const [swapOpen, setSwapOpen] = useState(false);
  const currentWeekStart = startOfWeek(today);
  const iDriveThisWeek = Boolean(state.myMemberId) && wk && wk.id === state.myMemberId;
  const canSwap = iDriveThisWeek && weekStart.getTime() >= currentWeekStart.getTime();

  return (
    <div style={{ padding: "20px 18px 100px", maxWidth: 720, margin: "0 auto" }}>
      <SwapRequestsList state={state} setState={setState} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <SectionLabel style={{ marginBottom: 4 }}>Kalenderwoche {isoWeek(weekStart)}</SectionLabel>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontStyle: "italic", color: C.text }}>
            {weekStart.getDate()}. – {addDays(weekStart, 4).getDate()}. {MONTHS_DE[addDays(weekStart, 4).getMonth()]}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn onClick={() => setOffset(offset - 1)} style={{ padding: "8px 10px" }}><ChevronLeft size={16} /></Btn>
          <Btn onClick={() => setOffset(0)} variant={offset === 0 ? "primary" : "default"} style={{ padding: "8px 12px" }}>Heute</Btn>
          <Btn onClick={() => setOffset(offset + 1)} style={{ padding: "8px 10px" }}><ChevronRight size={16} /></Btn>
        </div>
      </div>

      {weekDriverObj && (
        <>
          <Card style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar member={weekDriverObj} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 2 }}>
                Wochenfahrer · {wk.source === "manual" ? "manuell" : wk.source === "logged" ? "schon gefahren" : "Vorschlag"}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontStyle: "italic", color: C.text }}>{weekDriverObj.name}</div>
            </div>
            {canSwap ? (
              <Btn onClick={() => setSwapOpen(true)} style={{ padding: "8px 12px", flexShrink: 0 }}><ArrowRight size={14} />Tauschen</Btn>
            ) : (
              <Car size={20} color={C.amber} />
            )}
          </Card>
          <WhyPanel state={state} weekStart={weekStart} />
          <div style={{ height: 16 }} />
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {days.map((d) => {
          const key = ymd(d);
          const trip = state.trips[key];
          const dayDr = computeDayDriver(state, d);
          const driver = dayDr ? state.members.find((m) => m.id === dayDr.id) : null;
          const isToday = ymd(d) === ymd(today);
          const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const holiday = holidayFor(d);

          const att = trip?.attendance || {};
          const sickCount = Object.values(att).filter((v) => v === "sick").length;
          const vacCount = Object.values(att).filter((v) => v === "vacation").length;
          const rodeCount = Object.values(att).filter((v) => v === "rode").length;
          const soloCount = Object.values(att).filter((v) => v === "solo").length;

          return (
            <Card
              key={key}
              onClick={() => setSelectedDay(d)}
              style={{
                padding: 14,
                display: "flex", alignItems: "center", gap: 14,
                borderColor: isToday ? C.amberDim : holiday ? C.amberSoft : C.border,
                background: isToday ? `${C.amber}08` : holiday ? `${C.amber}05` : C.surface,
                opacity: isPast && !trip && !holiday ? 0.55 : 1,
                cursor: "pointer",
                transition: "transform 150ms ease, border-color 150ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateX(0)")}
            >
              <div style={{ width: 44, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.textDim, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>{DAYS_DE[d.getDay()]}</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 28, color: isToday ? C.amber : C.text, lineHeight: 1 }}>
                  {d.getDate()}
                </div>
              </div>
              <div style={{ width: 1, height: 36, background: C.border }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {holiday ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles size={14} color={C.amber} />
                    <div>
                      <div style={{ color: C.amber, fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 18, lineHeight: 1.1 }}>{holiday}</div>
                      <div style={{ fontSize: 11, color: C.textDim }}>Feiertag · keine Fahrt</div>
                    </div>
                  </div>
                ) : driver ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar member={driver} size={28} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: C.text, fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {driver.name}
                      </div>
                      <div style={{ fontSize: 11, color: dayDr.isSubstitute ? C.blue : C.textDim }}>
                        {dayDr.source === "logged" ? "ist gefahren"
                          : dayDr.isSubstitute ? "Vertretung"
                          : "Vorschlag"}
                      </div>
                    </div>
                  </div>
                ) : soloCount > 0 ? (
                  <div style={{ color: C.textDim, fontSize: 13 }}>
                    {soloCount === 1 ? "1 Person solo" : `${soloCount} Personen solo`}
                    <span style={{ color: C.textFaint }}> · nicht gewertet</span>
                  </div>
                ) : (
                  <div style={{ color: C.textFaint, fontSize: 13, fontStyle: "italic" }}>
                    {isPast ? "nicht erfasst" : "offen"}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, fontSize: 11, color: C.textDim }}>
                {rodeCount > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Users size={11} />{rodeCount}</span>}
                {soloCount > 0 && driver && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Car size={11} />{soloCount}</span>}
                {sickCount > 0 && <span style={{ color: C.red, display: "flex", alignItems: "center", gap: 3 }}><Thermometer size={11} />{sickCount}</span>}
                {vacCount > 0 && <span style={{ color: C.green, display: "flex", alignItems: "center", gap: 3 }}><Plane size={11} />{vacCount}</span>}
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: C.textFaint, textAlign: "center", fontFamily: FONT_MONO }}>
        Tap auf einen Tag → Status erfassen
      </div>

      {selectedDay && <DayDetailSheet date={selectedDay} state={state} setState={setState} onClose={() => setSelectedDay(null)} />}
      {swapOpen && (
        <SwapSheet state={state} setState={setState} today={today}
          fromWeekKey={ymd(weekStart)} fromMemberId={state.myMemberId}
          onClose={() => setSwapOpen(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// VIEW: PLANUNG
// ─────────────────────────────────────────────────────────────────────
function PlanningView({ state, setState, today }) {
  const [memberId, setMemberId] = useState(state.myMemberId || state.members[0]?.id || "");
  const [absMode, setAbsMode] = useState("range"); // 'range' | 'weekly'
  const [fromDate, setFromDate] = useState(ymd(today));
  const [toDate, setToDate] = useState(ymd(today));
  const [untilDate, setUntilDate] = useState(ymd(new Date(today.getFullYear(), 11, 31)));
  const [weekdays, setWeekdays] = useState([]); // 1=Mo … 5=Fr
  const [absenceType, setAbsenceType] = useState("vacation");
  const [selectedDay, setSelectedDay] = useState(null);
  const [swapWeekKey, setSwapWeekKey] = useState(null);

  // Nicht-Admins dürfen nur die eigene Abwesenheit eintragen.
  const lockToSelf = !state.isAdmin && Boolean(state.myMemberId);
  const effMemberId = lockToSelf ? state.myMemberId : memberId;

  // sync member when settings change
  useEffect(() => {
    if (lockToSelf) {
      if (memberId !== state.myMemberId) setMemberId(state.myMemberId);
      return;
    }
    if (!state.members.find((m) => m.id === memberId) && state.members[0]) {
      setMemberId(state.members[0].id);
    }
  }, [state.members, lockToSelf, state.myMemberId]);

  function toggleWeekday(n) {
    setWeekdays((w) => (w.includes(n) ? w.filter((x) => x !== n) : [...w, n].sort()));
  }

  function applyAbsence() {
    if (!effMemberId) return;
    const next = { ...state, trips: { ...state.trips } };
    const writeDay = (d) => {
      if (!isCommuteDay(d)) return; // nur Pendeltage (kein WE / Feiertag)
      const k = ymd(d);
      const t = { ...(next.trips[k] || { attendance: {} }) };
      t.attendance = { ...(t.attendance || {}) };
      t.attendance[effMemberId] = absenceType;
      next.trips[k] = t;
    };
    if (absMode === "weekly") {
      if (weekdays.length === 0 || !fromDate || !untilDate) return;
      let d = parseYmd(fromDate);
      const end = parseYmd(untilDate);
      while (d <= end) {
        if (weekdays.includes(d.getDay())) writeDay(d);
        d = addDays(d, 1);
      }
    } else {
      if (!fromDate || !toDate) return;
      let d = parseYmd(fromDate);
      const end = parseYmd(toDate);
      while (d <= end) { writeDay(d); d = addDays(d, 1); }
    }
    setState(next);
  }

  // Aktuelle/nächste 6 Wochen
  const weeks = useMemo(() => {
    const start = startOfWeek(today);
    return [0, 1, 2, 3, 4, 5].map((i) => addDays(start, i * 7));
  }, [today]);

  // Sammle alle geplanten Abwesenheiten in der Zukunft
  const upcomingAbsences = useMemo(() => {
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const result = [];
    Object.entries(state.trips).forEach(([dateKey, trip]) => {
      const date = parseYmd(dateKey);
      if (date < now) return;
      Object.entries(trip.attendance || {}).forEach(([mid, status]) => {
        if (status === "sick" || status === "vacation" || status === "off") {
          result.push({ date, dateKey, memberId: mid, status });
        }
      });
    });
    result.sort((a, b) => a.date - b.date);
    // Gruppieren: zusammenhängender Zeitraum (nächster Pendeltag) ODER
    // wiederkehrend (gleicher Wochentag, 7 Tage Abstand).
    const isContig = (last, entry) => {
      let x = addDays(last.endDate, 1);
      while (!isCommuteDay(x)) x = addDays(x, 1);
      return ymd(x) === entry.dateKey;
    };
    const isWeekly = (last, entry) => {
      const gap = Math.round((entry.date - last.endDate) / 86400000);
      return gap === 7 && entry.date.getDay() === last.startDate.getDay();
    };
    const grouped = [];
    result.forEach((entry) => {
      const last = grouped[grouped.length - 1];
      if (last && last.memberId === entry.memberId && last.status === entry.status) {
        if ((last.kind === "range" || last.kind === "single") && isContig(last, entry)) {
          last.endDate = entry.date; last.dateKeys.push(entry.dateKey); last.kind = "range"; return;
        }
        if ((last.kind === "weekly" || last.kind === "single") && isWeekly(last, entry)) {
          last.endDate = entry.date; last.dateKeys.push(entry.dateKey); last.kind = "weekly"; return;
        }
      }
      grouped.push({
        memberId: entry.memberId, status: entry.status,
        startDate: entry.date, endDate: entry.date,
        dateKeys: [entry.dateKey], kind: "single",
      });
    });
    return grouped;
  }, [state.trips, today]);

  function removeAbsence(group) {
    const next = { ...state, trips: { ...state.trips } };
    group.dateKeys.forEach((k) => {
      if (next.trips[k]?.attendance?.[group.memberId]) {
        const t = { ...next.trips[k], attendance: { ...next.trips[k].attendance } };
        delete t.attendance[group.memberId];
        // Wenn Trip leer → ganz löschen
        if (!t.driverId && Object.keys(t.attendance).length === 0) {
          delete next.trips[k];
        } else {
          next.trips[k] = t;
        }
      }
    });
    setState(next);
  }

  return (
    <div style={{ padding: "20px 18px 100px", maxWidth: 720, margin: "0 auto" }}>
      <SectionLabel style={{ marginBottom: 4 }}>Voraus planen</SectionLabel>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontStyle: "italic", color: C.text, marginBottom: 24 }}>Planung</div>

      {state.members.length === 0 ? (
        <Card style={{ padding: 24, textAlign: "center", color: C.textDim }}>Lege zuerst Mitglieder an.</Card>
      ) : (
        <>
          <SwapRequestsList state={state} setState={setState} />

          {/* Abwesenheit eintragen */}
          <SectionLabel>Abwesenheit eintragen · Urlaub · Krank · Frei</SectionLabel>
          <Card style={{ padding: 16, marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: C.textDim, display: "block", marginBottom: 6 }}>Wer?</label>
            <select
              value={effMemberId} onChange={(e) => setMemberId(e.target.value)} disabled={lockToSelf}
              style={{
                width: "100%", background: C.bg2, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "10px 12px", color: C.text,
                fontFamily: FONT_BODY, fontSize: 14, marginBottom: lockToSelf ? 6 : 14, outline: "none",
                opacity: lockToSelf ? 0.7 : 1,
              }}
            >
              {state.members.map((m) => <option key={m.id} value={m.id} style={{ background: C.bg2 }}>{m.name}</option>)}
            </select>
            {lockToSelf && (
              <div style={{ fontSize: 11, color: C.textFaint, fontStyle: "italic", marginBottom: 14 }}>
                Du kannst nur deine eigene Abwesenheit eintragen.
              </div>
            )}

            {/* Modus: Zeitraum oder Wiederkehrend */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[["range", "Zeitraum"], ["weekly", "Wiederkehrend"]].map(([m, label]) => (
                <button key={m} onClick={() => setAbsMode(m)}
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: 10,
                    background: absMode === m ? `${C.amber}18` : "transparent",
                    border: `1px solid ${absMode === m ? C.amber : C.border}`,
                    color: absMode === m ? C.amber : C.textDim,
                    fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >{label}</button>
              ))}
            </div>

            {absMode === "range" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.textDim, display: "block", marginBottom: 6 }}>Von</label>
                  <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); if (e.target.value > toDate) setToDate(e.target.value); }}
                    style={{ width: "100%", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: FONT_MONO, fontSize: 14, outline: "none", colorScheme: "dark" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.textDim, display: "block", marginBottom: 6 }}>Bis</label>
                  <input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)}
                    style={{ width: "100%", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: FONT_MONO, fontSize: 14, outline: "none", colorScheme: "dark" }} />
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.textDim, display: "block", marginBottom: 6 }}>An welchen Tagen?</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {[[1, "Mo"], [2, "Di"], [3, "Mi"], [4, "Do"], [5, "Fr"]].map(([n, label]) => {
                    const on = weekdays.includes(n);
                    return (
                      <button key={n} onClick={() => toggleWeekday(n)}
                        style={{
                          flex: 1, padding: "9px 0", borderRadius: 8,
                          background: on ? `${C.amber}22` : "transparent",
                          border: `1px solid ${on ? C.amber : C.border}`,
                          color: on ? C.amber : C.textDim,
                          fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}
                      >{label}</button>
                    );
                  })}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: C.textDim, display: "block", marginBottom: 6 }}>Ab</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                      style={{ width: "100%", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: FONT_MONO, fontSize: 14, outline: "none", colorScheme: "dark" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: C.textDim, display: "block", marginBottom: 6 }}>Bis</label>
                    <input type="date" value={untilDate} min={fromDate} onChange={(e) => setUntilDate(e.target.value)}
                      style={{ width: "100%", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: FONT_MONO, fontSize: 14, outline: "none", colorScheme: "dark" }} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button onClick={() => setAbsenceType("vacation")}
                style={{ flex: 1, padding: "10px 8px", borderRadius: 10, background: absenceType === "vacation" ? `${C.green}22` : "transparent", border: `1px solid ${absenceType === "vacation" ? C.green : C.border}`, color: absenceType === "vacation" ? C.green : C.textDim, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              ><Plane size={14} />Urlaub</button>
              <button onClick={() => setAbsenceType("sick")}
                style={{ flex: 1, padding: "10px 8px", borderRadius: 10, background: absenceType === "sick" ? `${C.red}22` : "transparent", border: `1px solid ${absenceType === "sick" ? C.red : C.border}`, color: absenceType === "sick" ? C.red : C.textDim, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              ><Thermometer size={14} />Krank</button>
              <button onClick={() => setAbsenceType("off")}
                style={{ flex: 1, padding: "10px 8px", borderRadius: 10, background: absenceType === "off" ? `${C.blue}22` : "transparent", border: `1px solid ${absenceType === "off" ? C.blue : C.border}`, color: absenceType === "off" ? C.blue : C.textDim, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              ><Clock size={14} />Frei</button>
            </div>

            <Btn variant="primary" onClick={applyAbsence}
              disabled={absMode === "weekly" && weekdays.length === 0}
              style={{ width: "100%", justifyContent: "center" }}>
              <CalendarPlus size={14} />
              {absMode === "weekly" ? "Wiederkehrend eintragen" : "Abwesenheit eintragen"}
            </Btn>
          </Card>

          {/* Wochenübersicht */}
          <SectionLabel>Nächste Wochen · Tap zum Bearbeiten</SectionLabel>
          {weeks.map((wkStart) => {
            const wd = getWeekDriver(state, wkStart);
            const wDriverObj = wd ? state.members.find((m) => m.id === wd.id) : null;
            const reason = explainWeekDriver(state, wkStart, wd);
            const manualImp = wd && wd.source === "manual" ? manualWeekImpact(state, wkStart) : null;
            return (
              <Card key={ymd(wkStart)} style={{ padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.textDim, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>KW {isoWeek(wkStart)}</div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontStyle: "italic", color: C.text }}>
                      {wkStart.getDate()}. – {addDays(wkStart, 4).getDate()}. {MONTHS_DE[addDays(wkStart, 4).getMonth()].slice(0, 3)}.
                    </div>
                  </div>
                  <div style={{ flex: 1 }} />
                  {wDriverObj && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar member={wDriverObj} size={28} />
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{wDriverObj.name.split(" ")[0]}</div>
                    </div>
                  )}
                  {wd && wd.id === state.myMemberId && (
                    <button onClick={() => setSwapWeekKey(ymd(wkStart))}
                      style={{
                        background: C.surface2, border: `1px solid ${C.border}`, color: C.textDim,
                        borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: 11,
                        fontFamily: FONT_BODY, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4,
                      }}
                    ><ArrowRight size={12} />Tauschen</button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
                  {[0, 1, 2, 3, 4].map((i) => {
                    const d = addDays(wkStart, i);
                    const dr = computeDayDriver(state, d);
                    const drObj = dr ? state.members.find((m) => m.id === dr.id) : null;
                    const hol = holidayFor(d);
                    return (
                      <button key={i} onClick={() => setSelectedDay(d)}
                        style={{
                          padding: "8px 4px", borderRadius: 8,
                          border: `1px solid ${hol ? C.amberSoft : C.borderSoft}`,
                          background: hol ? `${C.amber}10` : C.bg2,
                          cursor: "pointer", textAlign: "center", minHeight: 60,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                        }}
                      >
                        <div style={{ fontSize: 9, color: C.textDim, fontFamily: FONT_MONO }}>{DAYS_DE[d.getDay()]}</div>
                        <div style={{ fontSize: 14, color: hol ? C.amber : C.text, fontWeight: 600 }}>{d.getDate()}</div>
                        {hol ? (
                          <Sparkles size={10} color={C.amber} />
                        ) : drObj ? (
                          <div style={{
                            width: 16, height: 16, borderRadius: "50%",
                            background: drObj.color, border: dr.isSubstitute ? `1px dashed ${C.blue}` : "none",
                          }} />
                        ) : (
                          <div style={{ width: 16, height: 16 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
                {wDriverObj && manualImp ? (
                  <div style={{
                    marginTop: 10, padding: "9px 11px", borderRadius: 8,
                    background: `${C.amber}0c`, border: `1px solid ${C.amber}33`,
                    display: "flex", gap: 8, alignItems: "flex-start",
                  }}>
                    <RotateCcw size={13} color={C.amber} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 11.5, color: C.textDim, lineHeight: 1.45 }}>
                      <span style={{ color: C.amber, fontWeight: 600 }}>Manuell: {manualImp.manual?.name.split(" ")[0]}</span>
                      {manualImp.sameAsFair ? (
                        <span> · deckt sich mit dem App-Vorschlag</span>
                      ) : manualImp.fair ? (
                        <> · <span style={{ color: C.blue, fontWeight: 600 }}>App-Vorschlag wäre {manualImp.fair.name.split(" ")[0]}</span></>
                      ) : null}
                      <div style={{ marginTop: 4 }}>
                        {manualImp.sameAsFair ? (
                          "Kein Nachteil für die anderen — die manuelle Wahl entspricht der fairen Rotation."
                        ) : manualImp.fair ? (
                          <>Überschreibt die faire Rotation: <span style={{ color: C.text }}>{manualImp.manual?.name.split(" ")[0]}</span> fährt statt <span style={{ color: C.text }}>{manualImp.fair.name.split(" ")[0]}</span> ({manualImp.fairDevText}). Dadurch fährt {manualImp.manual?.name.split(" ")[0]} 1× mehr als nötig, {manualImp.fair.name.split(" ")[0]} rückt nach hinten und kommt erst später dran.</>
                        ) : (
                          "Manuell festgelegt – überschreibt die faire Rotation."
                        )}
                      </div>
                    </div>
                  </div>
                ) : wDriverObj && reason ? (
                  <div style={{
                    marginTop: 10, padding: "9px 11px", borderRadius: 8,
                    background: `${C.blue}0c`, border: `1px solid ${C.blue}22`,
                    display: "flex", gap: 8, alignItems: "flex-start",
                  }}>
                    <BarChart3 size={13} color={C.blue} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 11.5, color: C.textDim, lineHeight: 1.45 }}>
                      <span style={{ color: C.text, fontWeight: 600 }}>{wDriverObj.name.split(" ")[0]}</span>{" "}
                      {reason}
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}

          {/* Geplante Abwesenheiten */}
          {upcomingAbsences.length > 0 && (
            <>
              <SectionLabel style={{ marginTop: 24 }}>Eingetragene Abwesenheiten</SectionLabel>
              <Card style={{ padding: 4 }}>
                {upcomingAbsences.map((g, i) => {
                  const m = state.members.find((x) => x.id === g.memberId);
                  if (!m) return null;
                  const sameDay = g.startDate.getTime() === g.endDate.getTime();
                  const statusLabel = g.status === "sick"
                    ? <span style={{ color: C.red }}>krank</span>
                    : g.status === "off"
                    ? <span style={{ color: C.blue }}>frei</span>
                    : <span style={{ color: C.green }}>Urlaub</span>;
                  const dateText = g.kind === "weekly"
                    ? `jeden ${DAYS_DE_LONG[g.startDate.getDay()]} · bis ${formatDateShort(g.endDate)}`
                    : sameDay
                    ? formatDateShort(g.startDate)
                    : `${formatDateShort(g.startDate)} → ${formatDateShort(g.endDate)}`;
                  return (
                    <div key={i} style={{
                      padding: "12px 12px",
                      borderBottom: i < upcomingAbsences.length - 1 ? `1px solid ${C.borderSoft}` : "none",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <Avatar member={m} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>
                          {m.name} · {statusLabel}
                          {g.kind === "weekly" && (
                            <span style={{ fontSize: 9, fontFamily: FONT_MONO, color: C.amber, border: `1px solid ${C.amberDim}`, padding: "1px 5px", borderRadius: 3, letterSpacing: "0.08em", marginLeft: 6 }}>WIEDERKEHREND</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: C.textDim, fontFamily: FONT_MONO }}>
                          {dateText}{" · "}{g.dateKeys.length} Tag{g.dateKeys.length > 1 ? "e" : ""}
                        </div>
                      </div>
                      <button onClick={() => removeAbsence(g)}
                        style={{ background: "transparent", border: "none", color: C.textDim, cursor: "pointer", padding: 4, borderRadius: 6 }}
                      ><X size={16} /></button>
                    </div>
                  );
                })}
              </Card>
            </>
          )}
        </>
      )}

      {selectedDay && <DayDetailSheet date={selectedDay} state={state} setState={setState} onClose={() => setSelectedDay(null)} />}
      {swapWeekKey && (
        <SwapSheet state={state} setState={setState} today={today}
          fromWeekKey={swapWeekKey} fromMemberId={state.myMemberId}
          onClose={() => setSwapWeekKey(null)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// VIEW: STATISTIK
// ─────────────────────────────────────────────────────────────────────
function StatsView({ state }) {
  const stats = useMemo(() => {
    const counts = {}, rode = {}, sick = {}, vacation = {}, solo = {};
    state.members.forEach((m) => { counts[m.id] = 0; rode[m.id] = 0; sick[m.id] = 0; vacation[m.id] = 0; solo[m.id] = 0; });
    let soloTrips = 0;
    Object.values(state.trips).forEach((trip) => {
      if (trip.driverId !== undefined && trip.driverId !== null) {
        if (trip.solo) {
          // Alt-Daten: Solo war früher am Fahrer markiert
          if (solo[trip.driverId] !== undefined) solo[trip.driverId] += 1;
          soloTrips += 1;
        } else if (counts[trip.driverId] !== undefined) {
          counts[trip.driverId] += 1;
        }
      }
      if (trip.attendance) {
        Object.entries(trip.attendance).forEach(([mid, status]) => {
          if (status === "rode" && rode[mid] !== undefined) rode[mid] += 1;
          if (status === "sick" && sick[mid] !== undefined) sick[mid] += 1;
          if (status === "vacation" && vacation[mid] !== undefined) vacation[mid] += 1;
          if (status === "solo" && solo[mid] !== undefined) { solo[mid] += 1; soloTrips += 1; }
        });
      }
    });

    // Abwesenheits-gewichteter fairer Anteil: jeder gefahrene Gruppentag wird nur
    // unter den an DEM Tag Anwesenden aufgeteilt. Wer krank/Urlaub war, bekommt für
    // diesen Tag keine Fahrpflicht angerechnet. Summe = Anzahl Gruppen-Fahrtage.
    const personalFair = {};
    state.members.forEach((m) => { personalFair[m.id] = 0; });
    Object.values(state.trips).forEach((trip) => {
      if (!trip.driverId || trip.solo) return; // nur echte Gruppen-Fahrtage
      const avail = state.members.filter((m) => {
        const s = trip.attendance?.[m.id];
        return s !== "sick" && s !== "vacation" && s !== "off" && s !== "solo";
      });
      if (avail.length === 0) return;
      const share = 1 / avail.length;
      avail.forEach((m) => { personalFair[m.id] += share; });
    });

    return { counts, rode, sick, vacation, solo, soloTrips, personalFair };
  }, [state]);

  const totalTrips = Object.values(stats.counts).reduce((a, b) => a + b, 0);
  const fairShare = state.members.length > 0 ? totalTrips / state.members.length : 0;
  const kmPer = state.kmPerTrip || 30;
  const totalKm = totalTrips * kmPer;
  const soloKm = stats.soloTrips * kmPer;
  // CO2: nur gemeinschaftliche Fahrten sparen etwas (jede:r Mitfahrende spart eine eigene Fahrt).
  // Solo-Fahrten transportieren niemanden zusätzlich → kein CO2-Vorteil.
  // Ergebnis ist bereits in KILOGRAMM (CO2_KG_PER_KM ist kg/km) – nicht durch 1000 teilen.
  const co2SavedKg = totalKm * Math.max(0, state.members.length - 1) * CO2_KG_PER_KM;
  const co2Display = co2SavedKg >= 1000
    ? { value: (co2SavedKg / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 }), suffix: "t" }
    : { value: Math.round(co2SavedKg).toLocaleString("de-DE"), suffix: "kg" };
  const max = Math.max(1, ...Object.values(stats.counts));
  const ranked = [...state.members].sort((a, b) => (stats.counts[a.id] || 0) - (stats.counts[b.id] || 0));
  // Wer ist als Nächstes dran – aus der echten Rotations-Engine (konsistent mit Heute/Planung).
  const nextDriverId = state.members.length > 1 ? getWeekDriver(state, startOfWeek(new Date()))?.id : null;

  return (
    <div style={{ padding: "20px 18px 100px", maxWidth: 720, margin: "0 auto" }}>
      <SectionLabel style={{ marginBottom: 4 }}>Cockpit</SectionLabel>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontStyle: "italic", color: C.text, marginBottom: 24 }}>Faire Aufteilung</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Fahrten gesamt" value={totalTrips} suffix="Tage" accent={C.amber} />
        <KpiCard label="Fairer Anteil" value={fairShare.toFixed(1)} suffix="je Person" accent={C.blue}
          hint={`${totalTrips} Fahrten ÷ ${state.members.length} Personen = ${fairShare.toFixed(1)}. Das ist der ideale Schnitt, wenn alle immer da wären. Unten siehst du den persönlichen, anwesenheits­gewichteten Anteil. Hinweis: Die Statistik zählt einzelne Fahrtage, die Planung ganze Wochen — daher andere Zahlen.`} />
        <KpiCard label="Gefahrene Kilometer" value={totalKm.toLocaleString("de-DE")} suffix="km" accent={C.text}
          hint={`${totalTrips} Fahrten × ${kmPer} km je Fahrt = ${totalKm.toLocaleString("de-DE")} km. Die km je Fahrt stellst du unter „Mehr" ein.`} />
        <KpiCard label="CO₂ eingespart" value={co2Display.value} suffix={co2Display.suffix} accent={C.green}
          hint={`Schätzung: An jedem Gruppen-Fahrtag sparen sich ${Math.max(0, state.members.length - 1)} Mitfahrer·innen die eigene Fahrt. ${Math.max(0, state.members.length - 1)} × ${totalKm.toLocaleString("de-DE")} km × ${CO2_KG_PER_KM} kg/km ≈ ${Math.round(co2SavedKg).toLocaleString("de-DE")} kg.`} />
        {stats.soloTrips > 0 && (
          <KpiCard label="Solo-Fahrten" value={stats.soloTrips} suffix={`Tage · ${soloKm.toLocaleString("de-DE")} km`} accent={C.textDim}
            hint="Solo-Fahrten zählen nicht zur Fahrpflicht – sie nehmen niemandem aus der Gruppe eine Fahrt ab und senken deshalb keinen fairen Anteil." />
        )}
      </div>

      {state.members.length === 0 ? (
        <Card style={{ padding: 24, textAlign: "center", color: C.textDim }}>Noch keine Mitglieder.</Card>
      ) : (
        <Card style={{ padding: 18 }}>
          <SectionLabel>Verteilung · fairer Anteil je Person</SectionLabel>
          {ranked.map((m, i) => {
            const c = stats.counts[m.id] || 0;
            const pct = (c / max) * 100;
            const pf = stats.personalFair[m.id] || 0;
            const deviation = c - pf;
            const isNext = m.id === nextDriverId;
            return (
              <div key={m.id} style={{ marginBottom: i === ranked.length - 1 ? 0 : 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Avatar member={m} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{m.name}</span>
                      {isNext && (
                        <span style={{
                          fontSize: 9, fontFamily: FONT_MONO, color: C.amber,
                          border: `1px solid ${C.amberDim}`, background: `${C.amber}11`,
                          padding: "2px 6px", borderRadius: 4, letterSpacing: "0.1em",
                        }}>NÄCHSTE·R</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.textDim, fontFamily: FONT_MONO }}>
                      {stats.rode[m.id] || 0} mit · {stats.sick[m.id] || 0} krank · {stats.vacation[m.id] || 0} Urlaub{(stats.solo[m.id] || 0) > 0 ? ` · ${stats.solo[m.id]} solo` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 22, color: C.text, fontWeight: 600, lineHeight: 1 }}>{c}</div>
                    <div style={{
                      fontSize: 10, fontFamily: FONT_MONO,
                      color: deviation > 0.5 ? C.amber : deviation < -0.5 ? C.green : C.textDim,
                    }}>{deviation > 0 ? "+" : ""}{deviation.toFixed(1)}</div>
                    <div style={{ fontSize: 9, fontFamily: FONT_MONO, color: C.textFaint, marginTop: 1 }}>fair {pf.toFixed(1)}</div>
                  </div>
                </div>
                <div style={{ height: 6, background: C.bg2, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: `linear-gradient(90deg, ${m.color}, ${m.color}aa)`,
                    borderRadius: 99, transition: "width 400ms ease",
                  }} />
                </div>
              </div>
            );
          })}

          <div style={{ fontSize: 11, color: C.textFaint, lineHeight: 1.5, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.borderSoft}` }}>
            <span style={{ color: C.textDim }}>Abweichung</span> = gefahrene Fahrten − dein fairer Anteil.
            Der faire Anteil zählt nur Tage, an denen du da warst — <span style={{ color: C.green }}>Urlaub/Krank zählt nicht gegen dich</span>.
            Grün = unter dem Schnitt (du bist eher dran), Amber = darüber.
          </div>
        </Card>
      )}
    </div>
  );
}
function KpiCard({ label, value, suffix, accent, hint }) {
  const [showHint, setShowHint] = useState(false);
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
        <SectionLabel style={{ fontSize: 10, marginBottom: 8 }}>{label}</SectionLabel>
        {hint && (
          <button onClick={() => setShowHint((s) => !s)} aria-label="Erklärung anzeigen" style={{
            background: showHint ? `${C.blue}22` : "transparent", border: `1px solid ${showHint ? C.blue : C.border}`,
            color: showHint ? C.blue : C.textFaint, width: 18, height: 18, borderRadius: "50%",
            fontSize: 11, lineHeight: "16px", cursor: "pointer", fontFamily: FONT_MONO, padding: 0, flexShrink: 0,
          }}>?</button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 32, color: accent, lineHeight: 1, fontWeight: 400 }}>{value}</span>
        <span style={{ fontSize: 11, color: C.textDim, fontFamily: FONT_MONO }}>{suffix}</span>
      </div>
      {hint && showHint && (
        <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.45, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.borderSoft}` }}>{hint}</div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// VIEW: EINSTELLUNGEN
// ─────────────────────────────────────────────────────────────────────
function SettingsView({ state, setState, today, onLeaveGroup, onClaimMember, authInfo }) {
  const [newName, setNewName] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  function addMember() {
    if (!newName.trim()) return;
    if (state.members.length > 0 && !state.isAdmin) return; // nur Admin darf Mitglieder anlegen
    const id = `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const color = PALETTE[state.members.length % PALETTE.length];
    const next = { ...state, members: [...state.members, { id, name: newName.trim(), color }] };
    // Erstes Mitglied: wird Admin und automatisch als "ich" gesetzt.
    if (state.members.length === 0) {
      next.adminMemberId = id;
      next.myMemberId = id;
    }
    setState(next);
    setNewName("");
  }
  function removeMember(id) {
    if (!state.isAdmin) return;
    if (id === state.adminMemberId) return; // Admin-Mitglied nicht löschen
    const next = { ...state, members: state.members.filter((m) => m.id !== id) };
    if (state.myMemberId === id) next.myMemberId = null;
    setState(next);
  }
  function moveMember(idx, delta) {
    if (!state.isAdmin) return;
    const next = [...state.members];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setState({ ...state, members: next });
  }
  function setMe(id) {
    const next = id === state.myMemberId ? null : id;
    // Tier 2: Identität serverseitig beanspruchen (verhindert Impersonation).
    if (next && onClaimMember) {
      onClaimMember(next).then((res) => {
        if (res?.error) {
          alert(
            res.error === "member already claimed"
              ? "Dieses Mitglied wurde bereits von einem anderen Konto übernommen."
              : "Konnte Mitglied nicht zuordnen: " + res.error
          );
          return;
        }
        setState({ ...state, myMemberId: next });
      });
      return;
    }
    setState({ ...state, myMemberId: next });
  }
  function makeAdmin(id) {
    if (!state.isAdmin) return;
    setState({ ...state, adminMemberId: id });
  }
  function updateKm(km) {
    if (!state.isAdmin) return;
    setState({ ...state, kmPerTrip: km });
  }

  async function requestNotifications() {
    if (typeof Notification === "undefined") {
      alert("Dein Browser unterstützt keine Benachrichtigungen.");
      return;
    }
    const p = await Notification.requestPermission();
    setNotifPermission(p);
    if (p === "granted") {
      setState({ ...state, notificationsEnabled: true });
      new Notification("Fahrgemeinschaft 🚗", {
        body: "Erinnerungen sind aktiviert. Du wirst benachrichtigt, wenn du fährst.",
      });
    }
  }
  function disableNotifications() {
    setState({ ...state, notificationsEnabled: false });
  }
  function testNotification() {
    if (Notification.permission !== "granted") return;
    const me = state.members.find((m) => m.id === state.myMemberId);
    new Notification("🚗 Du fährst morgen!", {
      body: `${me?.name || "Du"}, vergiss nicht: morgen fährst du die Fahrgemeinschaft.`,
      tag: "fg-test",
    });
  }

  // ICS Export — Wochenfahrer für die nächsten 8 Wochen
  function exportICS() {
    const events = [];
    const start = startOfWeek(today);
    for (let w = 0; w < 8; w++) {
      for (let i = 0; i < 5; i++) {
        const d = addDays(start, w * 7 + i);
        if (!isCommuteDay(d)) continue;
        const dr = computeDayDriver(state, d);
        if (!dr || dr.solo) continue;
        const m = state.members.find((mm) => mm.id === dr.id);
        if (!m) continue;
        events.push({ date: d, member: m, isSubstitute: dr.isSubstitute });
      }
      // Feiertage als ganztags-Events
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, w * 7 + i);
        const h = holidayFor(d);
        if (h) events.push({ date: d, holiday: h });
      }
    }

    const pad = (n) => String(n).padStart(2, "0");
    const fmtICS = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const now = new Date();
    const stamp = `${fmtICS(now)}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}Z`;

    let ics = "BEGIN:VCALENDAR\r\n";
    ics += "VERSION:2.0\r\n";
    ics += "PRODID:-//Fahrgemeinschaft//DE\r\n";
    ics += "CALSCALE:GREGORIAN\r\n";
    ics += "METHOD:PUBLISH\r\n";
    ics += "X-WR-CALNAME:Fahrgemeinschaft\r\n";
    ics += "X-WR-TIMEZONE:Europe/Berlin\r\n";
    events.forEach((ev, idx) => {
      const dStr = fmtICS(ev.date);
      const dStrEnd = fmtICS(addDays(ev.date, 1));
      ics += "BEGIN:VEVENT\r\n";
      ics += `UID:fg-${dStr}-${idx}@fahrgemeinschaft.local\r\n`;
      ics += `DTSTAMP:${stamp}\r\n`;
      ics += `DTSTART;VALUE=DATE:${dStr}\r\n`;
      ics += `DTEND;VALUE=DATE:${dStrEnd}\r\n`;
      if (ev.holiday) {
        ics += `SUMMARY:🎉 ${ev.holiday}\r\n`;
        ics += `DESCRIPTION:Feiertag in Sachsen — keine Fahrgemeinschaft\r\n`;
      } else {
        const sub = ev.isSubstitute ? " (Vertretung)" : "";
        ics += `SUMMARY:🚗 ${ev.member.name} fährt${sub}\r\n`;
        ics += `DESCRIPTION:${ev.member.name} ist heute Fahrer\\nFahrgemeinschaft\r\n`;
      }
      ics += "TRANSP:TRANSPARENT\r\n";
      // Erinnerung am Vorabend um 19:00 (12 Stunden vorher)
      if (!ev.holiday && state.myMemberId === ev.member.id) {
        ics += "BEGIN:VALARM\r\n";
        ics += "ACTION:DISPLAY\r\n";
        ics += "DESCRIPTION:Du fährst morgen die Fahrgemeinschaft!\r\n";
        ics += "TRIGGER:-PT13H\r\n";
        ics += "END:VALARM\r\n";
      }
      ics += "END:VEVENT\r\n";
    });
    ics += "END:VCALENDAR\r\n";

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fahrgemeinschaft.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fahrgemeinschaft-${ymd(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetAll() {
    if (!state.isAdmin) return;
    setState({
      ...state,
      members: [],
      trips: {},
      weeklyAssignments: {},
      kmPerTrip: 30,
    });
    setShowResetConfirm(false);
  }
  function copyGroupCode() {
    if (state.groupCode && navigator.clipboard) {
      navigator.clipboard.writeText(state.groupCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1800);
    }
  }

  return (
    <div style={{ padding: "20px 18px 100px", maxWidth: 720, margin: "0 auto" }}>
      <SectionLabel style={{ marginBottom: 4 }}>Konfiguration</SectionLabel>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontStyle: "italic", color: C.text, marginBottom: 24 }}>Einstellungen</div>

      {/* Rolle */}
      <Card style={{
        padding: 14, marginBottom: 16,
        border: `1px solid ${state.isAdmin ? C.amberDim : C.border}`,
        background: state.isAdmin ? `${C.amber}0c` : C.surface,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: state.isAdmin ? `${C.amber}22` : C.surface2,
            border: `1px solid ${state.isAdmin ? C.amber : C.border}`,
          }}>
            {state.isAdmin ? <Sparkles size={16} color={C.amber} /> : <Users size={16} color={C.textDim} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>
              {state.isAdmin ? "Du bist Admin" : "Du bist Mitglied"}
            </div>
            <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.4 }}>
              {state.isAdmin
                ? "Du verwaltest Mitglieder, Rotation und alle Einträge."
                : "Du kannst nur deine eigenen Einträge (Urlaub, Krankheit, mitgefahren) ändern."}
            </div>
          </div>
        </div>
      </Card>

      {/* Konto (nur Tier 2) */}
      {authInfo && (
        <>
          <SectionLabel>Konto</SectionLabel>
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.textDim }}>Angemeldet als</div>
                <div style={{ fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {authInfo.email || "—"}
                </div>
              </div>
              <Btn onClick={authInfo.onSignOut} style={{ flexShrink: 0 }}>Abmelden</Btn>
            </div>
          </Card>
        </>
      )}

      {/* Gruppe */}
      <SectionLabel>Eure Fahrgemeinschaft</SectionLabel>
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>Gruppen-Code (an Mitglieder weitergeben)</div>
        <button onClick={copyGroupCode}
          style={{
            background: `linear-gradient(135deg, ${C.amber}22, ${C.amber}11)`,
            border: `1px solid ${C.amberDim}`, borderRadius: 12,
            padding: "14px 16px", width: "100%", cursor: "pointer", marginBottom: 12,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            transition: "transform 150ms ease",
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.01)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          <span style={{
            fontFamily: FONT_MONO, fontSize: 24, color: C.amber,
            fontWeight: 700, letterSpacing: "0.2em",
          }}>{state.groupCode}</span>
          <span style={{
            fontSize: 11, fontFamily: FONT_MONO, color: codeCopied ? C.green : C.textDim,
            letterSpacing: "0.1em",
          }}>{codeCopied ? "✓ KOPIERT" : "TAP"}</span>
        </button>
        <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5, marginBottom: 12 }}>
          Wenn ein neues Mitglied beitritt, gibt es diesen Code in seiner App ein und sieht
          sofort denselben Plan. Änderungen werden zwischen allen Geräten synchronisiert.
        </div>
        {!showLeaveConfirm ? (
          <Btn variant="ghost" onClick={() => setShowLeaveConfirm(true)} style={{ width: "100%", justifyContent: "center", fontSize: 13 }}>
            Aus dieser Gruppe austreten
          </Btn>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: C.text, marginBottom: 10, padding: "8px 4px", lineHeight: 1.4 }}>
              Du wirst aus der Gruppe ausgetreten. Die Daten der Gruppe bleiben für die anderen
              Mitglieder erhalten. Du kannst mit dem Code später wieder beitreten.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="danger" onClick={onLeaveGroup} style={{ flex: 1, justifyContent: "center" }}>Austreten</Btn>
              <Btn onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, justifyContent: "center" }}>Abbrechen</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* Mitglieder */}
      <SectionLabel>Mitglieder ({state.members.length}) · Reihenfolge = Rotation</SectionLabel>
      <Card style={{ padding: 4, marginBottom: 16 }}>
        {state.members.map((m, i) => {
          const isMemberAdmin = m.id === state.adminMemberId;
          return (
          <div key={m.id} style={{
            padding: "10px 12px",
            borderBottom: i < state.members.length - 1 ? `1px solid ${C.borderSoft}` : "none",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 11, color: C.textFaint,
              width: 16, textAlign: "center",
            }}>{i + 1}</span>
            <Avatar member={m} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.text, fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                {isMemberAdmin && (
                  <span style={{
                    fontSize: 8, fontFamily: FONT_MONO, color: C.amber, flexShrink: 0,
                    border: `1px solid ${C.amberDim}`, background: `${C.amber}11`,
                    padding: "2px 5px", borderRadius: 4, letterSpacing: "0.1em",
                  }}>ADMIN</span>
                )}
              </div>
            </div>
            {state.isAdmin && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <button onClick={() => moveMember(i, -1)} disabled={i === 0}
                  style={{
                    background: "transparent", border: "none",
                    color: i === 0 ? C.textFaint : C.textDim,
                    cursor: i === 0 ? "default" : "pointer", padding: "2px 4px",
                    display: "flex", alignItems: "center",
                  }}><ChevronUp size={14} /></button>
                <button onClick={() => moveMember(i, 1)} disabled={i === state.members.length - 1}
                  style={{
                    background: "transparent", border: "none",
                    color: i === state.members.length - 1 ? C.textFaint : C.textDim,
                    cursor: i === state.members.length - 1 ? "default" : "pointer", padding: "2px 4px",
                    display: "flex", alignItems: "center",
                  }}><ChevronDown size={14} /></button>
              </div>
            )}
            {state.isAdmin && !isMemberAdmin && (
              <button onClick={() => makeAdmin(m.id)} title="Zum Admin machen"
                style={{
                  background: "transparent", border: `1px solid ${C.border}`,
                  color: C.textDim, borderRadius: 8, padding: "4px 8px", cursor: "pointer",
                  display: "flex", alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.amber)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.textDim)}
              ><Sparkles size={14} /></button>
            )}
            <button onClick={() => setMe(m.id)}
              style={{
                background: state.myMemberId === m.id ? `${C.amber}22` : "transparent",
                border: `1px solid ${state.myMemberId === m.id ? C.amber : C.border}`,
                color: state.myMemberId === m.id ? C.amber : C.textDim,
                borderRadius: 8, padding: "4px 10px", fontSize: 11, fontFamily: FONT_MONO,
                fontWeight: 600, cursor: "pointer", letterSpacing: "0.1em", flexShrink: 0,
              }}
            >{state.myMemberId === m.id ? "ICH ✓" : "ICH"}</button>
            {state.isAdmin && !isMemberAdmin && (
              <button onClick={() => removeMember(m.id)}
                style={{ background: "transparent", border: "none", color: C.textDim, cursor: "pointer", padding: 6, borderRadius: 6 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.textDim)}
              ><Trash2 size={16} /></button>
            )}
          </div>
          );
        })}
        {(state.isAdmin || state.members.length === 0) ? (
          <div style={{ padding: "10px 12px", display: "flex", gap: 8 }}>
            <input type="text" placeholder="Name hinzufügen…" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMember()}
              style={{
                flex: 1, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "10px 12px", color: C.text, fontFamily: FONT_BODY, fontSize: 14, outline: "none",
              }}
            />
            <Btn variant="primary" onClick={addMember} disabled={!newName.trim()}><UserPlus size={16} /></Btn>
          </div>
        ) : (
          <div style={{ padding: "10px 12px", fontSize: 12, color: C.textFaint, fontStyle: "italic" }}>
            Nur der·die Admin kann Mitglieder verwalten.
          </div>
        )}
      </Card>

      {/* Wegstrecke */}
      <SectionLabel>Wegstrecke</SectionLabel>
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: C.textDim, display: "block", marginBottom: 8 }}>Kilometer pro Fahrt (Hin & zurück)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="number" min={1} value={state.kmPerTrip || 30} disabled={!state.isAdmin}
            onChange={(e) => updateKm(Number(e.target.value) || 0)}
            style={{
              width: 100, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "10px 12px", color: state.isAdmin ? C.text : C.textFaint,
              fontFamily: FONT_MONO, fontSize: 16, outline: "none",
              opacity: state.isAdmin ? 1 : 0.6,
            }}
          />
          <span style={{ fontFamily: FONT_MONO, color: C.textDim, fontSize: 13 }}>km</span>
        </div>
      </Card>

      {/* Kalender-Sync */}
      <SectionLabel>Kalender-Synchronisation</SectionLabel>
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5, marginBottom: 12 }}>
          Lade die nächsten 8 Wochen als Kalender-Datei herunter. Auf iPhone und Android öffnen → "Zum Kalender hinzufügen".
          Wenn du als <span style={{ color: C.amber, fontWeight: 600 }}>Ich</span> markiert bist, bekommst du am Vorabend eine Erinnerung.
        </div>
        <Btn variant="primary" onClick={exportICS} style={{ width: "100%", justifyContent: "center" }}
          disabled={state.members.length === 0}
        ><CalendarDays size={14} />Als Kalender exportieren (.ics)</Btn>
      </Card>

      {/* Benachrichtigungen */}
      <SectionLabel>Benachrichtigungen (Browser-Demo)</SectionLabel>
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5, marginBottom: 12 }}>
          Browser-Benachrichtigungen funktionieren während die App geöffnet ist. Für echte Push-Nachrichten auf
          iOS/Android (auch wenn die App geschlossen ist), wird die App mit <span style={{ color: C.amber, fontWeight: 600, fontFamily: FONT_MONO }}>Capacitor</span> verpackt
          und ein Backend mit APNs (Apple) und FCM (Google) angebunden.
        </div>
        {notifPermission === "granted" ? (
          <>
            <Btn variant="primary" onClick={testNotification} style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}
              disabled={!state.myMemberId}
            ><Bell size={14} />Test-Benachrichtigung senden</Btn>
            <Btn variant="ghost" onClick={disableNotifications} style={{ width: "100%", justifyContent: "center" }}>
              <BellOff size={14} />Deaktivieren
            </Btn>
            {!state.myMemberId && (
              <div style={{ fontSize: 12, color: C.amber, marginTop: 10, textAlign: "center" }}>
                Markiere zuerst dich selbst als "Ich" oben in der Mitgliederliste.
              </div>
            )}
          </>
        ) : notifPermission === "denied" ? (
          <div style={{ fontSize: 13, color: C.red, padding: "8px 0" }}>
            Benachrichtigungen wurden im Browser blockiert. Bitte in den Browser-Einstellungen aktivieren.
          </div>
        ) : notifPermission === "unsupported" ? (
          <div style={{ fontSize: 13, color: C.textDim, padding: "8px 0" }}>
            Dein Browser unterstützt keine Benachrichtigungen.
          </div>
        ) : (
          <Btn variant="primary" onClick={requestNotifications} style={{ width: "100%", justifyContent: "center" }}>
            <Bell size={14} />Benachrichtigungen aktivieren
          </Btn>
        )}
      </Card>

      {/* Daten */}
      <SectionLabel>Daten</SectionLabel>
      <Card style={{ padding: 12, marginBottom: 16 }}>
        <Btn onClick={exportJSON} style={{ width: "100%", marginBottom: 8, justifyContent: "center" }}>
          <Download size={14} />Daten als JSON exportieren
        </Btn>
        {!state.isAdmin ? null : !showResetConfirm ? (
          <Btn variant="danger" onClick={() => setShowResetConfirm(true)} style={{ width: "100%", justifyContent: "center" }}>
            <RotateCcw size={14} />Alle Daten zurücksetzen
          </Btn>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: C.text, marginBottom: 10, padding: "8px 4px" }}>
              Sicher? Alle Mitglieder und Fahrten werden gelöscht.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="danger" onClick={resetAll} style={{ flex: 1, justifyContent: "center" }}>Ja, löschen</Btn>
              <Btn onClick={() => setShowResetConfirm(false)} style={{ flex: 1, justifyContent: "center" }}>Abbrechen</Btn>
            </div>
          </div>
        )}
      </Card>

      <div style={{
        textAlign: "center", fontFamily: FONT_MONO, fontSize: 10,
        color: C.textFaint, letterSpacing: "0.1em", marginTop: 24,
      }}>Fahrgemeinschaft · Sachsen-Edition · v2</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SYNC INDICATOR
// ─────────────────────────────────────────────────────────────────────
function SyncIndicator({ status, lastSync }) {
  const colors = {
    syncing: C.amber,
    synced: C.green,
    error: C.red,
    idle: C.textFaint,
  };
  const labels = {
    syncing: "synchronisiere…",
    synced: lastSync ? `synchron · ${formatTimeAgo(lastSync)}` : "synchron",
    error: "offline",
    idle: "—",
  };
  const color = colors[status] || C.textFaint;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 9, color: C.textFaint, letterSpacing: "0.1em" }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: color,
        boxShadow: status === "synced" ? `0 0 6px ${color}` : "none",
        animation: status === "syncing" ? "pulse 1.2s infinite" : "none",
      }} />
      <span style={{ textTransform: "uppercase" }}>{labels[status]}</span>
    </div>
  );
}
function formatTimeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 5000) return "jetzt";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h`;
}

// ─────────────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────────────
function Onboarding({ onCreate, onJoin }) {
  const [mode, setMode] = useState("welcome"); // welcome, creating, joining, created
  const [createdCode, setCreatedCode] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setBusy(true);
    const code = await onCreate();
    setCreatedCode(code);
    setMode("created");
    setBusy(false);
  }
  async function handleJoin() {
    if (!joinCode.trim()) return;
    setBusy(true);
    setJoinError(null);
    const result = await onJoin(joinCode);
    setBusy(false);
    if (result.error) setJoinError(result.error);
  }
  function copyCode() {
    if (createdCode && navigator.clipboard) {
      navigator.clipboard.writeText(createdCode);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: FONT_BODY, padding: "40px 20px 60px",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: `linear-gradient(135deg, ${C.amber}, #d97706)`,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 24px ${C.amber}44`, marginBottom: 16,
          }}>
            <Car size={28} color="#0b0b0d" strokeWidth={2.5} />
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontStyle: "italic", color: C.text, lineHeight: 1.1 }}>
            Fahrgemeinschaft
          </div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.25em",
            color: C.textFaint, textTransform: "uppercase", marginTop: 8,
          }}>Pendler-Cockpit · Sachsen</div>
        </div>

        {mode === "welcome" && (
          <>
            <Card style={{ padding: 24, marginBottom: 12 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontStyle: "italic", color: C.text, marginBottom: 6 }}>
                Neue Gruppe
              </div>
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5, marginBottom: 16 }}>
                Erstelle eine neue Fahrgemeinschaft und teile den Code mit deinen Pendel-Kollegen.
                Alle sehen automatisch denselben Plan.
              </div>
              <Btn variant="primary" onClick={handleCreate} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
                <Sparkles size={16} />Neue Fahrgemeinschaft erstellen
              </Btn>
            </Card>
            <Card style={{ padding: 24 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontStyle: "italic", color: C.text, marginBottom: 6 }}>
                Beitreten
              </div>
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5, marginBottom: 16 }}>
                Du hast einen Code von einer bestehenden Gruppe erhalten? Trag ihn hier ein.
              </div>
              <Btn variant="soft" onClick={() => setMode("joining")} style={{ width: "100%", justifyContent: "center" }}>
                <Users size={16} />Bestehender Gruppe beitreten
              </Btn>
            </Card>
          </>
        )}

        {mode === "joining" && (
          <Card style={{ padding: 24 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontStyle: "italic", color: C.text, marginBottom: 12 }}>
              Code eingeben
            </div>
            <input type="text" placeholder="z. B. K7XQ4M" value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              autoFocus
              style={{
                width: "100%", background: C.bg2, border: `1px solid ${joinError ? C.red : C.border}`,
                borderRadius: 10, padding: "16px 18px", color: C.text,
                fontFamily: FONT_MONO, fontSize: 22, letterSpacing: "0.15em",
                fontWeight: 600, outline: "none", textAlign: "center", marginBottom: 8,
              }}
            />
            {joinError && (
              <div style={{ fontSize: 12, color: C.red, marginBottom: 12, textAlign: "center" }}>{joinError}</div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn variant="default" onClick={() => { setMode("welcome"); setJoinCode(""); setJoinError(null); }} style={{ flex: 1, justifyContent: "center" }}>
                Zurück
              </Btn>
              <Btn variant="primary" onClick={handleJoin} disabled={busy || !joinCode.trim()} style={{ flex: 2, justifyContent: "center" }}>
                <ArrowRight size={16} />Beitreten
              </Btn>
            </div>
          </Card>
        )}

        {mode === "created" && createdCode && (
          <Card style={{ padding: 28, textAlign: "center" }}>
            <Sparkles size={32} color={C.amber} style={{ margin: "0 auto 12px" }} />
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontStyle: "italic", color: C.text, marginBottom: 8 }}>
              Gruppe erstellt
            </div>
            <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5, marginBottom: 20 }}>
              Teile diesen Code mit deinen Pendel-Kollegen, damit sie beitreten können.
            </div>
            <button onClick={copyCode}
              style={{
                background: `linear-gradient(135deg, ${C.amber}22, ${C.amber}11)`,
                border: `1px solid ${C.amberDim}`, borderRadius: 14,
                padding: "20px 16px", width: "100%", cursor: "pointer", marginBottom: 20,
                transition: "transform 150ms ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <div style={{
                fontFamily: FONT_MONO, fontSize: 36, color: C.amber,
                fontWeight: 700, letterSpacing: "0.2em", lineHeight: 1, marginBottom: 6,
              }}>{createdCode}</div>
              <div style={{ fontSize: 11, color: C.textDim, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>
                Tap zum Kopieren
              </div>
            </button>
            <Btn variant="primary" onClick={() => window.location.reload()} style={{ width: "100%", justifyContent: "center" }}>
              <ArrowRight size={16} />Loslegen
            </Btn>
          </Card>
        )}

        <div style={{
          marginTop: 32, padding: "16px 18px",
          background: C.bg2, borderRadius: 10, border: `1px solid ${C.borderSoft}`,
        }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.2em",
            color: C.textFaint, textTransform: "uppercase", marginBottom: 8,
          }}>Wie funktioniert das?</div>
          <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>
            Eine Person erstellt die Gruppe und gibt den Code an die anderen Mitglieder weiter
            (per WhatsApp, SMS, …). Alle Geräte synchronisieren automatisch alle paar Sekunden:
            wer fährt, wer ist krank, wer im Urlaub.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit() {
    if (!email.trim() || busy) return;
    setBusy(true); setErr(null);
    const { error } = await window.storage.auth.signInWithEmail(email.trim());
    setBusy(false);
    if (error) setErr(error); else setSent(true);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body, html { margin: 0; padding: 0; background: ${C.bg}; }
        input:focus { border-color: ${C.amber} !important; }
      `}</style>
      <div style={{
        minHeight: "100vh", background: C.bg, color: C.text,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 24, fontFamily: FONT_BODY,
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🚗</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 40, fontStyle: "italic", lineHeight: 1.05, marginBottom: 8 }}>
            Fahrgemeinschaft
          </div>
          <div style={{ fontSize: 14, color: C.textDim, marginBottom: 28, lineHeight: 1.5 }}>
            Melde dich mit deiner E-Mail an. Du bekommst einen Anmelde-Link zugeschickt – kein Passwort nötig.
          </div>

          {sent ? (
            <Card style={{ padding: 18 }}>
              <div style={{ fontSize: 15, color: C.text, marginBottom: 6, fontWeight: 600 }}>Link verschickt ✓</div>
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>
                Öffne die E-Mail an <b style={{ color: C.text }}>{email}</b> und tippe auf den Link.
                Danach landest du automatisch hier.
              </div>
            </Card>
          ) : (
            <>
              <input
                type="email" inputMode="email" autoComplete="email"
                placeholder="dein@email.de" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                style={{
                  width: "100%", background: C.bg2, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: "13px 14px", color: C.text,
                  fontFamily: FONT_BODY, fontSize: 15, outline: "none", marginBottom: 10,
                }}
              />
              {err && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{err}</div>}
              <Btn variant="primary" onClick={submit} disabled={!email.trim() || busy}
                style={{ width: "100%", justifyContent: "center", padding: "13px" }}>
                {busy ? "senden…" : "Anmelde-Link senden"}
              </Btn>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [localState, _setLocalState] = useState(defaultLocal);
  const [groupState, _setGroupState] = useState(defaultGroup);
  const [tab, setTab] = useState("today");
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [lastSync, setLastSync] = useState(null);
  // TIER-2-Auth-Status. requireLogin=false → Tier 1, alles wie bisher.
  const requireLogin = Boolean(window.storage?.auth?.requireLogin);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!requireLogin);
  const today = new Date();

  // Merged state — was die Views erwarten
  const [serverIsAdmin, setServerIsAdmin] = useState(false);
  const state = useMemo(() => ({
    ...groupState,
    myMemberId: localState.myMemberId,
    notificationsEnabled: localState.notificationsEnabled,
    groupCode: localState.groupCode,
    adminMemberId: effectiveAdminId(groupState),
    // Tier 1: lokale Heuristik (erstes Mitglied / adminMemberId).
    // Tier 2: der Server entscheidet (Eigentümer der Gruppe).
    isAdmin: requireLogin
      ? serverIsAdmin
      : isAdminUser(groupState, localState.myMemberId),
  }), [localState, groupState, requireLogin, serverIsAdmin]);

  // Tier 2: Admin-Status beim Server bestätigen lassen.
  useEffect(() => {
    if (!requireLogin || !window.storage?.auth || !localState.groupCode || !session) {
      if (!requireLogin) return;
      setServerIsAdmin(false);
      return;
    }
    let cancelled = false;
    window.storage.auth.isGroupAdmin(localState.groupCode).then((v) => {
      if (!cancelled) setServerIsAdmin(!!v);
    });
    return () => { cancelled = true; };
  }, [requireLogin, localState.groupCode, session, groupState.updatedAt]);

  // Erst-Laden + Migration
  useEffect(() => {
    (async () => {
      let local = await loadLocal();
      if (!local) {
        const legacy = await loadLegacy();
        if (legacy && legacy.members?.length > 0) {
          // Migrate v2 → v3: bestehende Daten in eine neue Gruppe überführen
          const code = generateGroupCode();
          const grp = {
            ...defaultGroup,
            members: legacy.members,
            trips: legacy.trips || {},
            weeklyAssignments: legacy.weeklyAssignments || {},
            kmPerTrip: legacy.kmPerTrip || 30,
            updatedAt: Date.now(),
            createdAt: legacy.createdAt || new Date().toISOString(),
          };
          await saveGroup(code, grp);
          local = {
            ...defaultLocal,
            groupCode: code,
            myMemberId: legacy.myMemberId || null,
            notificationsEnabled: legacy.notificationsEnabled || false,
          };
          await saveLocal(local);
          _setGroupState(grp);
          _setLocalState(local);
        } else {
          local = defaultLocal;
          _setLocalState(local);
        }
      } else {
        _setLocalState(local);
        if (local.groupCode) {
          const remote = await loadGroup(local.groupCode);
          if (remote) {
            // Backfill defaults
            if (!remote.kmPerTrip) remote.kmPerTrip = 30;
            if (!remote.weeklyAssignments) remote.weeklyAssignments = {};
            if (!remote.swapRequests) remote.swapRequests = [];
            _setGroupState(remote);
          }
        }
      }
      setLoaded(true);
      setSyncStatus("synced");
      setLastSync(Date.now());
    })();
  }, []);

  // TIER-2: Auth-Session beobachten
  useEffect(() => {
    if (!requireLogin || !window.storage?.auth) return;
    let unsub = () => {};
    (async () => {
      const s = await window.storage.auth.getSession();
      setSession(s);
      setAuthReady(true);
      unsub = window.storage.auth.onChange((sess) => setSession(sess));
    })();
    return () => unsub();
  }, [requireLogin]);

  // Polling für Synchronisation (alle 6s)
  useEffect(() => {
    if (!loaded || !localState.groupCode) return;
    let cancelled = false;
    const sync = async () => {
      if (cancelled) return;
      try {
        const remote = await loadGroup(localState.groupCode);
        if (cancelled) return;
        if (remote && (remote.updatedAt || 0) > (groupState.updatedAt || 0)) {
          _setGroupState(remote);
        }
        setSyncStatus("synced");
        setLastSync(Date.now());
      } catch (e) {
        if (!cancelled) setSyncStatus("error");
      }
    };
    const interval = setInterval(sync, 6000);
    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loaded, localState.groupCode, groupState.updatedAt]);

  // Nudge beim Öffnen: wenn du diese Woche dran bist, eine freundliche
  // Erinnerung — höchstens einmal pro Tag (per localStorage entprellt).
  useEffect(() => {
    if (!loaded || !state.notificationsEnabled) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const nudge = buildDriveNudge(state, today);
    if (!nudge) return;
    const key = `fg_nudge_${ymd(today)}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch { /* localStorage nicht verfügbar → trotzdem zeigen */ }
    try {
      new Notification(nudge.title, { body: nudge.body, tag: "fg-drive-nudge" });
    } catch { /* Notification fehlgeschlagen → still ignorieren */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, state.notificationsEnabled, state.myMemberId, groupState.updatedAt]);

  // setState — routet Änderungen an local oder shared
  const setState = useCallback((next) => {
    const localKeys = ["myMemberId", "notificationsEnabled", "groupCode"];
    const groupKeys = ["members", "trips", "weeklyAssignments", "swapRequests", "kmPerTrip", "adminMemberId"];

    let localChanged = false;
    let groupChanged = false;
    const newLocal = { ...localState };
    let newGroup = { ...groupState };

    localKeys.forEach((k) => {
      if (next[k] !== localState[k]) {
        newLocal[k] = next[k];
        localChanged = true;
      }
    });
    groupKeys.forEach((k) => {
      if (JSON.stringify(next[k]) !== JSON.stringify(groupState[k])) {
        newGroup[k] = next[k];
        groupChanged = true;
      }
    });

    // Berechtigungen erzwingen: wer nicht Admin ist, darf nur die eigenen
    // Daten ändern. Alles andere wird auf den vorherigen Stand zurückgesetzt.
    if (groupChanged) {
      newGroup = enforcePermissions(groupState, newGroup, newLocal.myMemberId);
      // Falls die Bereinigung alles zurückgedreht hat: kein echter Change.
      groupChanged = groupKeys.some(
        (k) => JSON.stringify(newGroup[k]) !== JSON.stringify(groupState[k])
      );
    }

    if (localChanged) {
      _setLocalState(newLocal);
      saveLocal(newLocal);
    }
    if (groupChanged) {
      newGroup.updatedAt = Date.now();
      newGroup.lastEditor = newLocal.myMemberId;
      _setGroupState(newGroup);
      if (newLocal.groupCode) {
        setSyncStatus("syncing");
        saveGroup(newLocal.groupCode, newGroup)
          .then(() => { setSyncStatus("synced"); setLastSync(Date.now()); })
          .catch(() => { setSyncStatus("error"); });
      }
    }
  }, [localState, groupState]);

  // Gruppe erstellen / beitreten / verlassen
  const createNewGroup = useCallback(async () => {
    const code = generateGroupCode();
    const grp = { ...defaultGroup, updatedAt: Date.now(), createdAt: new Date().toISOString() };
    if (requireLogin && window.storage?.auth) {
      // Tier 2: Gruppe per RPC anlegen (Ersteller wird Eigentümer/Admin).
      await window.storage.auth.createGroup(code, grp);
    } else {
      await saveGroup(code, grp);
    }
    const newLocal = { ...localState, groupCode: code };
    _setGroupState(grp);
    _setLocalState(newLocal);
    await saveLocal(newLocal);
    return code;
  }, [localState, requireLogin]);

  const joinGroup = useCallback(async (rawCode) => {
    const code = normalizeCode(rawCode);
    if (code.length < 4) return { error: "Code zu kurz" };
    const remote = await loadGroup(code);
    if (!remote) return { error: "Gruppe mit diesem Code nicht gefunden" };
    if (!remote.kmPerTrip) remote.kmPerTrip = 30;
    if (!remote.weeklyAssignments) remote.weeklyAssignments = {};
    if (!remote.swapRequests) remote.swapRequests = [];
    const newLocal = { ...localState, groupCode: code, myMemberId: null };
    _setGroupState(remote);
    _setLocalState(newLocal);
    await saveLocal(newLocal);
    return { ok: true };
  }, [localState]);

  const leaveGroup = useCallback(async () => {
    const newLocal = { ...defaultLocal };
    _setLocalState(newLocal);
    _setGroupState(defaultGroup);
    await saveLocal(newLocal);
    setTab("today");
  }, []);

  const tabs = [
    { id: "today", label: "Heute", icon: Car },
    { id: "week", label: "Woche", icon: Calendar },
    { id: "plan", label: "Planung", icon: CalendarPlus },
    { id: "stats", label: "Statistik", icon: BarChart3 },
    { id: "settings", label: "Mehr", icon: SettingsIcon },
  ];

  // TIER-2: Login-Gate. Ohne gültige Session geht es nicht weiter.
  if (requireLogin) {
    if (!authReady) {
      return (
        <div style={{
          minHeight: "100vh", background: C.bg, color: C.textDim,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase",
        }}>laden…</div>
      );
    }
    if (!session) return <LoginScreen />;
  }

  // Loading
  if (!loaded) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, color: C.textDim,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.2em",
        textTransform: "uppercase",
      }}>laden…</div>
    );
  }

  // Onboarding (keine Gruppe)
  if (!localState.groupCode) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
          * { box-sizing: border-box; }
          body, html { margin: 0; padding: 0; background: ${C.bg}; }
          input:focus { border-color: ${C.amber} !important; }
        `}</style>
        <Onboarding onCreate={createNewGroup} onJoin={joinGroup} />
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FONT_BODY, position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body, html { margin: 0; padding: 0; background: ${C.bg}; }
        button:focus-visible { outline: 2px solid ${C.amber}; outline-offset: 2px; }
        input:focus, select:focus { border-color: ${C.amber} !important; }
        @keyframes fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideup { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .fadein { animation: fadein 280ms ease-out; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.6); cursor: pointer; }
      `}</style>

      <header style={{
        padding: "16px 18px 8px", borderBottom: `1px solid ${C.borderSoft}`,
        background: `linear-gradient(180deg, ${C.bg2}, ${C.bg})`,
        position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(10px)",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.amber}, #d97706)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 16px ${C.amber}33`,
          }}>
            <Car size={18} color="#0b0b0d" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontStyle: "italic", color: C.text, lineHeight: 1 }}>
              Fahrgemeinschaft
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.2em",
                color: C.textFaint, textTransform: "uppercase",
              }}>{localState.groupCode}</span>
              <span style={{ color: C.textFaint, fontSize: 8 }}>·</span>
              <SyncIndicator status={syncStatus} lastSync={lastSync} />
            </div>
          </div>
        </div>
      </header>

      <main key={tab} className="fadein" style={{ minHeight: "calc(100vh - 140px)" }}>
        {tab === "today" ? (
          <TodayView state={state} setState={setState} today={today} onTabChange={setTab} />
        ) : tab === "week" ? (
          <WeekView state={state} setState={setState} today={today} />
        ) : tab === "plan" ? (
          <PlanningView state={state} setState={setState} today={today} />
        ) : tab === "stats" ? (
          <StatsView state={state} />
        ) : (
          <SettingsView state={state} setState={setState} today={today} onLeaveGroup={leaveGroup}
            onClaimMember={requireLogin && window.storage?.auth
              ? (mid) => window.storage.auth.claimMember(localState.groupCode, mid)
              : null}
            authInfo={requireLogin ? { email: session?.user?.email, onSignOut: () => window.storage.auth.signOut() } : null}
          />
        )}
      </main>

      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: `${C.bg2}f5`, backdropFilter: "blur(20px)",
        borderTop: `1px solid ${C.border}`, zIndex: 20,
      }}>
        <div style={{
          maxWidth: 720, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
          padding: "8px 4px 12px",
        }}>
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)}
                style={{
                  background: "transparent", border: "none", padding: "10px 4px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  color: active ? C.amber : C.textDim, cursor: "pointer",
                  fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600,
                  transition: "color 150ms ease", position: "relative",
                }}
              >
                {active && (
                  <div style={{
                    position: "absolute", top: 0, width: 24, height: 2,
                    background: C.amber, borderRadius: 99, boxShadow: `0 0 8px ${C.amber}`,
                  }} />
                )}
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
