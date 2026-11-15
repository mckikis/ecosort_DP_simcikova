import { describe, expect, it } from 'vitest'
import { resolveCategory } from '../src/ai/mapping'
import { analyze } from '../src/ai/pipeline'
import { haversineKm, nearestPoints } from '../src/data/geo'
import { buildReport, parseTruth, toCsv, wilson, type EvalRow } from '../src/eval/evaluation'
import { shuffle } from '../src/data/quiz'
import type { CollectionPoint, ImageClassifier } from '../src/types'
import labelMap from '../public/data/labelMappings.json'
import points from '../public/data/collectionPoints.json'

describe('mapping', () => {
  it('mapuje imagenet label so synonymami', () => {
    const r = resolveCategory([{ label: 'pop bottle, soda bottle', confidence: 0.8 }], labelMap, false)
    expect(r.category).toBe('PLAST')
  })
  it('preskoci nemapovany label a vezme dalsi', () => {
    const r = resolveCategory(
      [
        { label: 'sea slug', confidence: 0.5 },
        { label: 'banana', confidence: 0.3 }
      ],
      labelMap,
      false
    )
    expect(r.category).toBe('BIO')
  })
  it('pod prahom istoty vrati NEZNAME', () => {
    const r = resolveCategory([{ label: 'banana', confidence: 0.05 }], labelMap, false)
    expect(r.category).toBe('NEZNAME')
  })
  it('vlastny model vracia priamo kategorie', () => {
    const r = resolveCategory([{ label: 'papier', confidence: 0.9 }], {}, true)
    expect(r.category).toBe('PAPIER')
    expect(resolveCategory([{ label: 'xyz', confidence: 0.9 }], {}, true).category).toBe('NEZNAME')
  })
  it('vsetky hodnoty mapovania su platne kategorie', () => {
    const valid = ['PLAST', 'PAPIER', 'SKLO', 'BIO', 'BATERIA', 'ZIAROVKA', 'ELEKTROODPAD', 'TEXTIL', 'LIEKY', 'VELKOOBJEMOVY']
    Object.values(labelMap).forEach((v) => expect(valid).toContain(v))
  })
})

describe('pipeline', () => {
  const fakeClf = (label: string): ImageClassifier => ({
    id: 'fake',
    name: 'fake',
    returnsCategories: false,
    load: async () => undefined,
    classify: async () => [{ label, confidence: 0.9 }]
  })
  const canvas = {} as HTMLCanvasElement
  const data = { labelMap, depositEans: { '8588001234567': 'Test fľaša' } }

  it('plast so zalohovanym ean -> PLAST_ZALOHOVANE', async () => {
    const o = await analyze(canvas, fakeClf('water bottle'), data, { readEan: async () => '8588001234567', now: () => 0 })
    expect(o.category).toBe('PLAST_ZALOHOVANE')
    expect(o.deposit?.eligible).toBe(true)
  })
  it('plast s neznamym ean -> PLAST', async () => {
    const o = await analyze(canvas, fakeClf('water bottle'), data, { readEan: async () => '4006381333931', now: () => 0 })
    expect(o.category).toBe('PLAST')
    expect(o.deposit?.eligible).toBe(false)
  })
  it('plast bez ciaroveho kodu -> PLAST, bez padu', async () => {
    const o = await analyze(canvas, fakeClf('water bottle'), data, {
      readEan: async () => {
        throw new Error('zlyhalo')
      },
      now: () => 0
    })
    expect(o.category).toBe('PLAST')
  })
  it('ine kategorie nehladaju ean', async () => {
    let called = false
    const o = await analyze(canvas, fakeClf('banana'), data, {
      readEan: async () => {
        called = true
        return null
      },
      now: () => 0
    })
    expect(o.category).toBe('BIO')
    expect(called).toBe(false)
    expect(o.deposit).toBeNull()
  })
})

describe('geo', () => {
  it('haversine: bratislava - viedan je asi 55 km', () => {
    const d = haversineKm(48.1486, 17.1077, 48.2082, 16.3738)
    expect(d).toBeGreaterThan(53)
    expect(d).toBeLessThan(57)
  })
  it('haversine: rovnaky bod = 0', () => {
    expect(haversineKm(48, 17, 48, 17)).toBeCloseTo(0, 6)
  })
  // hodnoty z tabulky v navode (bod A a C), nezavisle vypocitane v pythone
  it('najblizsi zalohomat z bodu A', () => {
    const r = nearestPoints(points as CollectionPoint[], 'plast_zalohovane', 48.1585, 17.1068, 2)
    expect(r[0].id).toBe('returnomat_test_01')
    expect(r[0].distanceKm).toBeCloseTo(1.1, 1)
    expect(r[1].distanceKm).toBeCloseTo(3.45, 1)
  })
  it('baterie z bodu C: najblizsi zberny dvor 3.13 km', () => {
    const r = nearestPoints(points as CollectionPoint[], 'baterie', 48.157, 17.128, 3)
    expect(r[0].id).toBe('zd_test_01')
    expect(r[0].distanceKm).toBeCloseTo(3.13, 1)
  })
  it('druh bez miesta vrati prazdny zoznam', () => {
    expect(nearestPoints(points as CollectionPoint[], 'neexistuje', 48, 17)).toEqual([])
  })
})

describe('evaluacia', () => {
  const row = (file: string, truth: string, predicted: string, label = 'x'): EvalRow => ({
    file, truth, predicted, label, confidence: 0.5, classifier: 't', ean: '', timeMs: 10
  })
  it('parseTruth', () => {
    expect(parseTruth('PLAST__01.jpg')).toBe('PLAST')
    expect(parseTruth('plast_zalohovane__a.jpg')).toBe('PLAST_ZALOHOVANE')
    expect(parseTruth('IMG_0001.jpg')).toBe('?')
    expect(parseTruth('NEZNAME__1.jpg')).toBe('?')
    expect(parseTruth('KOVY__1.jpg')).toBe('?')
  })
  it('wilson interval', () => {
    const [lo, hi] = wilson(8, 10)
    expect(lo).toBeCloseTo(0.4902, 3)
    expect(hi).toBeCloseTo(0.9433, 3)
    expect(wilson(0, 0)).toEqual([0, 0])
  })
  it('report: accuracy, f1, zamena', () => {
    const rows = [
      row('PLAST__1.jpg', 'PLAST', 'PLAST'),
      row('PLAST__2.jpg', 'PLAST', 'PLAST'),
      row('PLAST__3.jpg', 'PLAST', 'SKLO'),
      row('SKLO__1.jpg', 'SKLO', 'SKLO'),
      row('foto.jpg', '?', 'PLAST'),
      row('PAPIER__1.jpg', 'PAPIER', 'NEZNAME', 'sea slug')
    ]
    const r = buildReport(rows)
    expect(r.total).toBe(6)
    expect(r.scored).toBe(5)
    expect(r.ignored).toBe(1)
    expect(r.correct).toBe(3)
    expect(r.accuracy).toBeCloseTo(0.6)
    expect(r.unknown).toBe(1)
    expect(r.unmapped[0]).toEqual({ label: 'sea slug', count: 1 })
    const plast = r.perClass.find((c) => c.cls === 'PLAST')!
    expect(plast.recall).toBeCloseTo(2 / 3)
    expect(plast.precision).toBe(1)
    const sklo = r.perClass.find((c) => c.cls === 'SKLO')!
    expect(sklo.precision).toBeCloseTo(0.5)
    expect(r.confusions.map((c) => c.pair)).toContain('PLAST -> SKLO')
    // nezname predikcie bez pravdy (NEZNAME) nemaju f1
    expect(r.perClass.find((c) => c.cls === 'NEZNAME')!.f1).toBeNull()
  })
  it('csv ma hlavicku a riadky', () => {
    const csv = toCsv([row('a,b.jpg', 'PLAST', 'PLAST', 'say "hi"')])
    expect(csv.split('\n')[0]).toContain('file,truth')
    expect(csv).toContain('"a,b.jpg"')
    expect(csv).toContain('"say ""hi"""')
    expect(csv.trim().endsWith('true')).toBe(true)
  })
})

describe('kviz', () => {
  it('shuffle zachova prvky', () => {
    const a = [1, 2, 3, 4, 5]
    expect(shuffle(a).sort()).toEqual(a)
  })
})
