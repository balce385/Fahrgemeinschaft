import { useState } from 'react'
import {
  withMember,
  withoutMember,
  withRenamedMember,
  withReorderedMembers
} from '../lib/group.js'

export default function Members ({ group, me, onSetMe, onChange }) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  function add (e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    onChange(withMember(group, name))
    setNewName('')
  }

  function startEdit (m) {
    setEditingId(m.id)
    setEditName(m.name)
  }

  function commitEdit () {
    if (!editingId) return
    const name = editName.trim()
    if (name) onChange(withRenamedMember(group, editingId, name))
    setEditingId(null)
  }

  function remove (m) {
    if (!confirm(`${m.name} wirklich aus der Fahrgemeinschaft entfernen?`)) return
    if (me?.id === m.id) onSetMe(null)
    onChange(withoutMember(group, m.id))
  }

  function move (idx, dir) {
    const to = idx + dir
    if (to < 0 || to >= group.members.length) return
    onChange(withReorderedMembers(group, idx, to))
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="muted small">{group.name}</div>
          <h1>Mitglieder</h1>
        </div>
      </header>

      <div className="card">
        <p className="muted small" style={{ marginTop: 0 }}>
          Reihenfolge bestimmt die Wochenrotation. Tippe auf <strong>ICH</strong>,
          um dich auf diesem Gerät zu markieren.
        </p>
        <ul className="member-list">
          {group.members.map((m, idx) => {
            const isMe = me?.id === m.id
            const isEdit = editingId === m.id
            return (
              <li key={m.id} className="member-row">
                <span className="dot dot-lg" style={{ background: m.color }} />
                <div className="member-main">
                  {isEdit ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit() }}
                    />
                  ) : (
                    <button className="member-name" onClick={() => startEdit(m)}>
                      {m.name}
                      {idx === 0 && <span className="badge badge-soft">Start der Rotation</span>}
                    </button>
                  )}
                </div>
                <div className="member-actions">
                  <button
                    className={'btn-tag ' + (isMe ? 'btn-tag-on' : '')}
                    onClick={() => onSetMe(isMe ? null : m.id)}
                    title="Auf diesem Gerät als ICH markieren"
                  >
                    ICH
                  </button>
                  <button className="icon-btn" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Nach oben">↑</button>
                  <button className="icon-btn" onClick={() => move(idx, +1)} disabled={idx === group.members.length - 1} aria-label="Nach unten">↓</button>
                  <button className="icon-btn icon-btn-danger" onClick={() => remove(m)} aria-label="Entfernen">×</button>
                </div>
              </li>
            )
          })}
          {group.members.length === 0 && (
            <li className="empty muted">Noch keine Mitglieder hinzugefügt.</li>
          )}
        </ul>
      </div>

      <form className="card" onSubmit={add}>
        <label className="field">
          <span>Mitglied hinzufügen</span>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Name"
            maxLength={20}
          />
        </label>
        <button className="btn btn-primary btn-block" type="submit" disabled={!newName.trim()}>
          Hinzufügen
        </button>
      </form>
    </div>
  )
}
