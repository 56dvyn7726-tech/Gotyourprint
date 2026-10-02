import { LatLon } from '../types';

export const TILE_SIZE = 256;

/** Satelitní snímky Esri World Imagery – zdarma, bez API klíče (s uvedením zdroje). */
export const MAX_TILE_ZOOM = 19;
export const tileUrl = (z: number, x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
export const TILE_ATTRIBUTION = 'Snímky © Esri, Maxar, Earthstar Geographics';

const worldSize = (zoom: number) => TILE_SIZE * Math.pow(2, zoom);

/** Web Mercator: zeměpisné souřadnice → pixely „světa“ při daném (i neceločíselném) zoomu. */
export function project(p: LatLon, zoom: number): { x: number; y: number } {
  const s = worldSize(zoom);
  const lat = Math.max(-85.05112878, Math.min(85.05112878, p.lat));
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((p.lon + 180) / 360) * s,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s,
  };
}

export function unproject(pt: { x: number; y: number }, zoom: number): LatLon {
  const s = worldSize(zoom);
  const lon = (pt.x / s) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * pt.y) / s;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lon };
}

/** Plocha mnohoúhelníku v m² (lokální rovinná aproximace – pro zahradu přesná). */
export function polygonArea(points: LatLon[]): number {
  if (points.length < 3) return 0;
  const R = 6371008.8;
  const lat0 = (points.reduce((s, p) => s + p.lat, 0) / points.length) * (Math.PI / 180);
  const xy = points.map((p) => ({
    x: R * ((p.lon * Math.PI) / 180) * Math.cos(lat0),
    y: R * ((p.lat * Math.PI) / 180),
  }));
  let a = 0;
  for (let i = 0; i < xy.length; i++) {
    const j = (i + 1) % xy.length;
    a += xy[i].x * xy[j].y - xy[j].x * xy[i].y;
  }
  return Math.abs(a) / 2;
}

export function centroid(points: LatLon[]): LatLon {
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lon: points.reduce((s, p) => s + p.lon, 0) / points.length,
  };
}

/** Zoom, při kterém se body vejdou do výřezu dané velikosti. */
export function fitZoom(points: LatLon[], width: number, height: number, padding = 60): { center: LatLon; zoom: number } {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const ne = { lat: Math.max(...lats), lon: Math.max(...lons) };
  const sw = { lat: Math.min(...lats), lon: Math.min(...lons) };
  const center = { lat: (ne.lat + sw.lat) / 2, lon: (ne.lon + sw.lon) / 2 };
  let zoom = 21;
  while (zoom > 3) {
    const a = project(ne, zoom);
    const b = project(sw, zoom);
    if (Math.abs(a.x - b.x) <= width - padding * 2 && Math.abs(a.y - b.y) <= height - padding * 2) break;
    zoom -= 0.25;
  }
  return { center, zoom };
}

export function formatArea(m2: number): string {
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2).replace('.', ',')} ha`;
  if (m2 >= 100) return `${Math.round(m2)} m²`;
  return `${(Math.round(m2 * 10) / 10).toString().replace('.', ',')} m²`;
}

export function googleMapsUrl(p: LatLon): string {
  return `https://www.google.com/maps/@?api=1&map_action=map&center=${p.lat},${p.lon}&zoom=20&basemap=satellite`;
}
