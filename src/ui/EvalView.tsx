import { useState } from 'react'
import type { AppData } from '../lib/useAppData'
import { analyze } from '../ai/pipeline'
import { fileToCanvas } from '../lib/image'
import { friendlyError } from '../lib/errors'
import { buildReport, isCorrect, num2, parseTruth, pct, toCsv, type EvalRow, type Report } from '../eval/evaluation'

// test presnosti: vyber viac fotiek s nazvom TRIEDA__nieco.jpg, appka ich spracuje a vypocita metriky
export default function EvalView({ data, clfIndex }: { data: AppData; clfIndex: number }) {
  const [rows, setRows] = useState<EvalRow[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const classifier = data.classifiers[Math.min(clfIndex, data.classifiers.length - 1)]

  async function run(files: FileList | null) {
    if (!files || files.length === 0) return
    const list = [...files].sort((a, b) => a.name.localeCompare(b.name))
    const out: EvalRow[] = []
    setReport(null)
    for (let i = 0; i < list.length; i++) {
      const f = list[i]
      setProgress(`Spracúvam ${i + 1} / ${list.length}: ${f.name}`)
      const truth = parseTruth(f.name)
      try {
        const canvas = await fileToCanvas(f)
        const o = await analyze(canvas, classifier, data)
        out.push({
          file: f.name,
          truth,
          predicted: o.category,
          label: o.topLabel,
          confidence: o.confidence,
          classifier: o.classifierId,
          ean: o.deposit?.ean ?? '',
          timeMs: o.timeMs
        })
      } catch (e) {
        out.push({
          file: f.name,
          truth,
          predicted: 'CHYBA',
          label: friendlyError(e),
          confidence: 0,
          classifier: classifier.id,
          ean: '',
          timeMs: 0
        })
      }
    }
    setRows(out)
    setReport(buildReport(out))
    setProgress(null)
  }

  async function shareCsv() {
    const csv = toCsv(rows)
    const file = new File([csv], `eval_${classifier.id}_${Date.now()}.csv`, { type: 'text/csv' })
    // otvori zdielanie (ulozit do suborov), inak klasicke stiahnutie
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return
      } catch {
        /* pouzivatel zrusil, skusime stiahnutie */
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="card">
        <h2>Test presnosti</h2>
        <p className="muted">Model: {classifier.name}</p>
        <p>
          Vyber viac fotiek naraz. Názov súboru musí mať tvar <code>TRIEDA__nieco.jpg</code>, napr. <code>PLAST__01.jpg</code>,{' '}
          <code>PAPIER__12.jpg</code>.
        </p>
        <label className="btn">
          Vybrať fotky
          <input type="file" accept="image/*" multiple hidden disabled={!!progress} onChange={(e) => { void run(e.target.files); e.target.value = '' }} />
        </label>
        {progress && <p className="busy">⏳ {progress}</p>}
      </div>

      {report && (
        <div className="card">
          <h3>Výsledky</h3>
          <p>
            Obrázkov: {report.total}, s platnou triedou: {report.scored}, ignorovaných: {report.ignored}
          </p>
          {report.scored === 0 ? (
            <p className="err">Žiadny názov súboru nemá tvar TRIEDA__nieco.jpg.</p>
          ) : (
            <>
              <p className="big">{pct(report.accuracy)}</p>
              <p>
                accuracy ({report.correct} / {report.scored}), 95 % interval: {pct(report.ci[0])} až {pct(report.ci[1])}
              </p>
              <p className="muted">
                Nezaradené (NEZNAME): {report.unknown} · Chyby: {report.errors} · Priemerný čas: {report.avgTimeMs} ms · Makro F1: {num2(report.macroF1)}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Trieda</th>
                    <th>n</th>
                    <th>recall</th>
                    <th>prec.</th>
                    <th>F1</th>
                  </tr>
                </thead>
                <tbody>
                  {report.perClass.map((c) => (
                    <tr key={c.cls}>
                      <td>{c.cls}</td>
                      <td>{c.support}</td>
                      <td>{num2(c.recall)}</td>
                      <td>{num2(c.precision)}</td>
                      <td>{num2(c.f1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.confusions.length > 0 && (
                <>
                  <h3>Najčastejšie zámeny</h3>
                  <ul>
                    {report.confusions.map((c) => (
                      <li key={c.pair}>
                        {c.pair}: {c.count}×
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {report.unmapped.length > 0 && (
                <>
                  <h3>Labely bez mapovania</h3>
                  <p className="muted">Doplň ich do public/data/labelMappings.json</p>
                  <ul>
                    {report.unmapped.map((c) => (
                      <li key={c.label}>
                        {c.label}: {c.count}×
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          <button className="btn" onClick={() => void shareCsv()}>
            Uložiť CSV
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card">
          <h3>Po obrázkoch</h3>
          <table>
            <thead>
              <tr>
                <th>Súbor</th>
                <th>Pravda</th>
                <th>Appka</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.file} className={r.truth === '?' ? '' : isCorrect(r) ? 'ok' : 'bad'}>
                  <td>{r.file}</td>
                  <td>{r.truth}</td>
                  <td>
                    {r.predicted}
                    <div className="muted">{r.label}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
