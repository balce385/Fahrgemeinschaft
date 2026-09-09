// .ics-Export für iOS- und Android-Kalender. Erzeugt VEVENTs für die
// nächsten ~12 Wochen mit dem Stammfahrer pro Werktag (inkl. ggf.
// Vertretung an bekannten Abwesenheits-Tagen).
import { driverForDay } from './rotation.js'
import { isWeekend } from './dates.js'
import { isHoliday } from './holidays.js'

function pad (n) { return String(n).padStart(2, '0') }

/** UTC-Zeitstempel für DTSTAMP. */
function nowUTC () {
  const d = new Date()
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
         `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

/** YYYYMMDD aus lokalem Date. */
function dayStamp (d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function escapeText (s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/** "Auto-fold" auf 75 Oktette (ICS-RFC 5545). Vereinfachte Variante. */
function fold (line) {
  if (line.length <= 75) return line
  const chunks = []
  let i = 0
  while (i < line.length) {
    chunks.push((i === 0 ? '' : ' ') + line.slice(i, i + 73))
    i += 73
  }
  return chunks.join('\r\n')
}

/**
 * Baut einen ICS-Kalender. Standardmäßig 12 Wochen ab heute, Mo–Fr.
 * Optionen:
 *   - weeks:  Anzahl Wochen (default 12)
 *   - mineOnly:  wenn gesetzt (memberId), nur Tage, an denen ICH fahre
 */
export function buildICS (group, options = {}) {
  const weeks = options.weeks ?? 12
  const mineOnly = options.mineOnly ?? null

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fahrgemeinschaft//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(group.name + ' – Fahrgemeinschaft')}`,
    'X-WR-TIMEZONE:Europe/Berlin'
  ]

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + weeks * 7)

  const stamp = nowUTC()
  const cur = new Date(start)
  let count = 0

  while (cur < end) {
    if (!isWeekend(cur) && !isHoliday(cur)) {
      const info = driverForDay(group, cur)
      if (info?.driver) {
        const include = !mineOnly || info.driver.id === mineOnly
        if (include) {
          const ds = dayStamp(cur)
          // Nächster Tag für DTEND (all-day inkl. ist exclusive)
          const next = new Date(cur)
          next.setDate(next.getDate() + 1)
          const de = dayStamp(next)

          const isMine = mineOnly && info.driver.id === mineOnly
          const summary = isMine
            ? `🚗 Du fährst (Fahrgemeinschaft)`
            : `🚗 ${info.driver.name} fährt`
          const desc = info.isPrimary
            ? 'Stammfahrer dieser Woche.'
            : `Vertretung – eigentlich wäre ${info.primary?.name || '?'} dran.`

          lines.push('BEGIN:VEVENT')
          lines.push(`UID:fahrt-${group.id}-${ds}-${info.driver.id}@fahrgemeinschaft`)
          lines.push(`DTSTAMP:${stamp}`)
          lines.push(`DTSTART;VALUE=DATE:${ds}`)
          lines.push(`DTEND;VALUE=DATE:${de}`)
          lines.push(`SUMMARY:${escapeText(summary)}`)
          lines.push(`DESCRIPTION:${escapeText(desc)}`)
          lines.push('TRANSP:TRANSPARENT')
          if (isMine) {
            // Erinnerung am Vorabend um 20:00 (relative -PT11H ab 09:00 Vortag → wir nehmen einfach 1 Tag − 4h)
            lines.push('BEGIN:VALARM')
            lines.push('ACTION:DISPLAY')
            lines.push('DESCRIPTION:Morgen fährst du')
            lines.push('TRIGGER:-PT16H')
            lines.push('END:VALARM')
          }
          lines.push('END:VEVENT')
          count++
        }
      }
    }
    cur.setDate(cur.getDate() + 1)
  }

  lines.push('END:VCALENDAR')
  const body = lines.map(fold).join('\r\n')
  return { body, count }
}

/** Triggert einen Download im Browser. */
export function downloadICS (group, options) {
  const { body } = buildICS(group, options)
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName = (group.name || 'fahrgemeinschaft').replace(/[^a-z0-9-]+/gi, '-').toLowerCase()
  a.href = url
  a.download = `${safeName}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
