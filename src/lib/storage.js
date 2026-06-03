// ──────────────────────────────────────────────────────────────────
//  storage.js  ·  TIER 2  (E-Mail-Login + Row Level Security)
//  ----------------------------------------------------------------
//  Implementiert window.storage als Bruecke zwischen
//    - localStorage (fuer geraetespezifische Einstellungen + Offline-Cache)
//    - Supabase     (fuer die geteilten Gruppen-Daten)
//
//  Die App ruft:
//    window.storage.get(key, shared?)        -> { value: string } | null
//    window.storage.set(key, json, shared?)
//
//  TIER 2 zusaetzlich (window.storage.auth.*):
//    requireLogin            -> boolean  (true => Login-Gate aktiv)
//    signInWithEmail(email)  -> { error }            (Magic-Link)
//    getSession()            -> session | null
//    onChange(cb)            -> unsubscribe()
//    signOut()
//    createGroup(code, grp)  -> legt Gruppe an, Ersteller·in = Admin
//    claimMember(code, mid)  -> verbindet User mit member.id
//    isGroupAdmin(code)      -> boolean
//
//  Keys mit Prefix "group:" landen in Supabase (Tabelle public.groups),
//  alles andere bleibt lokal auf dem Geraet.
// ──────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Tier 2 standardmaessig an, sobald Supabase konfiguriert ist.
// Mit VITE_REQUIRE_LOGIN=false faellt die App auf Tier 1 (Solo/Code) zurueck.
const REQUIRE_LOGIN =
  String(import.meta.env.VITE_REQUIRE_LOGIN ?? "true") !== "false";

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Tier 2 braucht eine echte, persistente Session fuer den Magic-Link.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
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

// Login nur erzwingen, wenn Supabase wirklich da ist.
const LOGIN_ACTIVE = REQUIRE_LOGIN && !!supabase;

function codeFrom(key) {
  return key.startsWith("group:") ? key.slice(6) : key;
}
function cacheKey(code) {
  return `fg:groupcache:${code}`;
}
async function currentUserId() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch (_) {
    return null;
  }
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
      // Offline-Fallback auf den letzten bekannten Stand.
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

      const row = { data: parsed, updated_at: new Date().toISOString() };

      if (LOGIN_ACTIVE) {
        // Tier 2: Anlegen passiert ausschliesslich ueber create_group() (RPC),
        // damit owner_id gesetzt wird. Hier nur UPDATE -- so greift die
        // INSERT-Policy nicht und der Upsert-mit-RLS-Fallstrick entfaellt.
        const { error } = await supabase
          .from("groups")
          .update(row)
          .eq("code", code);
        if (error) {
          console.error("supabase update error:", error.message);
          throw error;
        }
        return;
      }

      // Tier 1: offenes Upsert (kein RLS / kein Owner).
      const { error } = await supabase
        .from("groups")
        .upsert({ code, ...row }, { onConflict: "code" });
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

  // ── TIER 2: Auth ──────────────────────────────────────────────────
  // Nur vorhanden, wenn Supabase konfiguriert ist. requireLogin steuert,
  // ob die App das Login-Gate zeigt (siehe App() in Fahrgemeinschaft.jsx).
  auth: supabase
    ? {
        requireLogin: LOGIN_ACTIVE,

        async signInWithEmail(email) {
          try {
            const { error } = await supabase.auth.signInWithOtp({
              email,
              options: { emailRedirectTo: window.location.origin },
            });
            return { error: error ? error.message : null };
          } catch (e) {
            return { error: e.message || String(e) };
          }
        },

        async getSession() {
          const { data } = await supabase.auth.getSession();
          return data?.session ?? null;
        },

        onChange(cb) {
          const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            cb(session ?? null);
          });
          return () => {
            try { data.subscription.unsubscribe(); } catch (_) {}
          };
        },

        async signOut() {
          try { await supabase.auth.signOut(); } catch (e) { console.warn("signOut", e); }
        },

        // Gruppe anlegen: Ersteller·in wird per RPC zur·zum Eigentümer·in (Admin).
        async createGroup(code, grp) {
          const data = typeof grp === "string" ? JSON.parse(grp) : grp;
          try { localStorage.setItem(cacheKey(code), JSON.stringify(data)); } catch (_) {}
          const { error } = await supabase.rpc("create_group", {
            p_code: code,
            p_data: data,
          });
          if (error) {
            console.error("create_group error:", error.message);
            throw error;
          }
          return { ok: true };
        },

        // Eigenen Platz in der Gruppe beanspruchen (User <-> member.id).
        async claimMember(code, memberId) {
          const uid = await currentUserId();
          if (!uid) return { error: "nicht angemeldet" };
          const { error } = await supabase
            .from("group_members")
            .upsert(
              { code, user_id: uid, member_id: memberId },
              { onConflict: "code,user_id" }
            );
          if (error) {
            console.warn("claimMember error:", error.message);
            return { error: error.message };
          }
          return { ok: true };
        },

        // Ist die·der aktuelle User Eigentümer·in (Admin) der Gruppe?
        async isGroupAdmin(code) {
          const uid = await currentUserId();
          if (!uid) return false;
          const { data, error } = await supabase
            .from("groups")
            .select("owner_id")
            .eq("code", code)
            .maybeSingle();
          if (error || !data) return false;
          return data.owner_id === uid;
        },
      }
    : null,
};

if (typeof window !== "undefined") {
  window.storage = storage;
}

export default storage;
