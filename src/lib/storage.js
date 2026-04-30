// ──────────────────────────────────────────────────────────────────
//  storage.js
//  ----------------------------------------------------------------
//  Implementiert window.storage als Bruecke zwischen
//    - localStorage (fuer geraetespezifische Einstellungen)
//    - Supabase     (fuer die geteilten Gruppen-Daten)
//
//  Die App ruft nur:
//    window.storage.get(key, shared?)   -> { value: string } | null
//    window.storage.set(key, json, shared?)
//
//  Keys mit Prefix "group:" werden in Supabase abgelegt,
//  alles andere bleibt lokal auf dem Geraet.
// ──────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 2 } },
    });
  } catch (e) {
    console.error("Supabase init failed:", e);
  }
} else {
  console.warn(
    "Supabase nicht konfiguriert (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen). " +
    "App laeuft im Solo-Modus ohne Geraete-Sync."
  );
}

function codeFrom(key) {
  return key.startsWith("group:") ? key.slice(6) : key;
}

function cacheKey(code) {
  return `fg:groupcache:${code}`;
}

const storage = {
  async get(key, shared = false) {
    if (shared) {
      const code = codeFrom(key);
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("groups")
            .select("data")
            .eq("code", code)
            .maybeSingle();
          if (!error && data && data.data) {
            const value = JSON.stringify(data.data);
            try { localStorage.setItem(cacheKey(code), value); } catch (_) {}
            return { value };
          }
          if (error) console.warn("supabase get error:", error.message);
        } catch (e) {
          console.warn("supabase get exception:", e);
        }
      }
      try {
        const v = localStorage.getItem(cacheKey(code));
        if (v) return { value: v };
      } catch (_) {}
      return null;
    }
    try {
      const v = localStorage.getItem(key);
      return v ? { value: v } : null;
    } catch (_) {
      return null;
    }
  },

  async set(key, value, shared = false) {
    if (shared) {
      const code = codeFrom(key);
      let parsed;
      try {
        parsed = typeof value === "string" ? JSON.parse(value) : value;
      } catch (e) {
        console.error("storage.set: ungueltiges JSON", e);
        throw e;
      }
      try { localStorage.setItem(cacheKey(code), JSON.stringify(parsed)); } catch (_) {}
      if (!supabase) return;
      const { error } = await supabase
        .from("groups")
        .upsert(
          {
            code,
            data: parsed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "code" }
        );
      if (error) {
        console.error("supabase upsert error:", error.message);
        throw error;
      }
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error("storage.set local:", e);
      throw e;
    }
  },

  isSyncAvailable() {
    return !!supabase;
  },
};

if (typeof window !== "undefined") {
  window.storage = storage;
}

export default storage;
