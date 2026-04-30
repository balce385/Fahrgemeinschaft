// ──────────────────────────────────────────────────────────────────
//  main.jsx — Entry-Point der Vite/React App
//  Lädt zuerst den Storage-Adapter (Supabase + localStorage),
//  dann React selbst und rendert die App in #root.
// ──────────────────────────────────────────────────────────────────

import React from "react";
import ReactDOM from "react-dom/client";

// Storage-Adapter erst importieren — er installiert window.storage
import "./lib/storage.js";

// Service Worker registrieren (PWA / Offline)
import { registerSW } from "virtual:pwa-register";

// App-Komponente liegt im Repo-Root
import App from "../Fahrgemeinschaft.jsx";

// Service Worker im Hintergrund aktualisieren
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
