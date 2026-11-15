import type { ImageClassifier, Prediction } from '../types'

const baseUrl = import.meta.env.BASE_URL

// 1) baseline: predtrenovany mobilenet v2 (imagenet, 1000 tried), mapovanie na nase kategorie
export class MobileNetClassifier implements ImageClassifier {
  id = 'mobilenet'
  name = 'MobileNetV2 (predtrénovaný, ImageNet)'
  returnsCategories = false
  private model: import('@tensorflow-models/mobilenet').MobileNet | null = null

  async load() {
    if (this.model) return
    const tf = await import('@tensorflow/tfjs')
    await tf.ready()
    const mobilenet = await import('@tensorflow-models/mobilenet')
    const custom = import.meta.env.VITE_MOBILENET_URL as string | undefined
    this.model = await mobilenet.load(
      custom ? { version: 2, alpha: 1.0, modelUrl: custom } : { version: 2, alpha: 1.0 }
    )
  }

  async classify(source: HTMLCanvasElement): Promise<Prediction[]> {
    await this.load()
    const res = await this.model!.classify(source, 5)
    return res.map((r) => ({ label: r.className, confidence: r.probability }))
  }
}

// 2) vlastny model dotrenovany na odpad (transfer learning, training/train_colab.py)
// subory: public/models/ecosort/model.json + labels.json
export class CustomClassifier implements ImageClassifier {
  id = 'custom'
  name = 'Vlastný model (dotrénovaný MobileNetV2)'
  returnsCategories = true
  private model: import('@tensorflow/tfjs').LayersModel | null = null
  private labels: string[] = []

  static async isAvailable(): Promise<boolean> {
    try {
      const r = await fetch(`${baseUrl}models/ecosort/labels.json`, { cache: 'no-store' })
      if (!r.ok) return false
      // spa fallback moze vratit html, preto kontrolujeme json
      const j = await r.json()
      return Array.isArray(j) && j.length > 0
    } catch {
      return false
    }
  }

  async load() {
    if (this.model) return
    const tf = await import('@tensorflow/tfjs')
    await tf.ready()
    this.labels = await (await fetch(`${baseUrl}models/ecosort/labels.json`)).json()
    this.model = await tf.loadLayersModel(`${baseUrl}models/ecosort/model.json`)
  }

  async classify(source: HTMLCanvasElement): Promise<Prediction[]> {
    await this.load()
    const tf = await import('@tensorflow/tfjs')
    const probs = tf.tidy(() => {
      // normalizacia je sucastou modelu (vrstva Rescaling), tu davame hodnoty 0..255
      const x = tf.image.resizeBilinear(tf.browser.fromPixels(source), [224, 224]).expandDims(0)
      return (this.model!.predict(x) as import('@tensorflow/tfjs').Tensor).squeeze()
    })
    const arr = Array.from(await probs.data())
    probs.dispose()
    return arr
      .map((p, i) => ({ label: this.labels[i] ?? String(i), confidence: p }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
  }
}

export async function availableClassifiers(): Promise<ImageClassifier[]> {
  const list: ImageClassifier[] = []
  if (await CustomClassifier.isAvailable()) list.push(new CustomClassifier())
  list.push(new MobileNetClassifier())
  return list
}
