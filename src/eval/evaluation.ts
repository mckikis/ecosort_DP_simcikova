import { CATEGORIES } from '../types'

// jeden vysledok testu = jeden obrazok
export interface EvalRow {
  file: string
  truth: string // pravdiva trieda z nazvu suboru, alebo "?" ak sa nedala urcit
  predicted: string
  label: string
  confidence: number
  classifier: string
  ean: string
  timeMs: number
}

export const VALID_TRUTH: string[] = CATEGORIES.filter((c) => c !== 'NEZNAME')

// nazov suboru ma tvar TRIEDA__nieco.jpg (napr. PLAST__01.jpg)
export function parseTruth(fileName: string): string {
  if (!fileName.includes('__')) return '?'
  const c = fileName.split('__')[0].trim().toUpperCase()
  return VALID_TRUTH.includes(c) ? c : '?'
}

export const hasTruth = (r: EvalRow) => r.truth !== '?'
export const isCorrect = (r: EvalRow) => hasTruth(r) && r.truth === r.predicted

// 95 % wilsonov interval spolahlivosti pre podiel, vhodny aj pre male vzorky
export function wilson(correct: number, n: number): [number, number] {
  if (n === 0) return [0, 0]
  const z = 1.96
  const p = correct / n
  const denom = 1 + (z * z) / n
  const centre = (p + (z * z) / (2 * n)) / denom
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom
  return [centre - margin, centre + margin]
}

export interface ClassStat {
  cls: string
  support: number
  recall: number | null
  precision: number | null
  f1: number | null
}

export interface Report {
  total: number
  scored: number
  ignored: number
  correct: number
  accuracy: number
  ci: [number, number]
  unknown: number
  errors: number
  avgTimeMs: number
  perClass: ClassStat[]
  macroF1: number | null
  confusions: { pair: string; count: number }[]
  unmapped: { label: string; count: number }[]
  matrix: { classes: string[]; counts: number[][] }
}

export function buildReport(rows: EvalRow[]): Report {
  const scored = rows.filter(hasTruth)
  const correct = scored.filter(isCorrect).length
  const accuracy = scored.length ? correct / scored.length : 0

  const classes = [...new Set([...scored.map((r) => r.truth), ...scored.map((r) => r.predicted)])].sort()
  const perClass: ClassStat[] = classes.map((cls) => {
    const support = scored.filter((r) => r.truth === cls).length
    const predictedCount = scored.filter((r) => r.predicted === cls).length
    const tp = scored.filter((r) => r.truth === cls && r.predicted === cls).length
    const recall = support ? tp / support : null
    const precision = predictedCount ? tp / predictedCount : null
    let f1: number | null = null
    if (support > 0) {
      const p = precision ?? 0
      const r = recall ?? 0
      f1 = p + r === 0 ? 0 : (2 * p * r) / (p + r)
    }
    return { cls, support, recall, precision, f1 }
  })
  const f1s = perClass.filter((c) => c.f1 !== null).map((c) => c.f1 as number)
  const macroF1 = f1s.length ? f1s.reduce((a, b) => a + b, 0) / f1s.length : null

  const countMap = (items: string[]) => {
    const m = new Map<string, number>()
    items.forEach((i) => m.set(i, (m.get(i) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }
  const confusions = countMap(scored.filter((r) => !isCorrect(r)).map((r) => `${r.truth} -> ${r.predicted}`))
    .slice(0, 15)
    .map(([pair, count]) => ({ pair, count }))
  const unmapped = countMap(scored.filter((r) => r.predicted === 'NEZNAME').map((r) => r.label))
    .slice(0, 15)
    .map(([label, count]) => ({ label, count }))

  const counts = classes.map((t) => classes.map((p) => scored.filter((r) => r.truth === t && r.predicted === p).length))

  return {
    total: rows.length,
    scored: scored.length,
    ignored: rows.length - scored.length,
    correct,
    accuracy,
    ci: wilson(correct, scored.length),
    unknown: scored.filter((r) => r.predicted === 'NEZNAME').length,
    errors: scored.filter((r) => r.predicted === 'CHYBA').length,
    avgTimeMs: rows.length ? Math.round(rows.reduce((s, r) => s + r.timeMs, 0) / rows.length) : 0,
    perClass,
    macroF1,
    confusions,
    unmapped,
    matrix: { classes, counts }
  }
}

const q = (s: string) => '"' + s.replace(/"/g, '""') + '"'

export function toCsv(rows: EvalRow[]): string {
  const head = 'file,truth,predicted,label,confidence,classifier,ean,time_ms,correct'
  const lines = rows.map((r) =>
    [q(r.file), r.truth, r.predicted, q(r.label), r.confidence.toFixed(3), r.classifier, r.ean, r.timeMs, isCorrect(r)].join(',')
  )
  return [head, ...lines].join('\n')
}

export const pct = (v: number | null) => (v === null ? '-' : (v * 100).toFixed(1) + ' %')
export const num2 = (v: number | null) => (v === null ? '-' : v.toFixed(2))
