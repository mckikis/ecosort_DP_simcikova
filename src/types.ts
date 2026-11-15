// spolocne typy pre celu appku

export const CATEGORIES = [
  'PLAST',
  'PLAST_ZALOHOVANE',
  'PAPIER',
  'SKLO',
  'BIO',
  'BATERIA',
  'ZIAROVKA',
  'ELEKTROODPAD',
  'TEXTIL',
  'LIEKY',
  'VELKOOBJEMOVY',
  'NEZNAME'
] as const

export type WasteCategory = (typeof CATEGORIES)[number]

export type PointType =
  | 'VEREJNY_KONTAJNER'
  | 'ZBERNY_DVOR'
  | 'LEKAREN'
  | 'OBCHOD_BATERIE'
  | 'TEXTILNY_KONTAJNER'
  | 'RETURNOMAT'

export interface CollectionPoint {
  id: string
  name: string
  type: PointType
  acceptedWasteTypes: string[]
  latitude: number
  longitude: number
  address: string
  openingHours: string
  // true = ukazkove data, nie realne miesto
  sample?: boolean
}

export interface PointWithDistance extends CollectionPoint {
  distanceKm: number
}

export interface Prediction {
  label: string
  confidence: number
}

// jeden klasifikator = jeden sposob ako z obrazka dostat zoznam predikcii
export interface ImageClassifier {
  id: string
  name: string
  // true ak labely uz su nase kategorie (vlastny model), false ak treba mapovanie (imagenet)
  returnsCategories: boolean
  load(): Promise<void>
  classify(source: HTMLCanvasElement): Promise<Prediction[]>
}

export interface DepositInfo {
  eligible: boolean
  ean: string | null
  productName?: string
  depositEur: number
  // true ak zalohu potvrdil pouzivatel rucne (symbol Z so sipkami)
  manual: boolean
}

export interface Outcome {
  category: WasteCategory
  topLabel: string
  confidence: number
  predictions: Prediction[]
  classifierId: string
  deposit: DepositInfo | null
  timeMs: number
}
