const TABS = [
  { id: 'week',     label: 'Woche',      icon: '📅' },
  { id: 'members',  label: 'Mitglieder', icon: '👥' },
  { id: 'absences', label: 'Frei',       icon: '🏖️' },
  { id: 'more',     label: 'Mehr',       icon: '⋯'  }
]

export default function TabBar ({ current, onChange }) {
  return (
    <nav className="tabbar" role="tablist">
      {TABS.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={current === t.id}
          className={'tab ' + (current === t.id ? 'tab-on' : '')}
          onClick={() => onChange(t.id)}
        >
          <span className="tab-icon" aria-hidden>{t.icon}</span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
