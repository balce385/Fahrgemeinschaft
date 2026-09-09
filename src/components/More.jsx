import { useState } from 'react'
import { downloadICS } from '../lib/ics.js'
import { fromISODate, toISODate, formatLong } from '../lib/dates.js'

export default function More ({ group, me, onChange, onLeave }) {
  const [copied, setCopied] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(group.name)
  const [showStartPicker, setShowStartPicker] = useState(false)

  function copyCode () {
    navigator.clipboard?.writeText(group.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function share () {
    const url = window.location.origin
    const text = `Tritt unserer Fahrgemeinschaft bei!\n\nApp: ${url}\nCode: ${group.code}`
    if (navigator.share) {
      try { await navigator.share({ title: group.name, text, url }) } catch {}
    } else {
      navigator.clipboard?.writeText(text)
      alert('Einladung in die Zwischenablage kopiert.')
    }
  }

  function exportAll () {
    downloadICS(group, { weeks: 12 })
  }
  function exportMine () {
    if (!me) {
      alert('Markiere dich zuerst auf der Mitglieder-Seite mit "ICH".')
      return
    }
    downloadICS(group, { weeks: 12, mineOnly: me.id })
  }

  function commitRename () {
    const n = newName.trim()
    if (n && n !== group.name) onChange({ ...group, name: n })
    setRenaming(false)
  }

  function setStartDate (e) {
    const v = e.target.value
    if (!v) return
    onChange({ ...group, start_date: v })
    setShowStartPicker(false)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="muted small">{group.name}</div>
          <h1>Mehr</h1>
        </div>
      </header>

      <div className="card code-card">
        <div className="muted small">Einladungs-Code</div>
        <div className="code-display" onClick={copyCode}>{group.code}</div>
        <div className="muted small">{copied ? '✓ Kopiert' : 'Tippen zum Kopieren'}</div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-primary btn-grow" onClick={share}>Einladung teilen</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Kalender-Export (.ics)</div>
        <p className="muted small" style={{ marginTop: 0 }}>
          Importiere die Datei in deinen iOS- oder Android-Kalender. Erinnerungen
          am Vorabend werden automatisch gesetzt, wenn du fährst.
        </p>
        <div className="row" style={{ flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-ghost btn-block" onClick={exportMine}>
            Nur meine Fahrten exportieren
          </button>
          <button className="btn btn-ghost btn-block" onClick={exportAll}>
            Alle Fahrten exportieren
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Fahrgemeinschaft</div>
        <div className="row-between">
          <div>
            <div className="muted small">Name</div>
            {renaming ? (
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => { if (e.key === 'Enter') commitRename() }}
              />
            ) : (
              <div>{group.name}</div>
            )}
          </div>
          {!renaming && <button className="btn btn-link" onClick={() => setRenaming(true)}>Ändern</button>}
        </div>
        <div className="row-between" style={{ marginTop: 12 }}>
          <div>
            <div className="muted small">Rotations-Start</div>
            <div>{formatLong(fromISODate(group.start_date))}</div>
            <div className="muted small">Ab dieser Woche fährt das erste Mitglied der Liste.</div>
          </div>
          {showStartPicker ? (
            <input type="date" defaultValue={group.start_date} onChange={setStartDate} />
          ) : (
            <button className="btn btn-link" onClick={() => setShowStartPicker(true)}>Ändern</button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Auf diesem Gerät</div>
        <div className="muted small" style={{ marginBottom: 12 }}>
          {me ? <>Du bist hier eingestellt als <strong>{me.name}</strong>.</> : <>Noch kein "ICH" gesetzt. Geh zu Mitglieder.</>}
        </div>
        <button className="btn btn-danger btn-block" onClick={() => {
          if (confirm('Diese Fahrgemeinschaft auf diesem Gerät vergessen? Du kannst sie jederzeit per Code wieder beitreten.')) {
            onLeave()
          }
        }}>
          Fahrgemeinschaft auf diesem Gerät verlassen
        </button>
      </div>

      <div className="card muted small">
        Fahrgemeinschaft · v1.0 · läuft als Web-App, ohne App Store
      </div>
    </div>
  )
}
