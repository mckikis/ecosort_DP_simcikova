import type { CollectionPoint, PointWithDistance } from '../types'

// stred bratislavy, pouzije sa ak poloha nie je dostupna
export const BRATISLAVA_CENTRE = { lat: 48.1486, lng: 17.1077 }

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0088
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

// najblizsie miesta, ktore prijimaju dany druh odpadu (wasteKey)
export function nearestPoints(
  points: CollectionPoint[],
  wasteKey: string,
  lat: number,
  lng: number,
  limit = 3
): PointWithDistance[] {
  return points
    .filter((p) => p.acceptedWasteTypes.includes(wasteKey))
    .map((p) => ({ ...p, distanceKm: haversineKm(lat, lng, p.latitude, p.longitude) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`
}

export function googleMapsUrl(p: { latitude: number; longitude: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`
}

export function appleMapsUrl(p: { latitude: number; longitude: number }): string {
  return `https://maps.apple.com/?daddr=${p.latitude},${p.longitude}`
}

export interface LocationResult {
  lat: number
  lng: number
  // popis pre pouzivatela, odkial poloha pochadza
  info: string
  real: boolean
}

// poloha z gps, pri chybe nahradna poloha v bratislave
export function getLocation(timeoutMs = 10000): Promise<LocationResult> {
  const fallback = (why: string): LocationResult => ({
    lat: BRATISLAVA_CENTRE.lat,
    lng: BRATISLAVA_CENTRE.lng,
    info: `Použitá poloha: stred Bratislavy (${why})`,
    real: false
  })
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(fallback('zariadenie nemá GPS'))
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          info: `Použitá poloha: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (presnosť ${Math.round(pos.coords.accuracy)} m)`,
          real: true
        }),
      (err) => resolve(fallback(err.code === 1 ? 'poloha nepovolená' : 'poloha nedostupná')),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
    )
  })
}
