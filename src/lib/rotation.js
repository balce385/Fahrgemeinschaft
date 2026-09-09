// Rotations-Logik: Wer fährt diese Woche, und wer übernimmt die
// Vertretung an einem konkreten Werktag?
//
// Modell:
//   - Die Mitglieder-Liste hat eine feste Reihenfolge.
//   - Pro Kalenderwoche ist ein Mitglied der "Stammfahrer".
//     Reihenfolge entspricht der Mitglieder-Liste, Index läuft mit der
//     Differenz zwischen `start_date` und der gewünschten Woche.
//   - Wenn der Stammfahrer an einem Werktag abwesend ist (Urlaub/krank),
//     übernimmt der nächste verfügbare Pendler nach Reihenfolge.
//   - Sind alle abwesend → "Heute fährt niemand" (Feiertag o.ä.).
//
// Faire Aufteilung über Zeit ergibt sich automatisch durch die
// rotierende Stammfahrer-Vergabe.
import {
  fromISODate,
  toISODate,
  startOfISOWeek,
  daysBetween,
  weekdaysOf,
  isWeekend
} from './dates.js'
import { isHoliday, holidayName } from './holidays.js'

/** Index des Stammfahrers für eine bestimmte Woche. */
export function driverIndexForWeek (group, dateInWeek) {
  if (!group?.members?.length) return -1
  const start = fromISODate(group.start_date)
  const startMo = startOfISOWeek(start)
  const targetMo = startOfISOWeek(dateInWeek)
  const weeks = Math.floor(daysBetween(startMo, targetMo) / 7)
  const n = group.members.length
  return ((weeks % n) + n) % n
}

/** Mitglied, das diese Woche regulär dran ist (oder null). */
export function primaryDriverForWeek (group, dateInWeek) {
  const idx = driverIndexForWeek(group, dateInWeek)
  if (idx < 0) return null
  return group.members[idx] || null
}

/** Set der Mitglieder-IDs, die an einem Datum abwesend sind. */
export function absentMemberIds (group, isoDate) {
  const out = new Set()
  for (const a of group.absences || []) {
    if (a.date === isoDate) out.add(a.memberId)
  }
  return out
}

/**
 * Wer fährt an einem konkreten Werktag?
 * Rückgabe: { driver, isPrimary, primary, reason } | null
 *   - reason: 'weekend' | 'holiday:Name' | null
 *   - driver: das Mitglied, das tatsächlich fährt (oder null wenn niemand)
 *   - isPrimary: true wenn der Stammfahrer fährt
 *   - primary: das Mitglied, das eigentlich dran wäre (für Anzeige)
 */
export function driverForDay (group, date) {
  const iso = toISODate(date)
  if (isWeekend(date)) {
    return { driver: null, isPrimary: false, primary: null, reason: 'weekend' }
  }
  if (isHoliday(date)) {
    return { driver: null, isPrimary: false, primary: null, reason: 'holiday:' + holidayName(date) }
  }
  if (!group?.members?.length) {
    return null
  }

  const startIdx = driverIndexForWeek(group, date)
  const primary = group.members[startIdx]
  const absent = absentMemberIds(group, iso)
  const n = group.members.length

  // Suche das nächste verfügbare Mitglied ab dem Stammfahrer.
  for (let off = 0; off < n; off++) {
    const m = group.members[(startIdx + off) % n]
    if (!absent.has(m.id)) {
      return {
        driver: m,
        isPrimary: off === 0,
        primary,
        reason: null
      }
    }
  }
  // Alle abwesend
  return { driver: null, isPrimary: false, primary, reason: 'all-absent' }
}

/**
 * Plant eine ganze Woche durch und liefert pro Werktag (Mo–Fr) eine Zeile.
 * Ergebnis: Array<{ date, iso, weekday, info }>
 */
export function planWeek (group, dateInWeek) {
  return weekdaysOf(dateInWeek).map(d => ({
    date: d,
    iso: toISODate(d),
    weekday: d.getDay(),
    info: driverForDay(group, d)
  }))
}

/**
 * Statistik: wie oft hat jedes Mitglied in einem Zeitraum gefahren?
 * Hilfreich für das "Faire-Aufteilung"-Gefühl.
 */
export function fairnessStats (group, fromDate, toDate) {
  const out = new Map()
  if (!group?.members?.length) return out
  for (const m of group.members) out.set(m.id, 0)

  const cur = new Date(fromDate)
  while (cur <= toDate) {
    if (!isWeekend(cur) && !isHoliday(cur)) {
      const info = driverForDay(group, cur)
      if (info?.driver) {
        out.set(info.driver.id, (out.get(info.driver.id) || 0) + 1)
      }
    }
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/** Ein paar Standard-Farben für neue Mitglieder. */
export const MEMBER_COLORS = [
  '#14b8a6', // teal
  '#f97316', // orange
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#facc15', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#ef4444'  // red
]

export function nextColor (used = []) {
  for (const c of MEMBER_COLORS) {
    if (!used.includes(c)) return c
  }
  // Hash-Fallback
  return MEMBER_COLORS[used.length % MEMBER_COLORS.length]
}
