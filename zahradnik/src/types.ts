export type Category = 'zelenina' | 'ovoce' | 'bylinky' | 'okrasné' | 'trávník';

/** Jak hluboko sahají kořeny – určuje, kolik vody půda „podrží“ pro rostlinu. */
export type RootDepth = 'mělké' | 'střední' | 'hluboké';

export type Sun = 'slunce' | 'polostín' | 'stín';

export type Placement = 'záhon' | 'květináč' | 'skleník';

export interface Plant {
  id: string;
  name: string;
  latin: string;
  emoji: string;
  category: Category;
  /** Plodinový koeficient – násobí referenční výpar (ET₀) v hlavní sezóně. */
  kc: number;
  rootDepth: RootDepth;
  sun: Sun;
  /** Trvalka / dřevina přečká zimu venku. */
  perennial: boolean;
  /** Pod touto teplotou (°C) hrozí poškození – varujeme před mrazem. */
  frostLimit: number;
  /** Měsíce (1–12), kdy rostlina aktivně roste a potřebuje zálivku. */
  activeMonths: number[];
  /** Jak zalévat – krátká rada. */
  watering: string;
  /** Úkoly podle měsíce (1–12). */
  tasks: Partial<Record<number, string>>;
  tips: string[];
  facts: string[];
}

export interface LatLon {
  lat: number;
  lon: number;
}

export interface GardenPlant {
  uid: string;
  plantId: string;
  placement: Placement;
  sun: Sun;
  /** Plocha, kterou rostlina / záhon zabírá (m²). */
  areaM2: number;
  count: number;
  note?: string;
  addedAt: string;
  /** ISO datum poslední zálivky a odhad množství v mm (= l/m²). */
  lastWatered?: string;
  lastWateredMm?: number;
  /** Umístění na plánu zahrady. */
  pos?: LatLon;
  /** Obkreslený záhon (mnohoúhelník) – z něj se počítá plocha. */
  shape?: LatLon[];
}

export interface GardenLocation {
  lat: number;
  lon: number;
  label: string;
}

export interface Garden {
  name: string;
  areaM2: number;
  location?: GardenLocation;
  /** Obkreslené hranice zahrady na satelitní mapě. */
  outline?: LatLon[];
  plants: GardenPlant[];
}

export interface Settings {
  apiKey: string;
  notifyHour: number;
  notifyEnabled: boolean;
}

export interface DayWeather {
  date: string;
  tMax: number;
  tMin: number;
  rain: number;
  et0: number;
  code: number;
  rainChance: number | null;
}

export interface Weather {
  fetchedAt: string;
  current: { temp: number; code: number; wind: number; humidity: number };
  /** Posledních 7 dní (bez dneška), nejstarší první. */
  past: DayWeather[];
  today: DayWeather;
  /** Následujících 6 dní, zítřek první. */
  forecast: DayWeather[];
}
