import Anthropic from '@anthropic-ai/sdk';
import { Garden, Plant, Weather } from '../types';
import { MONTH_NAMES, getSeason } from './season';

export interface Diagnosis {
  rostlina: string;
  problem: string;
  jistota: 'nízká' | 'střední' | 'vysoká';
  popis: string;
  priciny: string[];
  co_delat_hned: string[];
  dlouhodobe: string[];
  kdy_zpozornet: string;
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rostlina', 'problem', 'jistota', 'popis', 'priciny', 'co_delat_hned', 'dlouhodobe', 'kdy_zpozornet'],
  properties: {
    rostlina: { type: 'string', description: 'Jaká rostlina je na fotce (česky).' },
    problem: { type: 'string', description: 'Krátký název problému, např. „Plíseň bramborová“ nebo „Rostlina je zdravá“.' },
    jistota: { type: 'string', enum: ['nízká', 'střední', 'vysoká'] },
    popis: { type: 'string', description: 'Co je na fotce vidět a proč to ukazuje na tento problém (2–4 věty).' },
    priciny: { type: 'array', items: { type: 'string' } },
    co_delat_hned: { type: 'array', items: { type: 'string' }, description: 'Konkrétní kroky na dnes, přednostně šetrné/bio.' },
    dlouhodobe: { type: 'array', items: { type: 'string' }, description: 'Prevence do budoucna.' },
    kdy_zpozornet: { type: 'string', description: 'Kdy problém brát vážně / kdy vyhledat odborníka nebo rostlinu odstranit.' },
  },
};

const SYSTEM = `Jsi zkušený český zahradník a fytopatolog. Uživatel ti posílá fotku rostliny ze své zahrady.
Urči rostlinu, rozpoznej problém (choroby, škůdci, nedostatek živin, chyby v zálivce, úžeh, mráz…) a poraď, co dělat.
Piš česky, srozumitelně pro hobby zahrádkáře. Upřednostňuj šetrné a v ČR dostupné postupy; chemii zmiň jen jako poslední možnost.
Pokud fotka nestačí k jistému závěru, řekni to v poli „jistota“ a v popisu napiš, jakou další fotku (detail listu, rub listu, kořeny) poslat.
Zohledni počasí a roční období z kontextu – např. plíseň po deštivých dnech, úžeh po vedru.`;

export async function diagnosePhoto(opts: {
  apiKey: string;
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  plant?: Plant;
  note: string;
  garden: Garden;
  weather: Weather | null;
}): Promise<Diagnosis> {
  // Klíč je uložený jen v zařízení uživatele. Pro veřejnou aplikaci volání přesuň na vlastní server.
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true });

  const now = new Date();
  const ctx: string[] = [
    `Datum: ${now.getDate()}. ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}, roční období: ${getSeason(now)}.`,
  ];
  if (opts.garden.location) ctx.push(`Místo: ${opts.garden.location.label}.`);
  if (opts.plant) ctx.push(`Uživatel uvádí, že jde o: ${opts.plant.name} (${opts.plant.latin}).`);
  if (opts.weather) {
    const w = opts.weather;
    const rain7 = w.past.reduce((s, d) => s + d.rain, 0);
    const tMax = Math.max(...w.past.map((d) => d.tMax));
    const tMin = Math.min(...w.past.map((d) => d.tMin));
    ctx.push(
      `Počasí za posledních 7 dní: srážky ${rain7.toFixed(1)} mm, teploty ${tMin.toFixed(0)} až ${tMax.toFixed(0)} °C. ` +
        `Dnes ${w.current.temp.toFixed(0)} °C, vlhkost ${w.current.humidity} %.`,
    );
  }
  if (opts.note.trim()) ctx.push(`Popis od uživatele: ${opts.note.trim()}`);

  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: opts.mediaType, data: opts.base64 } },
          { type: 'text', text: ctx.join('\n') },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Tuto fotku se nepodařilo posoudit. Zkus jinou fotku rostliny.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('Odpověď byla příliš dlouhá, zkus to prosím znovu.');
  }
  const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  return JSON.parse(text) as Diagnosis;
}

export function explainError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'Neplatný API klíč. Zkontroluj ho v Nastavení.';
  if (e instanceof Anthropic.RateLimitError) return 'Příliš mnoho požadavků, zkus to za chvíli.';
  if (e instanceof Anthropic.BadRequestError) return `Požadavek byl odmítnut: ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return 'Nelze se připojit k internetu.';
  if (e instanceof Anthropic.APIError) return `Chyba služby (${e.status ?? '?'}). Zkus to znovu.`;
  if (e instanceof Error) return e.message;
  return 'Neznámá chyba.';
}
