// Sachsen-Feiertage. Berechnet Ostern via Gauss-Algorithmus und leitet
// alle beweglichen Feiertage davon ab. Reformationstag und Buß- und
// Bettag sind Sachsen-spezifisch.
import { toISODate } from './dates.js'

/** Osterdatum nach Gauss (gültig 1900–2099). Liefert ein lokales Date. */
function easterSunday (year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3=März, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDays (d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/**
 * Buß- und Bettag = der Mittwoch vor dem letzten Sonntag im Kirchenjahr,
 * was in der Praxis der Mittwoch zwischen 16. und 22. November ist.
 * Konkret: der Mittwoch vor dem 23. November.
 */
function bussUndBettag (year) {
  // 23. November
  const ref = new Date(year, 10, 23)
  // Suche rückwärts den Mittwoch
  while (ref.getDay() !== 3) {
    ref.setDate(ref.getDate() - 1)
  }
  return ref
}

/** Liefert eine Map { 'YYYY-MM-DD': 'Bezeichnung' } für ein Jahr (Sachsen). */
export function holidaysFor (year) {
  const easter = easterSunday(year)
  const list = [
    { date: new Date(year, 0, 1),  name: 'Neujahr' },
    { date: addDays(easter, -2),   name: 'Karfreitag' },
    { date: easter,                name: 'Ostersonntag' },
    { date: addDays(easter, 1),    name: 'Ostermontag' },
    { date: new Date(year, 4, 1),  name: 'Tag der Arbeit' },
    { date: addDays(easter, 39),   name: 'Christi Himmelfahrt' },
    { date: addDays(easter, 49),   name: 'Pfingstsonntag' },
    { date: addDays(easter, 50),   name: 'Pfingstmontag' },
    { date: new Date(year, 9, 3),  name: 'Tag der Deutschen Einheit' },
    { date: new Date(year, 9, 31), name: 'Reformationstag' },
    { date: bussUndBettag(year),   name: 'Buß- und Bettag' },
    { date: new Date(year, 11, 25), name: '1. Weihnachtstag' },
    { date: new Date(year, 11, 26), name: '2. Weihnachtstag' }
  ]
  const map = {}
  for (const h of list) map[toISODate(h.date)] = h.name
  return map
}

/** Cache für Mehrjahres-Lookups. */
const cache = new Map()
export function getHolidays (year) {
  if (!cache.has(year)) cache.set(year, holidaysFor(year))
  return cache.get(year)
}

/** Gibt den Feiertag-Namen oder null zurück. `d` ist ein Date. */
export function holidayName (d) {
  const map = getHolidays(d.getFullYear())
  return map[toISODate(d)] || null
}

export function isHoliday (d) {
  return holidayName(d) !== null
}
