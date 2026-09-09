// Datums-Helfer ohne externe Bibliothek. Alle Funktionen arbeiten in
// lokaler Zeit (Europe/Berlin), weil das für Pendler natürlicher ist
// als UTC. ISO-Strings: 'YYYY-MM-DD' (ohne Zeitanteil).

export const WEEKDAYS_LONG = [
  'Sonntag', 'Montag', 'Dienstag', 'Mittwoch',
  'Donnerstag', 'Freitag', 'Samstag'
]
export const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
export const MONTHS_LONG = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

/** Formatiert ein Date-Objekt als 'YYYY-MM-DD' (lokale Zeitzone). */
export function toISODate (d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parsen eines 'YYYY-MM-DD'-Strings als lokales Date (00:00 Uhr). */
export function fromISODate (s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Heute als ISO-Datum, lokale Zeit. */
export function todayISO () {
  return toISODate(new Date())
}

/** Liefert das Date des Montags der Woche, in der `d` liegt. */
export function startOfISOWeek (d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (x.getDay() + 6) % 7 // Mo=0, So=6
  x.setDate(x.getDate() - dow)
  return x
}

/** Anzahl ganzer Tage zwischen zwei Date-Objekten (lokal, ohne Zeit). */
export function daysBetween (a, b) {
  const ms = 1000 * 60 * 60 * 24
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((b0 - a0) / ms)
}

/** ISO-Wochennummer nach DIN/EU-Konvention. */
export function isoWeekNumber (d) {
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - target) / (7 * 86400000))
}

/** Prüft, ob ein Datum auf Sa/So fällt. */
export function isWeekend (d) {
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

/** Gibt die fünf Werktage Mo–Fr der Woche von `d` zurück. */
export function weekdaysOf (d) {
  const mo = startOfISOWeek(d)
  return [0, 1, 2, 3, 4].map(i => {
    const x = new Date(mo)
    x.setDate(mo.getDate() + i)
    return x
  })
}

/** Hübsches deutsches Datum: "Mo, 5. Mai". */
export function formatShort (d) {
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()}. ${MONTHS_LONG[d.getMonth()].slice(0, 3)}`
}

/** Volles deutsches Datum: "Montag, 5. Mai 2026". */
export function formatLong (d) {
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()}. ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}
