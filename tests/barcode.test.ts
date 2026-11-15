import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { readBarcodes, setZXingModuleOverrides } from 'zxing-wasm/reader'
import { isValidEan13 } from '../src/ai/barcode'

// kodovacie tabulky ean-13
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100']
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

function ean13Modules(code: string): string {
  const d = code.split('').map(Number)
  const par = PARITY[d[0]]
  let bits = '101'
  for (let i = 0; i < 6; i++) bits += (par[i] === 'L' ? L : G)[d[i + 1]]
  bits += '01010'
  for (let i = 0; i < 6; i++) bits += R[d[i + 7]]
  return bits + '101'
}

// vyrobi obrazok (siva skala -> rgba) s ciarovym kodom, 3 px na modul
function barcodeImage(code: string, scale = 3, height = 80) {
  const bits = '0'.repeat(12) + ean13Modules(code) + '0'.repeat(12)
  const w = bits.length * scale
  const data = new Uint8ClampedArray(w * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < w; x++) {
      const v = bits[Math.floor(x / scale)] === '1' ? 0 : 255
      const o = (y * w + x) * 4
      data[o] = data[o + 1] = data[o + 2] = v
      data[o + 3] = 255
    }
  return { data, width: w, height, colorSpace: 'srgb' } as unknown as ImageData
}

describe('ean', () => {
  it('kontrolna cislica', () => {
    expect(isValidEan13('4006381333931')).toBe(true)
    expect(isValidEan13('4006381333932')).toBe(false)
    expect(isValidEan13('123')).toBe(false)
  })
  it('zxing precita vygenerovany ean-13', async () => {
    // v node nacitame wasm priamo zo suboru
    const wasmBinary = readFileSync('node_modules/zxing-wasm/dist/reader/zxing_reader.wasm')
    setZXingModuleOverrides({ wasmBinary: wasmBinary.buffer.slice(wasmBinary.byteOffset, wasmBinary.byteOffset + wasmBinary.byteLength) as ArrayBuffer })
    const res = await readBarcodes(barcodeImage('4006381333931'), { formats: ['EAN-13'], tryHarder: true })
    expect(res[0]?.text).toBe('4006381333931')
  })
})
