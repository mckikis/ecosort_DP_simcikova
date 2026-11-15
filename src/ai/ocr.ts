// ocr textu z obalu (baterie, ziarovky); kniznica sa nacita az ked ju pouzivatel pouzije
export async function readText(canvas: HTMLCanvasElement): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('slk+eng')
  try {
    const { data } = await worker.recognize(canvas)
    return data.text.trim()
  } finally {
    await worker.terminate()
  }
}
