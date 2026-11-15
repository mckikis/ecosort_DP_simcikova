// citanie ciaroveho kodu EAN-13 z obrazka (zxing-wasm, funguje aj na iphone)
import { readBarcodes, setZXingModuleOverrides } from 'zxing-wasm/reader'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

let configured = false

function configure() {
  if (configured) return
  // wasm subor je sucastou buildu >  appka ide aj offline
  setZXingModuleOverrides({
    locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path)
  })
  configured = true
}

export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  const d = code.split('').map(Number)
  const sum = d.slice(0, 12).reduce((s, v, i) => s + v * (i % 2 === 0 ? 1 : 3), 0)
  return (10 - (sum % 10)) % 10 === d[12]
}

export async function readEan(canvas: HTMLCanvasElement): Promise<string | null> {
  configure()
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const results = await readBarcodes(data, {
    formats: ['EAN-13', 'EAN-8', 'UPC-A'],
    tryHarder: true,
    tryRotate: true,
    maxNumberOfSymbols: 1
  })
  const hit = results.find((r) => r.isValid && r.text)
  return hit ? hit.text : null
}
