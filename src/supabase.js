// Supabase-Client + Storage-Wrapper.
//
// Stellt dieselbe API wie window.storage im Claude-Artifact bereit
// (get/set), damit der App-Code unverändert bleibt:
//
//   await window.storage.set("fg:local:v3", json)        → localStorage
//   await window.storage.set("group:K7XQ4M", json, true) → Supabase
//
// Realtime: bei Tabellen-Änderungen werden Listener live benachrichtigt
// (siehe subscribeToGroup unten).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ Supabase-Konfiguration fehlt. Lege eine .env-Datei an mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 2 } },
});

// ─────────────────────────────────────────────────────────────────────
// Schlüssel-Schema:
//   "fg:local:v3"        → lokal (localStorage)
//   "group:CODE"         → geteilt (Supabase)
//   "fg:state:v2"        → legacy lokal (localStorage)
// ─────────────────────────────────────────────────────────────────────

function isGroupKey(key) {
  return typeof key === "string" && key.startsWith("group:");
}
function codeFromKey(key) {
  return key.slice("group:".length);
}

// Drop-in-Ersatz für window.storage. Behält dieselbe Signatur.
const storage = {
  async get(key, shared = false) {
    if (shared || isGroupKey(key)) {
      const code = codeFromKey(key);
      const { data, error } = await supabase
        .from("groups")
        .select("data")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { key, value: JSON.stringify(data.data), shared: true };
    }
    // Lokal
    try {
      const v = window.localStorage.getItem(key);
      if (v == null) return null;
      return { key, value: v, shared: false };
    } catch {
      return null;
    }
  },

  async set(key, value, shared = false) {
    if (shared || isGroupKey(key)) {
      const code = codeFromKey(key);
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
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
      if (error) throw error;
      return { key, value: JSON.stringify(parsed), shared: true };
    }
    // Lokal
    try {
      window.localStorage.setItem(key, value);
      return { key, value, shared: false };
    } catch (e) {
      console.error("localStorage.setItem failed", e);
      return null;
    }
  },

  async delete(key, shared = false) {
    if (shared || isGroupKey(key)) {
      const code = codeFromKey(key);
      const { error } = await supabase.from("groups").delete().eq("code", code);
      if (error) throw error;
      return { key, deleted: true, shared: true };
    }
    try {
      window.localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    } catch {
      return null;
    }
  },

  async list() {
    return { keys: [] };
  },
};

// In das globale window-Objekt einhängen, damit der bestehende
// App-Code (window.storage.get/set) ohne Umbau funktioniert.
if (typeof window !== "undefined") {
  window.storage = storage;
}

export { storage };

// ─────────────────────────────────────────────────────────────────────
// Realtime: lauscht auf Live-Änderungen einer Gruppe.
// Wird in App.jsx aufgerufen, sobald eine Gruppe aktiv ist.
// ─────────────────────────────────────────────────────────────────────
export function subscribeToGroup(code, onUpdate) {
  if (!code) return () => {};
  const channel = supabase
    .channel(`group-${code}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "groups",
        filter: `code=eq.${code}`,
      },
      (payload) => {
        if (payload.new?.data) onUpdate(payload.new.data);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
