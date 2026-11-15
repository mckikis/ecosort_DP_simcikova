import { CATEGORIES, type Prediction, type WasteCategory } from '../types'

export type LabelMap = Record<string, string>

export const MIN_CONFIDENCE = 0.1

// imagenet label vyzera ako "water bottle" alebo "pop bottle, soda bottle", synonyma oddelene ciarkou
export function labelParts(label: string): string[] {
  return label
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function isCategory(x: string): x is WasteCategory {
  return (CATEGORIES as readonly string[]).includes(x)
}

export interface Resolved {
  category: WasteCategory
  label: string
  confidence: number
}

// vrati prvu predikciu (od najvyssej), ktora ma mapovanie a dost vysoku istotu
// returnsCategories = true pre vlastny model: label uz je nazov kategorie
export function resolveCategory(
  predictions: Prediction[],
  map: LabelMap,
  returnsCategories: boolean,
  minConfidence = MIN_CONFIDENCE
): Resolved {
  const sorted = [...predictions].sort((a, b) => b.confidence - a.confidence)
  const top = sorted[0]
  for (const p of sorted) {
    if (p.confidence < minConfidence) break
    if (returnsCategories) {
      const up = p.label.trim().toUpperCase()
      if (isCategory(up)) return { category: up, label: p.label, confidence: p.confidence }
      continue
    }
    for (const part of labelParts(p.label)) {
      const cat = map[part]
      if (cat && isCategory(cat)) return { category: cat, label: p.label, confidence: p.confidence }
    }
  }
  return {
    category: 'NEZNAME',
    label: top ? top.label : '-',
    confidence: top ? top.confidence : 0
  }
}
