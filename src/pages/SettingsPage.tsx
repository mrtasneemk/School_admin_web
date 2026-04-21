export default function SettingsPage() {
  return (
    <section className="grid">
      <div>
        <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 28 }}>Settings</h1>
        <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
          Administrative settings and system configuration.
        </p>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h3>Timetable</h3>
          <div className="stat">Soon</div>
          <p className="help">Upload and manage timetable versions.</p>
        </div>
        <div className="card">
          <h3>Content Defaults</h3>
          <div className="stat">Soon</div>
          <p className="help">Visibility rules and content settings.</p>
        </div>
        <div className="card">
          <h3>System Flags</h3>
          <div className="stat">Soon</div>
          <p className="help">Miscellaneous ERP settings.</p>
        </div>
      </div>
    </section>
  );
}

