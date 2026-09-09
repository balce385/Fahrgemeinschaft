import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

// Lazy-ish: wenn nicht konfiguriert, geben wir null zurück und das UI
// zeigt eine deutsche Fehlermeldung statt zu crashen.
export const supabase = isConfigured
  ? createClient(url, key, {
      realtime: { params: { eventsPerSecond: 5 } },
      auth: { persistSession: false }
    })
  : null
