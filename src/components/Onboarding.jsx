import { useState } from 'react'
import {
  createGroup,
  loadGroupByCode,
  saveGroup,
  withMember
} from '../lib/group.js'

export default function Onboarding ({ onJoined }) {
  const [mode, setMode] = useState('start') // start | create | join
  const [groupName, setGroupName] = useState('')
  const [myName, setMyName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function handleCreate (e) {
    e.preventDefault()
    if (!groupName.trim() || !myName.trim()) return
    setBusy(true); setErr(null)
    try {
      const g = await createGroup({ name: groupName })
      const withMe = withMember(g, myName)
      const saved = await saveGroup(withMe)
      const me = saved.members[saved.members.length - 1]
      onJoined(saved, me.id)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin (e) {
    e.preventDefault()
    if (!code.trim() || !myName.trim()) return
    setBusy(true); setErr(null)
    try {
      const g = await loadGroupByCode(code)
      if (!g) {
        setErr('Kein Code gefunden. Großschreibung und Zahlen prüfen.')
        return
      }
      // Wenn der Name bereits existiert, einfach diesen nutzen
      const existing = g.members.find(m => m.name.toLowerCase() === myName.trim().toLowerCase())
      if (existing) {
        onJoined(g, existing.id)
        return
      }
      const withMe = withMember(g, myName)
      const saved = await saveGroup(withMe)
      const me = saved.members[saved.members.length - 1]
      onJoined(saved, me.id)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-hero">
        <div className="onboarding-logo">🚗</div>
        <h1>Fahrgemeinschaft</h1>
        <p className="muted">Wer fährt, fährt. Alle sehen denselben Plan.</p>
      </div>

      {mode === 'start' && (
        <div className="card">
          <button className="btn btn-primary btn-block" onClick={() => setMode('create')}>
            Neue Fahrgemeinschaft anlegen
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => setMode('join')}>
            Mit Code beitreten
          </button>
        </div>
      )}

      {mode === 'create' && (
        <form className="card" onSubmit={handleCreate}>
          <label className="field">
            <span>Name der Fahrgemeinschaft</span>
            <input
              autoFocus
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder='z. B. "Pendler Dresden"'
              maxLength={40}
            />
          </label>
          <label className="field">
            <span>Dein Name</span>
            <input
              value={myName}
              onChange={e => setMyName(e.target.value)}
              placeholder="z. B. Pierre"
              maxLength={20}
            />
          </label>
          {err && <div className="error">{err}</div>}
          <button className="btn btn-primary btn-block" disabled={busy} type="submit">
            {busy ? 'Lege an…' : 'Anlegen'}
          </button>
          <button className="btn btn-link btn-block" type="button" onClick={() => setMode('start')}>
            Zurück
          </button>
        </form>
      )}

      {mode === 'join' && (
        <form className="card" onSubmit={handleJoin}>
          <label className="field">
            <span>6-stelliger Code</span>
            <input
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="K7XQ4M"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="code-input"
              maxLength={6}
            />
          </label>
          <label className="field">
            <span>Dein Name</span>
            <input
              value={myName}
              onChange={e => setMyName(e.target.value)}
              placeholder="z. B. Pierre"
              maxLength={20}
            />
          </label>
          {err && <div className="error">{err}</div>}
          <button className="btn btn-primary btn-block" disabled={busy} type="submit">
            {busy ? 'Trete bei…' : 'Beitreten'}
          </button>
          <button className="btn btn-link btn-block" type="button" onClick={() => setMode('start')}>
            Zurück
          </button>
        </form>
      )}
    </div>
  )
}
