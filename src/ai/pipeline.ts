import type { DepositInfo, ImageClassifier, Outcome } from '../types'
import { resolveCategory, type LabelMap } from './mapping'
import { readEan } from './barcode'

export interface PipelineData {
  labelMap: LabelMap
  depositEans: Record<string, string>
}

export interface PipelineDeps {
  // injektovatelne kvoli testom
  readEan?: (c: HTMLCanvasElement) => Promise<string | null>
  now?: () => number
}

// cely postup: obrazok -> klasifikator -> mapovanie -> (pri plaste) kontrola zalohy cez ean
export async function analyze(
  canvas: HTMLCanvasElement,
  classifier: ImageClassifier,
  data: PipelineData,
  deps: PipelineDeps = {}
): Promise<Outcome> {
  const now = deps.now ?? (() => performance.now())
  const ean = deps.readEan ?? readEan
  const start = now()
  const predictions = await classifier.classify(canvas)
  const r = resolveCategory(predictions, data.labelMap, classifier.returnsCategories)
  let category = r.category
  let deposit: DepositInfo | null = null

  if (category === 'PLAST' || category === 'PLAST_ZALOHOVANE') {
    let code: string | null = null
    try {
      code = await ean(canvas)
    } catch {
      code = null
    }
    const known = code ? data.depositEans[code] : undefined
    deposit = {
      eligible: Boolean(known),
      ean: code,
      productName: known,
      depositEur: 0.15,
      manual: false
    }
    // custom model moze vratit PLAST_ZALOHOVANE aj bez ean, vtedy ostavame pri plaste dokial nepotvrdi pouzivatel
    category = deposit.eligible ? 'PLAST_ZALOHOVANE' : 'PLAST'
  }

  return {
    category,
    topLabel: r.label,
    confidence: r.confidence,
    predictions,
    classifierId: classifier.id,
    deposit,
    timeMs: Math.round(now() - start)
  }
}

// pouzivatel potvrdil symbol Z so sipkami na fasi
export function confirmDeposit(o: Outcome): Outcome {
  return {
    ...o,
    category: 'PLAST_ZALOHOVANE',
    deposit: {
      eligible: true,
      ean: o.deposit?.ean ?? null,
      productName: o.deposit?.productName,
      depositEur: 0.15,
      manual: true
    }
  }
}
