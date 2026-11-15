import { useEffect, useState } from 'react'
import type { CollectionPoint, ImageClassifier } from '../types'
import type { LabelMap } from '../ai/mapping'
import { availableClassifiers } from '../ai/classifiers'
import { db } from './db'

export interface AppData {
  labelMap: LabelMap
  points: CollectionPoint[]
  depositEans: Record<string, string>
  classifiers: ImageClassifier[]
  reloadEans: () => Promise<void>
}

const base = import.meta.env.BASE_URL

async function getJson<T>(name: string): Promise<T> {
  const r = await fetch(`${base}data/${name}`)
  if (!r.ok) throw new Error(`nepodarilo sa nacitat ${name}`)
  return r.json() as Promise<T>
}

// nacita staticke data (json) + vlastne ean z indexeddb + dostupne klasifikatory
export function useAppData(): { data: AppData | null; error: string | null } {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [labelMap, points, eans, classifiers] = await Promise.all([
          getJson<LabelMap>('labelMappings.json'),
          getJson<CollectionPoint[]>('collectionPoints.json'),
          getJson<Record<string, string>>('depositBarcodes.json'),
          availableClassifiers()
        ])
        const merge = async () => {
          const user = await db.userEans.toArray().catch(() => [])
          const all = { ...eans }
          user.forEach((u) => (all[u.ean] = u.note || 'Moja fľaša'))
          return all
        }
        const depositEans = await merge()
        if (cancelled) return
        const reloadEans = async () => {
          const fresh = await merge()
          setData((d) => (d ? { ...d, depositEans: fresh } : d))
        }
        setData({ labelMap, points, depositEans, classifiers, reloadEans })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, error }
}
