import { Platform } from 'react-native';

// Vyhledávání adres přes OpenStreetMap Nominatim (zdarma, max. 1 dotaz za sekundu).
const BASE = 'https://nominatim.openstreetmap.org';

// Nominatim chce identifikaci aplikace; prohlížeč ji posílá sám (Referer), v telefonu přidáme hlavičku.
const HEADERS: Record<string, string> =
  Platform.OS === 'web' ? {} : { 'User-Agent': 'Zahradnik/1.0 (github.com/56dvyn7726-tech/Gotyourprint)' };

export interface Address {
  title: string;
  subtitle: string;
  lat: number;
  lon: number;
}

export async function searchAddress(query: string): Promise<Address[]> {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&limit=6&accept-language=cs`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error('Vyhledávání adresy selhalo.');
  const json: any[] = await res.json();
  return json.map((r) => {
    const a = r.address ?? {};
    const street = [a.road ?? a.pedestrian ?? a.hamlet, a.house_number].filter(Boolean).join(' ');
    const town = a.village ?? a.town ?? a.city ?? a.municipality ?? '';
    return {
      title: street || town || r.name || r.display_name.split(',')[0],
      subtitle: [street ? town : '', a.county ?? a.state, a.country].filter(Boolean).join(', '),
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    };
  });
}

/** Krátký název místa (obec, případně ulice) pro souřadnice. */
export async function placeName(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `${BASE}/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=17&accept-language=cs`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const a = (await res.json()).address ?? {};
    const town = a.village ?? a.town ?? a.city ?? a.municipality;
    const street = a.road;
    return [street, town].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}
