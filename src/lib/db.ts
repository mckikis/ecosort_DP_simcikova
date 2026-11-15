import Dexie, { type EntityTable } from 'dexie'

export interface HistoryItem {
  id?: number
  at: number
  category: string
  label: string
  confidence: number
  classifier: string
}

export interface UserEan {
  ean: string
  note: string
}

// indexeddb: historia skenov a vlastne ean zalohovanych flias, to zostane v appke aj po zavreti
class EcoDb extends Dexie {
  history!: EntityTable<HistoryItem, 'id'>
  userEans!: EntityTable<UserEan, 'ean'>
  constructor() {
    super('ecosort')
    this.version(1).stores({ history: '++id, at', userEans: 'ean' })
  }
}

export const db = new EcoDb()
