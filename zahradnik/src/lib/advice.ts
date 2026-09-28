import { GENERAL_FACTS, GENERAL_TIPS, getPlant } from '../data/plants';
import { GardenPlant, Plant, RootDepth, Weather } from '../types';
import { dayOfYear, isoDate } from './season';

export type WaterVerdict = 'zalij' | 'zkontroluj' | 'nezalévej' | 'odpočívá' | 'zalito';

export interface PlantAdvice {
  gardenPlant: GardenPlant;
  plant: Plant;
  verdict: WaterVerdict;
  /** Hlavní věta pro uživatele. */
  headline: string;
  /** Doplňující vysvětlení (proč). */
  reason: string;
  litres: number;
  mm: number;
  warnings: string[];
  task?: string;
}

/** Kolik vody (mm) je půda schopná „podržet“ v dosahu kořenů, než rostlina začne trpět. */
const BUFFER_MM: Record<RootDepth, number> = { mělké: 8, střední: 14, hluboké: 25 };

const SUN_FACTOR = { slunce: 1, polostín: 0.8, stín: 0.6 } as const;

/** Déšť pod 2 mm se odpaří z listů a povrchu, do půdy se nedostane. */
function effectiveRain(mm: number): number {
  return mm < 2 ? 0 : mm * 0.8;
}

const LOOKBACK_DAYS = 5;

export function adviseForPlant(gp: GardenPlant, weather: Weather, now: Date): PlantAdvice | null {
  const plant = getPlant(gp.plantId);
  if (!plant) return null;

  const month = now.getMonth() + 1;
  const today = isoDate(now);
  const warnings: string[] = [];
  const next3 = [weather.today, ...weather.forecast.slice(0, 2)];
  const inGreenhouse = gp.placement === 'skleník';
  const inPot = gp.placement === 'květináč';

  const active = plant.activeMonths.includes(month);

  // ── Mráz / chlad ── (jednoletky mimo sezónu na zahradě nejsou, nevarujeme)
  const coldest = Math.min(...next3.map((d) => d.tMin));
  const shelter = inGreenhouse ? 3 : 0;
  if ((active || plant.perennial) && coldest + shelter <= plant.frostLimit + 1) {
    const when = next3.find((d) => d.tMin === coldest);
    warnings.push(
      `🥶 ${coldest <= 0 ? 'Mráz' : 'Chladná noc'} ${Math.round(coldest)} °C (${when ? relDay(when.date, today) : 'brzy'}) – ` +
        (inPot
          ? 'přenes květináč do tepla nebo pod střechu.'
          : plant.perennial
            ? 'přikryj netkanou textilií nebo chvojím.'
            : 'zakryj textilií, citlivé rostliny mohou zmrznout.'),
    );
  }

  // ── Horko ──
  const hottest = Math.max(weather.today.tMax, weather.forecast[0]?.tMax ?? -99);
  if (hottest >= 30 && active) {
    warnings.push(
      `🔥 Horko až ${Math.round(hottest)} °C – zalévej brzy ráno nebo večer, ` +
        (inGreenhouse ? 'větrej skleník a stiň ho.' : 'mulčuj a citlivé rostliny přistiň.'),
    );
  }

  // ── Vítr ──
  if (weather.current.wind >= 40 && (plant.category === 'zelenina' || inPot)) {
    warnings.push(`💨 Silný vítr (${Math.round(weather.current.wind)} km/h) – zkontroluj opory a vyvázání.`);
  }

  const task = plant.tasks[month];
  const base = { gardenPlant: gp, plant, warnings, task };

  // ── Zálivka ──
  if (gp.lastWatered === today) {
    return {
      ...base,
      verdict: 'zalito',
      headline: 'Dnes už zalito ✓',
      reason: 'Dnešní zálivku máš splněnou.',
      litres: 0,
      mm: 0,
    };
  }

  if (!active) {
    const winterPot = inPot && plant.perennial;
    return {
      ...base,
      verdict: 'odpočívá',
      headline: winterPot
        ? 'Zalij jen trochu, až substrát proschne'
        : plant.perennial
          ? 'Odpočívá – zalévání není potřeba'
          : 'Mimo sezónu – teď se nepěstuje',
      reason: winterPot
        ? 'Rostlina v květináči je mimo sezónu. Hlídej jen, aby kořenový bal úplně nevyschl.'
        : plant.perennial
          ? 'Rostlina je mimo hlavní vegetační období.'
          : 'Podívej se do kalendáře péče, kdy ji vysévat nebo vysazovat.',
      litres: 0,
      mm: 0,
    };
  }

  const recent = weather.past.slice(-LOOKBACK_DAYS);
  const potFactor = inPot ? 1.25 : inGreenhouse ? 1.1 : 1;
  const demand = recent.reduce((s, d) => s + d.et0, 0) * plant.kc * SUN_FACTOR[gp.sun] * potFactor;

  const rainFactor = inGreenhouse ? 0 : inPot ? 0.6 : 1;
  const rain = recent.reduce((s, d) => s + effectiveRain(d.rain), 0) * rainFactor;

  let irrigation = 0;
  if (gp.lastWatered && gp.lastWatered >= recent[0]?.date) {
    irrigation = gp.lastWateredMm ?? BUFFER_MM[plant.rootDepth];
  }

  const deficit = demand - rain - irrigation;
  const buffer = inPot ? 5 : BUFFER_MM[plant.rootDepth];
  const rainToday = weather.today.rain * rainFactor;
  // Déšť očekávaný dnes až pozítří (48 h dopředu).
  const soonDays = [weather.today, ...weather.forecast.slice(0, 2)];
  const rainSoon = soonDays.reduce((s, d) => s + effectiveRain(d.rain), 0) * rainFactor;
  const rainChance = Math.max(...soonDays.map((d) => d.rainChance ?? 0));
  const lastRainy = [...soonDays].reverse().find((d) => d.rain >= 2);

  const facts = `Za posledních ${LOOKBACK_DAYS} dní napršelo ${round1(recent.reduce((s, d) => s + d.rain, 0))} mm, ` +
    `výpar odhadujeme na ${round1(demand)} mm.`;

  if (rainToday >= 5) {
    return {
      ...base,
      verdict: 'nezalévej',
      headline: `Nezalévej – dnes prší (${round1(weather.today.rain)} mm)`,
      reason: facts,
      litres: 0,
      mm: 0,
    };
  }

  if (deficit < buffer * 0.6) {
    return {
      ...base,
      verdict: 'nezalévej',
      headline: 'Nezalévej – půda má dost vláhy',
      reason: inGreenhouse ? `Ve skleníku neprší, ale výpar byl malý. ${facts}` : facts,
      litres: 0,
      mm: 0,
    };
  }

  const mm = Math.min(Math.max(Math.round(deficit), 5), 25);
  let litres = Math.round(mm * gp.areaM2);
  if (plant.rootDepth === 'hluboké' && plant.perennial) litres = Math.max(litres, 20 * gp.count);
  litres = Math.max(litres, 1);

  // Plodiny ve stresu (velký deficit) nenecháme čekat 2 dny.
  if (rainSoon >= Math.min(deficit, 6) && rainChance >= 60 && deficit < buffer * 2) {
    return {
      ...base,
      verdict: 'zkontroluj',
      headline: `Počkej – ${lastRainy ? untilDay(lastRainy.date, today) : 'brzy'} má napršet ~${round1(rainSoon)} mm (${rainChance} %)`,
      reason: `Pokud déšť nepřijde, zalij asi ${litres} l. ${facts}`,
      litres,
      mm,
    };
  }

  if (deficit < buffer) {
    return {
      ...base,
      verdict: 'zkontroluj',
      headline: 'Zkontroluj půdu prstem',
      reason: `Je-li 3–5 cm pod povrchem suchá, zalij asi ${litres} l. ${facts}`,
      litres,
      mm,
    };
  }

  return {
    ...base,
    verdict: 'zalij',
    headline: `Zalij asi ${litres} l${litres >= 10 ? ` (${mm} l/m²)` : ''}`,
    reason: `${plant.watering} ${facts}`,
    litres,
    mm,
  };
}

function relDay(date: string, today: string): string {
  const diff = Math.round((new Date(date).getTime() - new Date(today).getTime()) / 86400000);
  if (diff <= 0) return 'dnes v noci';
  if (diff === 1) return 'zítra';
  return 'pozítří';
}

function untilDay(date: string, today: string): string {
  const diff = Math.round((new Date(date).getTime() - new Date(today).getTime()) / 86400000);
  return diff <= 0 ? 'dnes' : diff === 1 ? 'do zítřka' : 'do pozítří';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function daysSinceRain(weather: Weather): number | null {
  const all = [...weather.past, weather.today];
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i].rain >= 2) return all.length - 1 - i;
  }
  return null;
}

/** Tip a zajímavost dne – vybírají se podle data z rostlin na zahradě. */
export function dailyTipAndFact(plantIds: string[], now: Date): { tip: string; fact: string; source?: string } {
  const tips: { text: string; source?: string }[] = GENERAL_TIPS.map((t) => ({ text: t }));
  const facts: { text: string; source?: string }[] = GENERAL_FACTS.map((t) => ({ text: t }));
  for (const id of new Set(plantIds)) {
    const p = getPlant(id);
    if (!p) continue;
    // Tipy vlastních rostlin mají větší váhu.
    p.tips.forEach((t) => tips.push({ text: t, source: p.name }, { text: t, source: p.name }));
    p.facts.forEach((f) => facts.push({ text: f, source: p.name }, { text: f, source: p.name }));
  }
  const doy = dayOfYear(now);
  const tip = tips[doy % tips.length];
  const fact = facts[(doy * 7 + 3) % facts.length];
  return {
    tip: tip.source ? `${tip.source}: ${tip.text}` : tip.text,
    fact: fact.source ? `${fact.source}: ${fact.text}` : fact.text,
  };
}
