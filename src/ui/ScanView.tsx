import { useRef, useState } from 'react'
import type { AppData } from '../lib/useAppData'
import type { Outcome, PointWithDistance } from '../types'
import { CATEGORY_INFO, POINT_TYPE_NAME } from '../categories'
import { analyze, confirmDeposit } from '../ai/pipeline'
import { fileToCanvas } from '../lib/image'
import { appleMapsUrl, formatDistance, getLocation, googleMapsUrl, nearestPoints } from '../data/geo'
import { readText } from '../ai/ocr'
import { db } from '../lib/db'
import { friendlyError } from '../lib/errors'

interface Result {
  outcome: Outcome
  preview: string
  nearby: PointWithDistance[]
  locationInfo: string
  canvas: HTMLCanvasElement
}

export default function ScanView({ data, clfIndex }: { data: AppData; clfIndex: number }) {
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocr, setOcr] = useState<string | null>(null)
  const [eanSaved, setEanSaved] = useState(false)
  const classifier = data.classifiers[Math.min(clfIndex, data.classifiers.length - 1)]

  async function lookup(outcome: Outcome) {
    const key = CATEGORY_INFO[outcome.category].wasteKey
    if (!key) return { nearby: [] as PointWithDistance[], info: '' }
    const loc = await getLocation()
    return { nearby: nearestPoints(data.points, key, loc.lat, loc.lng, 3), info: loc.info }
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setOcr(null)
    setEanSaved(false)
    try {
      setBusy('Načítavam model a analyzujem obrázok… (prvýkrát to trvá dlhšie)')
      const canvas = await fileToCanvas(file)
      const outcome = await analyze(canvas, classifier, data)
      setBusy('Hľadám najbližšie miesto…')
      const { nearby, info } = await lookup(outcome)
      setResult({ outcome, preview: canvas.toDataURL('image/jpeg', 0.7), nearby, locationInfo: info, canvas })
      db.history
        .add({
          at: Date.now(),
          category: outcome.category,
          label: outcome.topLabel,
          confidence: outcome.confidence,
          classifier: outcome.classifierId
        })
        .catch(() => undefined)
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(null)
    }
  }

  async function onConfirmDeposit() {
    if (!result) return
    const o = confirmDeposit(result.outcome)
    const { nearby, info } = await lookup(o)
    setResult({ ...result, outcome: o, nearby, locationInfo: info })
  }

  async function onSaveEan() {
    const ean = result?.outcome.deposit?.ean
    if (!ean) return
    await db.userEans.put({ ean, note: 'Moja fľaša (potvrdená používateľom)' })
    await data.reloadEans()
    setEanSaved(true)
  }

  async function onOcr() {
    if (!result) return
    setBusy('Čítam text z obalu (OCR)…')
    try {
      setOcr((await readText(result.canvas)) || '(text sa nepodarilo prečítať)')
    } catch (e) {
      setOcr('OCR zlyhalo: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(null)
    }
  }

  const o = result?.outcome
  const info = o ? CATEGORY_INFO[o.category] : null

  return (
    <div>
      <div className="card">
        <p className="muted">Model: {classifier.name}</p>
        <div className="row">
          <button className="btn" disabled={!!busy} onClick={() => camRef.current?.click()}>
            📷 Odfotiť odpad
          </button>
          <button className="btn alt" disabled={!!busy} onClick={() => galRef.current?.click()}>
            Z galérie
          </button>
        </div>
        {/* capture otvori priamo kameru na iphone */}
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        <input ref={galRef} type="file" accept="image/*" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        {busy && <p className="busy">⏳ {busy}</p>}
        {error && <p className="err">Chyba: {error}</p>}
      </div>

      {o && info && result && (
        <div className="card">
          <img className="preview" src={result.preview} alt="fotka odpadu" />
          <h2>
            {info.emoji} {info.name}
          </h2>
          <p>
            <b>Kam:</b> {info.where}
          </p>
          <p>{info.advice}</p>
          <p className="muted">
            Rozpoznané: „{o.topLabel}“ ({(o.confidence * 100).toFixed(0)} %), {o.timeMs} ms
          </p>

          {o.deposit && (
            <div className={'box ' + (o.deposit.eligible ? 'good' : 'warn')}>
              {o.deposit.eligible ? (
                <>
                  Zálohovaná fľaša: vráť ju do zálohomatu a dostaneš {o.deposit.depositEur.toFixed(2)} €.
                  {o.deposit.manual && <span> (potvrdené ručne)</span>}
                  {o.deposit.productName && <span> Produkt: {o.deposit.productName}.</span>}
                </>
              ) : (
                <>
                  Čiarový kód {o.deposit.ean ? `${o.deposit.ean} nie je v zozname zálohovaných.` : 'sa nepodarilo prečítať.'}
                  <br />
                  Má fľaša na etikete symbol <b>Z so šípkami</b>?
                  <div className="row">
                    <button className="btn small" onClick={() => void onConfirmDeposit()}>
                      Áno, má symbol
                    </button>
                  </div>
                </>
              )}
              {o.deposit.ean && !eanSaved && (o.deposit.manual || o.deposit.eligible === false) && (
                <button className="btn small alt" onClick={() => void onSaveEan()}>
                  Uložiť tento kód ako zálohovaný
                </button>
              )}
              {eanSaved && <p>Kód uložený.</p>}
            </div>
          )}

          {(o.category === 'BATERIA' || o.category === 'ZIAROVKA') && (
            <div className="box">
              <button className="btn small alt" disabled={!!busy} onClick={() => void onOcr()}>
                🔎 Prečítať text z obalu (OCR)
              </button>
              {ocr && <pre className="ocr">{ocr}</pre>}
            </div>
          )}

          {info.wasteKey && (
            <>
              <h3>Najbližšie miesta</h3>
              <p className="muted">{result.locationInfo}</p>
              {result.nearby.length === 0 && <p>V databáze nie je žiadne zodpovedajúce miesto.</p>}
              {result.nearby.map((p) => (
                <div key={p.id} className="place">
                  <b>{p.name}</b> {p.sample && <span className="tag">ukážkové dáta</span>}
                  <div className="muted">
                    {POINT_TYPE_NAME[p.type]} · {formatDistance(p.distanceKm)} · {p.address}
                  </div>
                  <div className="muted">{p.openingHours}</div>
                  <div className="row">
                    <a className="btn small" href={googleMapsUrl(p)} target="_blank" rel="noreferrer">
                      Google Maps
                    </a>
                    <a className="btn small alt" href={appleMapsUrl(p)} target="_blank" rel="noreferrer">
                      Apple Maps
                    </a>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
