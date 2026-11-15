import { useEffect, useState } from 'react'
import type { AppData } from '../lib/useAppData'
import { db, type HistoryItem } from '../lib/db'
import { CATEGORY_INFO } from '../categories'
import { isValidEan13 } from '../ai/barcode'
import type { WasteCategory } from '../types'

export default function InfoView({
  data,
  clfIndex,
  setClfIndex
}: {
  data: AppData
  clfIndex: number
  setClfIndex: (i: number) => void
}) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [ean, setEan] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const refresh = () => db.history.orderBy('at').reverse().limit(15).toArray().then(setHistory).catch(() => setHistory([]))
  useEffect(() => {
    void refresh()
  }, [])

  async function addEan() {
    const code = ean.trim()
    if (!isValidEan13(code)) {
      setMsg('Neplatný EAN-13 (13 číslic so správnou kontrolnou číslicou).')
      return
    }
    await db.userEans.put({ ean: code, note: 'Pridané ručne' })
    await data.reloadEans()
    setEan('')
    setMsg('EAN uložený.')
  }

  return (
    <div>
      <div className="card">
        <h2>Model rozpoznávania</h2>
        {data.classifiers.map((c, i) => (
          <label key={c.id} className="radio">
            <input type="radio" name="clf" checked={i === Math.min(clfIndex, data.classifiers.length - 1)} onChange={() => setClfIndex(i)} />
            {c.name}
          </label>
        ))}
        {data.classifiers.length === 1 && (
          <p className="muted">Vlastný dotrénovaný model zatiaľ nie je nahraný (viď README, časť Trénovanie).</p>
        )}
      </div>

      <div className="card">
        <h2>Zálohované fľaše (EAN)</h2>
        <p className="muted">
          V zozname je {Object.keys(data.depositEans).length} kódov. Pridaj EAN-13 zo svojej fľaše (13 číslic pod čiarovým kódom).
        </p>
        <div className="row">
          <input className="input" inputMode="numeric" placeholder="napr. 8588001234567" value={ean} onChange={(e) => setEan(e.target.value)} />
          <button className="btn small" onClick={() => void addEan()}>
            Pridať
          </button>
        </div>
        {msg && <p className="muted">{msg}</p>}
      </div>

      <div className="card">
        <h2>Posledné skeny</h2>
        {history.length === 0 && <p className="muted">Zatiaľ nič.</p>}
        {history.map((h) => (
          <div key={h.id} className="hist">
            {CATEGORY_INFO[h.category as WasteCategory]?.emoji ?? '❓'} {CATEGORY_INFO[h.category as WasteCategory]?.name ?? h.category}
            <span className="muted">
              {' '}
              · {h.label} ({(h.confidence * 100).toFixed(0)} %) · {new Date(h.at).toLocaleString('sk-SK')}
            </span>
          </div>
        ))}
        {history.length > 0 && (
          <button className="btn small alt" onClick={() => void db.history.clear().then(refresh)}>
            Vymazať históriu
          </button>
        )}
      </div>

      <div className="card muted">
        <b>EcoSort</b> – diplomová práca, Ekonomická univerzita v Bratislave. Miesta označené „ukážkové dáta“ nie sú reálne.
      </div>
    </div>
  )
}
