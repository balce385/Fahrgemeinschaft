import { useMemo, useState } from 'react'
import {
  toISODate,
  fromISODate,
  WEEKDAYS_SHORT,
  MONTHS_LONG,
  isWeekend
} from '../lib/dates.js'
import { isHoliday, holidayName } from '../lib/holidays.js'
import {
  withAbsence,
  withoutAbsence,
  withAbsenceRange
} from '../lib/group.js'

const TYPE_LABEL = { urlaub: 'Urlaub', krank: 'Krank', sonstiges: 'Sonstiges' }
const TYPE_EMOJI = { urlaub: '🏖️', krank: '🤒', sonstiges: '⚪' }

export default function Absences ({ group, me, onChange }) {
  const [memberId, setMemberId] = useState(me?.id || group.members[0]?.id || '')
  const [type, setType] = useState('urlaub')
  const [monthOffset, setMonthOffset] = useState(0)
  const [rangeFrom, setRangeFrom] = useState(null) // ISO

  const monthDate = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + monthOffset)
    return d
  }, [monthOffset])

  const grid = useMemo(() => buildMonthGrid(monthDate), [monthDate])

  const absencesByDate = useMemo(() => {
    const map = new Map()
    for (const a of group.absences || []) {
      if (a.memberId !== memberId) continue
      map.set(a.date, a)
    }
    return map
  }, [group.absences, memberId])

  function toggleDay (iso) {
    if (!memberId) return
    if (rangeFrom) {
      const [a, b] = rangeFrom <= iso ? [rangeFrom, iso] : [iso, rangeFrom]
      onChange(withAbsenceRange(group, { memberId, fromISO: a, toISO: b, type }))
      setRangeFrom(null)
      return
    }
    const existing = absencesByDate.get(iso)
    if (existing && existing.type === type) {
      onChange(withoutAbsence(group, { memberId, date: iso }))
    } else {
      onChange(withAbsence(group, { memberId, date: iso, type }))
    }
  }

  function startRange (iso) {
    setRangeFrom(iso)
  }

  function clearMonth () {
    if (!memberId) return
    if (!confirm('Alle Abwesenheiten in diesem Monat für diese Person löschen?')) return
    const ym = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
    const next = {
      ...group,
      absences: (group.absences || []).filter(
        a => !(a.memberId === memberId && a.date.startsWith(ym))
      )
    }
    onChange(next)
  }

  const member = group.members.find(m => m.id === memberId) || null
  const monthLabel = `${MONTHS_LONG[monthDate.getMonth()]} ${monthDate.getFullYear()}`

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="muted small">{group.name}</div>
          <h1>Abwesenheiten</h1>
        </div>
      </header>

      <div className="card">
        <label className="field">
          <span>Person</span>
          <select value={memberId} onChange={e => setMemberId(e.target.value)}>
            {group.members.length === 0 && <option value="">Keine Mitglieder</option>}
            {group.members.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}{me?.id === m.id ? ' (du)' : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Art</span>
          <div className="seg">
            {Object.keys(TYPE_LABEL).map(t => (
              <button
                key={t}
                type="button"
                className={'seg-btn ' + (type === t ? 'seg-on' : '')}
                onClick={() => setType(t)}
              >
                {TYPE_EMOJI[t]} {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="muted small">
          Tippen: einzelner Tag · Lange tippen / 2× tippen für Bereich
        </div>
      </div>

      <div className="card">
        <div className="cal-header">
          <button className="icon-btn" onClick={() => setMonthOffset(o => o - 1)} aria-label="Vorheriger Monat">‹</button>
          <div className="cal-title">{monthLabel}</div>
          <button className="icon-btn" onClick={() => setMonthOffset(o => o + 1)} aria-label="Nächster Monat">›</button>
        </div>

        <div className="cal-grid cal-weekdays">
          {['Mo','Di','Mi','Do','Fr','Sa','So'].map(w => (
            <div key={w} className="cal-weekday muted small">{w}</div>
          ))}
        </div>
        <div className="cal-grid">
          {grid.map(({ date, iso, inMonth }) => {
            const ab = absencesByDate.get(iso)
            const today = toISODate(new Date()) === iso
            const we = isWeekend(date)
            const hol = isHoliday(date)
            const cls = ['cal-cell']
            if (!inMonth) cls.push('cal-out')
            if (we) cls.push('cal-weekend')
            if (hol) cls.push('cal-holiday')
            if (today) cls.push('cal-today')
            if (ab) cls.push('cal-abs', 'cal-abs-' + ab.type)
            if (rangeFrom === iso) cls.push('cal-range-start')
            return (
              <button
                key={iso}
                type="button"
                className={cls.join(' ')}
                onClick={() => toggleDay(iso)}
                onContextMenu={e => { e.preventDefault(); startRange(iso) }}
                onTouchStart={e => {
                  // Long-press → Bereich starten
                  const el = e.currentTarget
                  el._touchT = setTimeout(() => startRange(iso), 500)
                }}
                onTouchEnd={e => { clearTimeout(e.currentTarget._touchT) }}
                onTouchMove={e => { clearTimeout(e.currentTarget._touchT) }}
                title={hol ? holidayName(date) : ''}
                disabled={!memberId}
              >
                <span className="cal-num">{date.getDate()}</span>
                {ab && <span className="cal-marker">{TYPE_EMOJI[ab.type]}</span>}
              </button>
            )
          })}
        </div>

        {rangeFrom && (
          <div className="muted small" style={{ marginTop: 8 }}>
            Bereich gestartet bei {fmt(rangeFrom)} – jetzt Endtag tippen.{' '}
            <button className="btn btn-link" onClick={() => setRangeFrom(null)}>Abbrechen</button>
          </div>
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setMonthOffset(0)}>Heute</button>
          <button className="btn btn-ghost" onClick={clearMonth} disabled={!member}>
            Monat leeren
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          {member ? `Geplante Abwesenheiten – ${member.name}` : 'Geplante Abwesenheiten'}
        </div>
        <UpcomingList absences={group.absences || []} memberId={memberId} />
      </div>
    </div>
  )
}

function fmt (iso) {
  const d = fromISODate(iso)
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`
}

function UpcomingList ({ absences, memberId }) {
  const today = toISODate(new Date())
  const upcoming = absences
    .filter(a => a.memberId === memberId && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 30)
  if (upcoming.length === 0) {
    return <div className="muted small">Keine geplanten Abwesenheiten.</div>
  }
  // Konsekutive Tage zu Bereichen zusammenfassen
  const ranges = []
  for (const a of upcoming) {
    const last = ranges[ranges.length - 1]
    const next = isNextDay(last?.to, a.date)
    if (last && next && last.type === a.type) {
      last.to = a.date
      last.count++
    } else {
      ranges.push({ from: a.date, to: a.date, type: a.type, count: 1 })
    }
  }
  return (
    <ul className="absence-list">
      {ranges.map((r, i) => (
        <li key={i}>
          <span className="absence-icon">{TYPE_EMOJI[r.type]}</span>
          <span className="absence-text">
            {r.from === r.to ? fmt(r.from) : `${fmt(r.from)} – ${fmt(r.to)}`}
            {' '}<span className="muted small">({r.count} Tag{r.count > 1 ? 'e' : ''})</span>
          </span>
          <span className="muted small">{TYPE_LABEL[r.type]}</span>
        </li>
      ))}
    </ul>
  )
}

function isNextDay (prevISO, curISO) {
  if (!prevISO) return false
  const p = fromISODate(prevISO)
  p.setDate(p.getDate() + 1)
  return toISODate(p) === curISO
}

function buildMonthGrid (monthDate) {
  const y = monthDate.getFullYear()
  const m = monthDate.getMonth()
  const first = new Date(y, m, 1)
  const startOffset = (first.getDay() + 6) % 7 // Mo=0
  const start = new Date(y, m, 1 - startOffset)
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({
      date: d,
      iso: toISODate(d),
      inMonth: d.getMonth() === m
    })
  }
  return cells
}
