export default function ConfigError () {
  return (
    <div className="onboarding">
      <div className="card">
        <h1>Supabase-Konfiguration fehlt</h1>
        <p>
          Die Datei <code>.env</code> existiert nicht oder ist leer.
          Erstelle sie im Projekt-Hauptverzeichnis (neben{' '}
          <code>package.json</code>) mit folgendem Inhalt:
        </p>
        <pre className="codeblock">
{`VITE_SUPABASE_URL=https://abcdef.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...dein-langer-key...`}
        </pre>
        <p>
          Beide Werte findest du in deinem Supabase-Projekt unter{' '}
          <strong>Project Settings → API</strong>. Danach den Dev-Server
          (<code>npm run dev</code>) neu starten.
        </p>
      </div>
    </div>
  )
}
