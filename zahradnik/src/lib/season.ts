export type Season = 'jaro' | 'léto' | 'podzim' | 'zima';

// Přibližné astronomické začátky ročních období (měsíc 1–12, den).
const STARTS: { season: Season; month: number; day: number }[] = [
  { season: 'jaro', month: 3, day: 20 },
  { season: 'léto', month: 6, day: 21 },
  { season: 'podzim', month: 9, day: 22 },
  { season: 'zima', month: 12, day: 21 },
];

export const SEASON_EMOJI: Record<Season, string> = {
  jaro: '🌱',
  léto: '☀️',
  podzim: '🍂',
  zima: '❄️',
};

export function getSeason(date: Date): Season {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  let current: Season = 'zima';
  for (const s of STARTS) {
    if (m > s.month || (m === s.month && d >= s.day)) current = s.season;
  }
  return current;
}

export function daysToNextSeason(date: Date): { season: Season; days: number } {
  const y = date.getFullYear();
  const today = new Date(y, date.getMonth(), date.getDate());
  for (const yr of [y, y + 1]) {
    for (const s of STARTS) {
      const start = new Date(yr, s.month - 1, s.day);
      if (start > today) {
        return { season: s.season, days: Math.round((start.getTime() - today.getTime()) / 86400000) };
      }
    }
  }
  return { season: 'jaro', days: 0 };
}

export const MONTH_NAMES = [
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec',
];

/** Obecné práce na zahradě podle měsíce. */
export const MONTH_TASKS: Record<number, string> = {
  1: 'Plánuj záhony a objednej osivo. Za oblevy setřes sníh z keřů, ať nepolámou větve.',
  2: 'Zimní řez ovocných stromů za bezmrazého dne. Výsev papriky a rajčat na parapet.',
  3: 'Úklid zahrady, jarní hnojení kompostem, první výsevy ven (hrách, mrkev, ředkvičky).',
  4: 'Výsev a výsadba odolnější zeleniny, jarní péče o trávník. Pozor na noční mrazíky.',
  5: 'Po „zmrzlých mužích“ (12.–15. 5.) vysaď teplomilnou zeleninu. Mulčuj.',
  6: 'Pravidelná zálivka, pletí, vyštipování rajčat, sklizeň jahod.',
  7: 'Hlavní sklizeň, zalévání ráno nebo večer, letní řez ovocných stromů.',
  8: 'Sklizeň, výsev podzimní zeleniny, množení jahodníku odnožemi.',
  9: 'Sklizeň ovoce a brambor, zakládání trávníku, výsadba cibulovin.',
  10: 'Sázení česneku a tulipánů, sběr listí na kompost, přenesení citlivých rostlin dovnitř.',
  11: 'Zazimování růží a citlivých trvalek, vypuštění vody z hadic a sudů.',
  12: 'Odpočinek zahrady. Krmení ptáků, kontrola uskladněné úrody.',
};

export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

export function formatDateCz(date: Date): string {
  const days = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  return `${days[date.getDay()]} ${date.getDate()}. ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** Lokální datum ve tvaru YYYY-MM-DD. */
export function isoDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}
