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
  kmPerTrip: 30,
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
  return s !== "sick" && s !== "vacation" && s !== "off";
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
    t.driverId = memberId;
    t.solo = true;
    t.attendance = { ...(t.attendance || {}) };
    t.attendance[memberId] = "drove";
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
                    {dayDriver.solo
                      ? "Hat gefahren · solo (nicht gewertet)"
                      : dayDriver.source === "logged"
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
                    {isPending ? (
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
                        <button onClick={() => setSolo(m.id)} title="Allein gefahren – zählt nicht für die faire Aufteilung" style={{
                          background: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                          borderRadius: 999, padding: "5px 10px",
                          fontSize: 11, fontFamily: FONT_BODY, fontWeight: 600, cursor: "pointer",
                        }}>Solo</button>
                        <button onClick={() => setPendingDriver(null)} style={{
                          background: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                          borderRadius: 999, padding: "5px 7px", cursor: "pointer",
                          display: "inline-flex", alignItems: "center",
                        }}><X size={11} /></button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <StatusPill active={isDriver} color={C.amber} label="Fahrer" icon={<Car size={11} />} onClick={() => handleFahrerTap(m.id)} />
                        <StatusPill active={status === "rode"} color={C.blue} label="Mit" icon={<Users size={11} />} onClick={() => setAttendance(m.id, "rode")} />
                        <StatusPill active={status === "sick"} color={C.red} label="Krank" icon={<Thermometer size={11} />} onClick={() => setAttendance(m.id, "sick")} />
                        <StatusPill active={status === "vacation"} color={C.green} label="Urlaub" icon={<Plane size={11} />} onClick={() => setAttendance(m.id, "vacation")} />
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>

            {(trip.driverId || Object.keys(trip.attendance || {}).length > 0) && (
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
    t.driverId = memberId;
    t.solo = true;
    t.attendance = { ...(t.attendance || {}) };
    t.attendance[memberId] = "drove";
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
                  ? (trip.solo
                      ? "Gefahren · Solo"
                      : state.weeklyAssignments?.[currentWeekKey] === trip.driverId
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
                      {trip.driverId ? (trip.solo ? "ist heute gefahren · solo" : "fährt heute")
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
                        : isDriver ? (trip.solo ? "🚗 gefahren · solo (nicht gewertet)" : "🚗 fährt")
                        : status === "rode" ? "🚙 mitgefahren"
                        : status === "sick" ? "🤒 krank"
                        : status === "vacation" ? "✈️ Urlaub"
                        : status === "off" ? "— frei"
                        : "noch offen"}
                    </div>
                  </div>
                  {isPending ? (
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
                      <button onClick={() => setSoloToday(m.id)} title="Allein gefahren – zählt nicht für die faire Aufteilung" style={{
                        background: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                        borderRadius: 999, padding: "6px 12px",
                        fontSize: 12, fontFamily: FONT_BODY, fontWeight: 600, cursor: "pointer",
                      }}>Solo</button>
                      <button onClick={() => setPendingDriver(null)} style={{
                        background: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                        borderRadius: 999, padding: "6px 8px", cursor: "pointer",
                        display: "inline-flex", alignItems: "center",
                      }}><X size={12} /></button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <StatusPill active={isDriver} color={C.amber} label="Fahrer" icon={<Car size={13} />} onClick={() => handleFahrerTap(m.id)} />
                      <StatusPill active={status === "rode"} color={C.blue} label="Mit" icon={<Users size={13} />} onClick={() => setAttendance(m.id, "rode")} />
                      <StatusPill active={status === "sick"} color={C.red} label="Krank" icon={<Thermometer size={13} />} onClick={() => setAttendance(m.id, "sick")} />
                      <StatusPill active={status === "vacation"} color={C.green} label="Urlaub" icon={<Plane size={13} />} onClick={() => setAttendance(m.id, "vacation")} />
                    </div>
                  )}
                </div>
              );
            })}
          </Card>

          {(trip.driverId || Object.keys(trip.attendance || {}).length > 0) && (
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
// VIEW: WOCHE
// ─────────────────────────────────────────────────────────────────────
function WeekView({ state, setState, today }) {
  const [offset, setOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const weekStart = startOfWeek(addDays(today, offset * 7));
  const days = [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));
  const wk = getWeekDriver(state, weekStart);
  const weekDriverObj = wk ? state.members.find((m) => m.id === wk.id) : null;

  return (
    <div style={{ padding: "20px 18px 100px", maxWidth: 720, margin: "0 auto" }}>
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
        <Card style={{ padding: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar member={weekDriverObj} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 2 }}>
              Wochenfahrer · {wk.source === "manual" ? "manuell" : wk.source === "logged" ? "schon gefahren" : "Vorschlag"}
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontStyle: "italic", color: C.text }}>{weekDriverObj.name}</div>
          </div>
          <Car size={20} color={C.amber} />
        </Card>
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
                      <div style={{ color: C.text, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{driver.name}</span>
                        {dayDr.solo && (
                          <span style={{
                            fontSize: 9, fontFamily: FONT_MONO, color: C.textDim,
                            border: `1px solid ${C.border}`, padding: "1px 5px", borderRadius: 3,
                            letterSpacing: "0.1em", flexShrink: 0,
                          }}>SOLO</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: dayDr.isSubstitute && !dayDr.solo ? C.blue : C.textDim }}>
                        {dayDr.solo ? "ist gefahren · nicht gewertet"
                          : dayDr.source === "logged" ? "ist gefahren"
                          : dayDr.isSubstitute ? "Vertretung"
                          : "Vorschlag"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: C.textFaint, fontSize: 13, fontStyle: "italic" }}>
                    {isPast ? "nicht erfasst" : "offen"}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, fontSize: 11, color: C.textDim }}>
                {rodeCount > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Users size={11} />{rodeCount}</span>}
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// VIEW: PLANUNG
// ─────────────────────────────────────────────────────────────────────
function PlanningView({ state, setState, today }) {
  const [memberId, setMemberId] = useState(state.myMemberId || state.members[0]?.id || "");
  const [fromDate, setFromDate] = useState(ymd(today));
  const [toDate, setToDate] = useState(ymd(today));
  const [absenceType, setAbsenceType] = useState("vacation");
  const [selectedDay, setSelectedDay] = useState(null);

  // sync member when settings change
  useEffect(() => {
    if (!state.members.find((m) => m.id === memberId) && state.members[0]) {
      setMemberId(state.members[0].id);
    }
  }, [state.members]);

  function applyAbsence() {
    if (!memberId || !fromDate || !toDate) return;
    const next = { ...state, trips: { ...state.trips } };
    let d = parseYmd(fromDate);
    const end = parseYmd(toDate);
    while (d <= end) {
      const k = ymd(d);
      const t = { ...(next.trips[k] || { attendance: {} }) };
      t.attendance = { ...(t.attendance || {}) };
      t.attendance[memberId] = absenceType;
      next.trips[k] = t;
      d = addDays(d, 1);
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
        if (status === "sick" || status === "vacation") {
          result.push({ date, dateKey, memberId: mid, status });
        }
      });
    });
    result.sort((a, b) => a.date - b.date);
    // Gruppieren nach Mitglied + Status + zusammenhängende Tage
    const grouped = [];
    result.forEach((entry) => {
      const last = grouped[grouped.length - 1];
      if (
        last && last.memberId === entry.memberId && last.status === entry.status &&
        Math.abs(addDays(last.endDate, 1) - entry.date) < 86400000 / 2
      ) {
        last.endDate = entry.date;
        last.dateKeys.push(entry.dateKey);
      } else {
        grouped.push({
          memberId: entry.memberId, status: entry.status,
          startDate: entry.date, endDate: entry.date,
          dateKeys: [entry.dateKey],
        });
      }
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
          {/* Abwesenheit eintragen */}
          <SectionLabel>Urlaub oder Krankheit eintragen</SectionLabel>
          <Card style={{ padding: 16, marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: C.textDim, display: "block", marginBottom: 6 }}>Wer?</label>
            <select
              value={memberId} onChange={(e) => setMemberId(e.target.value)}
              style={{
                width: "100%", background: C.bg2, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "10px 12px", color: C.text,
                fontFamily: FONT_BODY, fontSize: 14, marginBottom: 14, outline: "none",
              }}
            >
              {state.members.map((m) => <option key={m.id} value={m.id} style={{ background: C.bg2 }}>{m.name}</option>)}
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: C.textDim, display: "block", marginBottom: 6 }}>Von</label>
                <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); if (e.target.value > toDate) setToDate(e.target.value); }}
                  style={{
                    width: "100%", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "10px 12px", color: C.text, fontFamily: FONT_MONO, fontSize: 14,
                    outline: "none", colorScheme: "dark",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textDim, display: "block", marginBottom: 6 }}>Bis</label>
                <input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)}
                  style={{
                    width: "100%", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "10px 12px", color: C.text, fontFamily: FONT_MONO, fontSize: 14,
                    outline: "none", colorScheme: "dark",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button onClick={() => setAbsenceType("vacation")}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10,
                  background: absenceType === "vacation" ? `${C.green}22` : "transparent",
                  border: `1px solid ${absenceType === "vacation" ? C.green : C.border}`,
                  color: absenceType === "vacation" ? C.green : C.textDim,
                  fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              ><Plane size={14} />Urlaub</button>
              <button onClick={() => setAbsenceType("sick")}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10,
                  background: absenceType === "sick" ? `${C.red}22` : "transparent",
                  border: `1px solid ${absenceType === "sick" ? C.red : C.border}`,
                  color: absenceType === "sick" ? C.red : C.textDim,
                  fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              ><Thermometer size={14} />Krank</button>
            </div>

            <Btn variant="primary" onClick={applyAbsence} style={{ width: "100%", justifyContent: "center" }}>
              <CalendarPlus size={14} />Abwesenheit eintragen
            </Btn>
          </Card>

          {/* Wochenübersicht */}
          <SectionLabel>Nächste Wochen · Tap zum Bearbeiten</SectionLabel>
          {weeks.map((wkStart) => {
            const wd = getWeekDriver(state, wkStart);
            const wDriverObj = wd ? state.members.find((m) => m.id === wd.id) : null;
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
                  return (
                    <div key={i} style={{
                      padding: "12px 12px",
                      borderBottom: i < upcomingAbsences.length - 1 ? `1px solid ${C.borderSoft}` : "none",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <Avatar member={m} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>
                          {m.name} · {g.status === "sick"
                            ? <span style={{ color: C.red }}>krank</span>
                            : <span style={{ color: C.green }}>Urlaub</span>}
                        </div>
                        <div style={{ fontSize: 12, color: C.textDim, fontFamily: FONT_MONO }}>
                          {sameDay ? formatDateShort(g.startDate)
                            : `${formatDateShort(g.startDate)} → ${formatDateShort(g.endDate)}`}
                          {" · "}{g.dateKeys.length} Tag{g.dateKeys.length > 1 ? "e" : ""}
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
        });
      }
    });
    return { counts, rode, sick, vacation, solo, soloTrips };
  }, [state]);

  const totalTrips = Object.values(stats.counts).reduce((a, b) => a + b, 0);
  const fairShare = state.members.length > 0 ? totalTrips / state.members.length : 0;
  const kmPer = state.kmPerTrip || 30;
  const totalKm = totalTrips * kmPer;
  const soloKm = stats.soloTrips * kmPer;
  // CO2: nur gemeinschaftliche Fahrten sparen etwas (jede:r Mitfahrende spart eine eigene Fahrt).
  // Solo-Fahrten transportieren niemanden zusätzlich → kein CO2-Vorteil.
  const co2Saved = totalKm * Math.max(0, state.members.length - 1) * 0.12;
  const max = Math.max(1, ...Object.values(stats.counts));
  const ranked = [...state.members].sort((a, b) => (stats.counts[a.id] || 0) - (stats.counts[b.id] || 0));

  return (
    <div style={{ padding: "20px 18px 100px", maxWidth: 720, margin: "0 auto" }}>
      <SectionLabel style={{ marginBottom: 4 }}>Cockpit</SectionLabel>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontStyle: "italic", color: C.text, marginBottom: 24 }}>Faire Aufteilung</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Fahrten gesamt" value={totalTrips} suffix="Tage" accent={C.amber} />
        <KpiCard label="Fairer Anteil" value={fairShare.toFixed(1)} suffix="je Person" accent={C.blue} />
        <KpiCard label="Gefahrene Kilometer" value={totalKm.toLocaleString("de-DE")} suffix="km" accent={C.text} />
        <KpiCard label="CO₂ eingespart" value={(co2Saved / 1000).toFixed(1)} suffix="kg" accent={C.green} />
        {stats.soloTrips > 0 && (
          <KpiCard label="Solo-Fahrten" value={stats.soloTrips} suffix={`Tage · ${soloKm.toLocaleString("de-DE")} km`} accent={C.textDim} />
        )}
      </div>

      {state.members.length === 0 ? (
        <Card style={{ padding: 24, textAlign: "center", color: C.textDim }}>Noch keine Mitglieder.</Card>
      ) : (
        <Card style={{ padding: 18 }}>
          <SectionLabel>Verteilung · sortiert nach Reihe</SectionLabel>
          {ranked.map((m, i) => {
            const c = stats.counts[m.id] || 0;
            const pct = (c / max) * 100;
            const deviation = c - fairShare;
            const isNext = i === 0 && state.members.length > 1;
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
        </Card>
      )}
    </div>
  );
}
function KpiCard({ label, value, suffix, accent }) {
  return (
    <Card style={{ padding: 14 }}>
      <SectionLabel style={{ fontSize: 10, marginBottom: 8 }}>{label}</SectionLabel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 32, color: accent, lineHeight: 1, fontWeight: 400 }}>{value}</span>
        <span style={{ fontSize: 11, color: C.textDim, fontFamily: FONT_MONO }}>{suffix}</span>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// VIEW: EINSTELLUNGEN
// ─────────────────────────────────────────────────────────────────────
function SettingsView({ state, setState, today, onLeaveGroup }) {
  const [newName, setNewName] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  function addMember() {
    if (!newName.trim()) return;
    const id = `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const color = PALETTE[state.members.length % PALETTE.length];
    setState({ ...state, members: [...state.members, { id, name: newName.trim(), color }] });
    setNewName("");
  }
  function removeMember(id) {
    const next = { ...state, members: state.members.filter((m) => m.id !== id) };
    if (state.myMemberId === id) next.myMemberId = null;
    setState(next);
  }
  function moveMember(idx, delta) {
    const next = [...state.members];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setState({ ...state, members: next });
  }
  function setMe(id) {
    setState({ ...state, myMemberId: id === state.myMemberId ? null : id });
  }
  function updateKm(km) {
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
        {state.members.map((m, i) => (
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
            <div style={{ flex: 1, color: C.text, fontSize: 15, fontWeight: 500 }}>{m.name}</div>
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
            <button onClick={() => setMe(m.id)}
              style={{
                background: state.myMemberId === m.id ? `${C.amber}22` : "transparent",
                border: `1px solid ${state.myMemberId === m.id ? C.amber : C.border}`,
                color: state.myMemberId === m.id ? C.amber : C.textDim,
                borderRadius: 8, padding: "4px 10px", fontSize: 11, fontFamily: FONT_MONO,
                fontWeight: 600, cursor: "pointer", letterSpacing: "0.1em",
              }}
            >{state.myMemberId === m.id ? "ICH ✓" : "ICH"}</button>
            <button onClick={() => removeMember(m.id)}
              style={{ background: "transparent", border: "none", color: C.textDim, cursor: "pointer", padding: 6, borderRadius: 6 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.textDim)}
            ><Trash2 size={16} /></button>
          </div>
        ))}
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
      </Card>

      {/* Wegstrecke */}
      <SectionLabel>Wegstrecke</SectionLabel>
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: C.textDim, display: "block", marginBottom: 8 }}>Kilometer pro Fahrt (Hin & zurück)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="number" min={1} value={state.kmPerTrip || 30}
            onChange={(e) => updateKm(Number(e.target.value) || 0)}
            style={{
              width: 100, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "10px 12px", color: C.text, fontFamily: FONT_MONO, fontSize: 16, outline: "none",
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
        {!showResetConfirm ? (
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
export default function App() {
  const [localState, _setLocalState] = useState(defaultLocal);
  const [groupState, _setGroupState] = useState(defaultGroup);
  const [tab, setTab] = useState("today");
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [lastSync, setLastSync] = useState(null);
  const today = new Date();

  // Merged state — was die Views erwarten
  const state = useMemo(() => ({
    ...groupState,
    myMemberId: localState.myMemberId,
    notificationsEnabled: localState.notificationsEnabled,
    groupCode: localState.groupCode,
  }), [localState, groupState]);

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
            _setGroupState(remote);
          }
        }
      }
      setLoaded(true);
      setSyncStatus("synced");
      setLastSync(Date.now());
    })();
  }, []);

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

  // setState — routet Änderungen an local oder shared
  const setState = useCallback((next) => {
    const localKeys = ["myMemberId", "notificationsEnabled", "groupCode"];
    const groupKeys = ["members", "trips", "weeklyAssignments", "kmPerTrip"];

    let localChanged = false;
    let groupChanged = false;
    const newLocal = { ...localState };
    const newGroup = { ...groupState };

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
    await saveGroup(code, grp);
    const newLocal = { ...localState, groupCode: code };
    _setGroupState(grp);
    _setLocalState(newLocal);
    await saveLocal(newLocal);
    return code;
  }, [localState]);

  const joinGroup = useCallback(async (rawCode) => {
    const code = normalizeCode(rawCode);
    if (code.length < 4) return { error: "Code zu kurz" };
    const remote = await loadGroup(code);
    if (!remote) return { error: "Gruppe mit diesem Code nicht gefunden" };
    if (!remote.kmPerTrip) remote.kmPerTrip = 30;
    if (!remote.weeklyAssignments) remote.weeklyAssignments = {};
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
          <SettingsView state={state} setState={setState} today={today} onLeaveGroup={leaveGroup} />
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
