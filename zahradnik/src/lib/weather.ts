import { DayWeather, GardenLocation, Weather } from '../types';

// Open-Meteo: zdarma, bez API klíče, obsahuje i referenční evapotranspiraci (ET₀).
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const DAILY = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'et0_fao_evapotranspiration',
  'weather_code',
  'precipitation_probability_max',
].join(',');

const CURRENT = ['temperature_2m', 'weather_code', 'wind_speed_10m', 'relative_humidity_2m'].join(',');

export async function fetchWeather(loc: GardenLocation): Promise<Weather> {
  const url =
    `${FORECAST_URL}?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&daily=${DAILY}&current=${CURRENT}&past_days=7&forecast_days=7&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Počasí se nepodařilo načíst (HTTP ${res.status}).`);
  const json = await res.json();

  const d = json.daily;
  const days: DayWeather[] = d.time.map((date: string, i: number) => ({
    date,
    tMax: d.temperature_2m_max[i] ?? 0,
    tMin: d.temperature_2m_min[i] ?? 0,
    rain: d.precipitation_sum[i] ?? 0,
    et0: d.et0_fao_evapotranspiration[i] ?? 0,
    code: d.weather_code[i] ?? 0,
    rainChance: d.precipitation_probability_max?.[i] ?? null,
  }));

  // S timezone=auto jsou data v místním čase zahrady.
  const todayDate: string = String(json.current.time).slice(0, 10);
  let idx = days.findIndex((x) => x.date === todayDate);
  if (idx < 0) idx = 7;

  return {
    fetchedAt: new Date().toISOString(),
    current: {
      temp: json.current.temperature_2m,
      code: json.current.weather_code,
      wind: json.current.wind_speed_10m,
      humidity: json.current.relative_humidity_2m,
    },
    past: days.slice(0, idx),
    today: days[idx],
    forecast: days.slice(idx + 1),
  };
}

/** WMO kódy počasí → česky + emoji. */
export function describeWeather(code: number): { text: string; emoji: string } {
  if (code === 0) return { text: 'Jasno', emoji: '☀️' };
  if (code <= 2) return { text: 'Polojasno', emoji: '🌤️' };
  if (code === 3) return { text: 'Zataženo', emoji: '☁️' };
  if (code <= 48) return { text: 'Mlha', emoji: '🌫️' };
  if (code <= 57) return { text: 'Mrholení', emoji: '🌦️' };
  if (code <= 67) return { text: 'Déšť', emoji: '🌧️' };
  if (code <= 77) return { text: 'Sněžení', emoji: '🌨️' };
  if (code <= 82) return { text: 'Přeháňky', emoji: '🌦️' };
  if (code <= 86) return { text: 'Sněhové přeháňky', emoji: '🌨️' };
  return { text: 'Bouřky', emoji: '⛈️' };
}
