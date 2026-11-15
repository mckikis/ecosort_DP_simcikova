import type { PointType, WasteCategory } from './types'

export interface CategoryInfo {
  name: string
  emoji: string
  // farba nadoby alebo cielove miesto
  where: string
  advice: string
  // kluc druhu odpadu pouzity v acceptedWasteTypes zberných miest; null = staci nadoba
  wasteKey: string | null
}

export const CATEGORY_INFO: Record<WasteCategory, CategoryInfo> = {
  PLAST: {
    name: 'Plast',
    emoji: '🧴',
    where: 'Žltá nádoba',
    advice: 'Fľašu stlač, vyhoď do žltého kontajnera. Ak má symbol zálohovania (Z so šípkami), vráť ju do zálohomatu.',
    wasteKey: null
  },
  PLAST_ZALOHOVANE: {
    name: 'Zálohovaná plastová fľaša',
    emoji: '♻️',
    where: 'Zálohomat v obchode',
    advice: 'Vráť ju v obchode do zálohomatu a dostaneš späť 0,15 €. Čiarový kód musí ostať čitateľný.',
    wasteKey: 'plast_zalohovane'
  },
  PAPIER: {
    name: 'Papier',
    emoji: '📦',
    where: 'Modrá nádoba',
    advice: 'Kartóny rozlož, papier nesmie byť mastný ani mokrý.',
    wasteKey: null
  },
  SKLO: {
    name: 'Sklo',
    emoji: '🍾',
    where: 'Zelená nádoba',
    advice: 'Vyprázdni, kovové vrchnáky daj do kovov. Zálohované sklenené fľaše vráť do obchodu.',
    wasteKey: null
  },
  BIO: {
    name: 'Biologický odpad',
    emoji: '🍌',
    where: 'Hnedá nádoba',
    advice: 'Zvyšky ovocia a zeleniny, záhradný odpad. Bez mäsa a mastných zvyškov.',
    wasteKey: null
  },
  BATERIA: {
    name: 'Batérie',
    emoji: '🔋',
    where: 'Obchod s odberom alebo zberný dvor',
    advice: 'Batérie nepatria do bežného odpadu. Odovzdaj ich v obchode s elektrom alebo na zbernom dvore.',
    wasteKey: 'baterie'
  },
  ZIAROVKA: {
    name: 'Žiarovky',
    emoji: '💡',
    where: 'Zberný dvor',
    advice: 'Úsporné žiarovky obsahujú ortuť, odovzdaj ich na zbernom dvore.',
    wasteKey: 'ziarovka'
  },
  ELEKTROODPAD: {
    name: 'Elektroodpad',
    emoji: '📱',
    where: 'Zberný dvor',
    advice: 'Nefunkčnú elektroniku odovzdaj na zbernom dvore alebo v predajni elektra.',
    wasteKey: 'elektroodpad'
  },
  TEXTIL: {
    name: 'Textil',
    emoji: '👕',
    where: 'Kontajner na textil',
    advice: 'Čisté a suché oblečenie vhoď do kontajnera na textil.',
    wasteKey: 'textil'
  },
  LIEKY: {
    name: 'Lieky',
    emoji: '💊',
    where: 'Lekáreň',
    advice: 'Lieky po záruke vráť do lekárne, nepatria do koša ani do záchoda.',
    wasteKey: 'lieky'
  },
  VELKOOBJEMOVY: {
    name: 'Veľkoobjemový odpad',
    emoji: '🛋️',
    where: 'Zberný dvor alebo veľkoobjemový kontajner',
    advice: 'Nábytok a iný veľký odpad odvez na zberný dvor alebo do prístaveného kontajnera.',
    wasteKey: 'velkoobjemovy'
  },
  NEZNAME: {
    name: 'Nerozpoznané',
    emoji: '❓',
    where: '-',
    advice: 'Skús inú fotku: bližšie, na jednoduchom pozadí a pri dobrom svetle.',
    wasteKey: null
  }
}

export const POINT_TYPE_NAME: Record<PointType, string> = {
  ZBERNY_DVOR: 'Zberný dvor',
  LEKAREN: 'Lekáreň',
  OBCHOD_BATERIE: 'Obchod (batérie)',
  TEXTILNY_KONTAJNER: 'Kontajner na textil',
  RETURNOMAT: 'Zálohomat',
  VEREJNY_KONTAJNER: 'Kontajner'
}
