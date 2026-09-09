// Daten-Layer: Gruppen anlegen, beitreten, Mitglieder & Abwesenheiten
// pflegen. Alles geht über eine einzige Tabelle `groups` mit JSONB-
// Feldern, sodass jede Änderung als ein UPDATE-Event im Realtime-Channel
// landet.
import { supabase } from './supabase.js'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // ohne 0/O/I/1
function randomCode (len = 6) {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return s
}

function uuid () {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Erstellt eine neue Gruppe mit einem zufälligen, eindeutigen Code. */
export async function createGroup ({ name }) {
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  // Mehrere Versuche, falls der Code zufällig kollidiert
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode()
    const today = new Date()
    const startMo = new Date(today)
    const dow = (today.getDay() + 6) % 7
    startMo.setDate(today.getDate() - dow)
    const start_date = `${startMo.getFullYear()}-${String(startMo.getMonth() + 1).padStart(2, '0')}-${String(startMo.getDate()).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('groups')
      .insert({
        code,
        name: name?.trim() || 'Fahrgemeinschaft',
        start_date,
        members: [],
        absences: []
      })
      .select()
      .single()

    if (!error) return data
    // 23505 = unique violation → neuen Code probieren
    if (error.code !== '23505') throw error
  }
  throw new Error('Konnte keinen freien Code finden')
}

/** Lädt die Gruppe per Code. Liefert null, falls nicht gefunden. */
export async function loadGroupByCode (code) {
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  if (error) throw error
  return data
}

/** Lädt die Gruppe per Id. */
export async function loadGroupById (id) {
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Schreibt members + absences zurück. */
export async function saveGroup (group) {
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const { data, error } = await supabase
    .from('groups')
    .update({
      name: group.name,
      members: group.members,
      absences: group.absences,
      start_date: group.start_date
    })
    .eq('id', group.id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Realtime-Subscription auf Änderungen *einer* Gruppe. */
export function subscribeGroup (groupId, onChange) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel(`group:${groupId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
      payload => onChange(payload.new)
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// ---- Helfer für lokale Mutationen (Optimistic UI) ----

export function withMember (group, name) {
  const used = (group.members || []).map(m => m.color)
  const colors = ['#14b8a6', '#f97316', '#8b5cf6', '#ec4899', '#facc15', '#22c55e', '#3b82f6', '#ef4444']
  const color = colors.find(c => !used.includes(c)) || colors[(group.members?.length || 0) % colors.length]
  return {
    ...group,
    members: [...(group.members || []), { id: uuid(), name: name.trim(), color }]
  }
}

export function withoutMember (group, memberId) {
  return {
    ...group,
    members: (group.members || []).filter(m => m.id !== memberId),
    absences: (group.absences || []).filter(a => a.memberId !== memberId)
  }
}

export function withRenamedMember (group, memberId, name) {
  return {
    ...group,
    members: (group.members || []).map(m => m.id === memberId ? { ...m, name } : m)
  }
}

export function withReorderedMembers (group, fromIdx, toIdx) {
  const list = [...(group.members || [])]
  const [m] = list.splice(fromIdx, 1)
  list.splice(toIdx, 0, m)
  return { ...group, members: list }
}

export function withAbsence (group, { memberId, date, type }) {
  const others = (group.absences || []).filter(a => !(a.memberId === memberId && a.date === date))
  return { ...group, absences: [...others, { memberId, date, type }] }
}

export function withoutAbsence (group, { memberId, date }) {
  return {
    ...group,
    absences: (group.absences || []).filter(a => !(a.memberId === memberId && a.date === date))
  }
}

export function withAbsenceRange (group, { memberId, fromISO, toISO, type }) {
  const from = new Date(fromISO + 'T00:00:00')
  const to = new Date(toISO + 'T00:00:00')
  const others = (group.absences || []).filter(a => {
    if (a.memberId !== memberId) return true
    const d = a.date
    return d < fromISO || d > toISO
  })
  const next = [...others]
  const cur = new Date(from)
  while (cur <= to) {
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    next.push({ memberId, date: iso, type })
    cur.setDate(cur.getDate() + 1)
  }
  return { ...group, absences: next }
}
