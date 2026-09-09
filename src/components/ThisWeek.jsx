import { useMemo, useState } from 'react'
import {
  WEEKDAYS_SHORT,
  todayISO,
  isoWeekNumber,
  startOfISOWeek
} from '../lib/dates.js'
import {
  planWeek,
  primaryDriverForWeek,
  fairnessStats
} from '../lib/rotation.js'

function MemberDot ({ member }) {
  if (!member) return null
  return (
    <span className="dot" style={{ background: member.color }} title={member.name} />
  )
}

export default function ThisWeek ({ group, me }) {
  const [offset, setOffset] = useState(0) // 0 = diese Woche, 1 = nächste, …

  const refDate = useMemo(() => {
    const d = startOfISOWeek(new Date())
    d.setDate(d.getDate() + offset * 7)
    return d
  }, [offset])

  const weekPlan = useMemo(() => planWeek(group, refDate), [group, refDate])
  const primary = useMemo(() => primaryDriverForWeek(group, refDate), [group, refDate])
  const today = todayISO()
  const weekNo = isoWeekNumber(refDate)

  // Fairness über die nächsten 8 Wochen
  const fairness = useMemo(() => {
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(to.getDate() + 8 * 7)
    return fairnessStats(group, from, to)
  }, [group])

  const noMembers = (group.members?.length ?? 0) === 0

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="muted small">{group.name}</div>
          <h1>{offset === 0 ? 'Diese Woche' : offset === 1 ? 'Nächste Woche' : `Woche +${offset}`}</h1>
          <div className="muted small">KW {weekNo}</div>
        </div>
        <div className="week-nav">
          <button className="icon-btn" onClick={() => setOffset(o => Math.max(0, o - 1))} disabled={offset === 0} aria-label="Woche zurück">‹</button>
          <button className="icon-btn" onClick={() => setOffset(o => o + 1)} aria-label="Woche vor">›</button>
        </div>
      </header>

      {noMembers ? (
        <div className="card empty">
          <p>Noch keine Mitglieder. Geh zu <strong>Mitglieder</strong> und füge die Pendler hinzu.</p>
        </div>
      ) : (
        <>
          <div className="card primary-card" style={{ borderLeftColor: primary?.color || 'transparent' }}>
            <div className="muted small">Stammfahrer dieser Woche</div>
            <div className="primary-name">
              <MemberDot member={primary} />
              {primary?.name || '—'}
              {me && primary?.id === me.id && <span className="badge badge-mine">DU</span>}
            </div>
          </div>

          <div className="card">
            <ul className="day-list">
              {weekPlan.map(({ date, iso, info }) => {
                const isToday = iso === today
                const driver = info?.driver
                const reason = info?.reason
                const cls = ['day-row']
                if (isToday) cls.push('day-today')
                if (reason && reason !== null) cls.push('day-off')
                return (
                  <li key={iso} className={cls.join(' ')}>
                    <div className="day-left">
                      <div className="day-weekday">{WEEKDAYS_SHORT[date.getDay()]}</div>
                      <div className="day-num">{date.getDate()}.{date.getMonth() + 1}.</div>
                    </div>
                    <div className="day-right">
                      {reason === 'weekend' && <span className="muted">Wochenende</span>}
                      {reason?.startsWith('holiday:') && (
                        <span className="muted">🎉 {reason.slice(8)}</span>
                      )}
                      {reason === 'all-absent' && <span className="muted">Alle abwesend</span>}
                      {!reason && driver && (
                        <span className="day-driver">
                          <MemberDot member={driver} />
                          <span>{driver.name}</span>
                          {!info.isPrimary && (
                            <span className="badge badge-sub">Vertretung</span>
                          )}
                          {me && driver.id === me.id && (
                            <span className="badge badge-mine">DU</span>
                          )}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="card">
            <div className="card-title">Verteilung (nächste 8 Wochen)</div>
            <ul className="fairness-list">
              {group.members.map(m => {
                const count = fairness.get(m.id) || 0
                const max = Math.max(...Array.from(fairness.values()), 1)
                const pct = (count / max) * 100
                return (
                  <li key={m.id}>
                    <span className="fairness-name">
                      <MemberDot member={m} /> {m.name}
                    </span>
                    <span className="fairness-bar">
                      <span className="fairness-fill" style={{ width: pct + '%', background: m.color }} />
                    </span>
                    <span className="fairness-count">{count} ×</span>
                  </li>
                )
              })}
            </ul>
            <div className="muted small" style={{marginTop: 8}}>
              Stammfahrer-Rotation startet mit dem ersten Mitglied. Vertretungen werden mitgezählt.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
