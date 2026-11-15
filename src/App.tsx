import { useState } from 'react'
import { useAppData } from './lib/useAppData'
import ScanView from './ui/ScanView'
import EvalView from './ui/EvalView'
import InfoView from './ui/InfoView'

type Tab = 'scan' | 'quiz' | 'eval' | 'info'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'scan', label: 'Skenovať', icon: '📷' },
  { id: 'eval', label: 'Test', icon: '📊' },
  { id: 'info', label: 'Info', icon: 'ℹ️' }
]

export default function App() {
  const [tab, setTab] = useState<Tab>('scan')
  // index vybraneho klasifikatora (0 = vlastny model ak existuje, inak baseline)
  const [clfIndex, setClfIndex] = useState(0)
  const { data, error } = useAppData()

  return (
    <div className="app">
      <header className="top">
        <h1>EcoSort</h1>
        <span className="sub">triedenie odpadu</span>
      </header>
      <main className="content">
        {error && <p className="card err">Chyba pri načítaní dát: {error}</p>}
        {!data && !error && <p className="card">Načítavam…</p>}
        {data && tab === 'scan' && <ScanView data={data} clfIndex={clfIndex} />}

        {data && tab === 'eval' && <EvalView data={data} clfIndex={clfIndex} />}
        {data && tab === 'info' && <InfoView data={data} clfIndex={clfIndex} setClfIndex={setClfIndex} />}
      </main>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === tab ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
