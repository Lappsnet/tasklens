/** S7: municipalities served. Directory-first: any Latin American city works the
 * same way — reports and operators are fenced by `slug`, so a resident only
 * ever sees their own city's board. */

export interface CityEntry {
  slug: string;
  name: string;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
}

export const CITIES: CityEntry[] = [
  { slug: "san-salvador", name: "San Salvador", country: "El Salvador", country_code: "SV", lat: 13.6929, lng: -89.2182 },
  { slug: "santa-tecla", name: "Santa Tecla", country: "El Salvador", country_code: "SV", lat: 13.6765, lng: -89.2799 },
  { slug: "antiguo-cuscatlan", name: "Antiguo Cuscatlán", country: "El Salvador", country_code: "SV", lat: 13.6733, lng: -89.2403 },
  { slug: "soyapango", name: "Soyapango", country: "El Salvador", country_code: "SV", lat: 13.7333, lng: -89.15 },
  { slug: "san-miguel", name: "San Miguel", country: "El Salvador", country_code: "SV", lat: 13.4833, lng: -88.1833 },
  { slug: "santa-ana", name: "Santa Ana", country: "El Salvador", country_code: "SV", lat: 13.9949, lng: -89.5596 },
  { slug: "guatemala", name: "Ciudad de Guatemala", country: "Guatemala", country_code: "GT", lat: 14.6349, lng: -90.513 },
  { slug: "tegucigalpa", name: "Tegucigalpa", country: "Honduras", country_code: "HN", lat: 14.0723, lng: -87.1921 },
  { slug: "managua", name: "Managua", country: "Nicaragua", country_code: "NI", lat: 12.1364, lng: -86.2514 },
  { slug: "san-jose", name: "San José", country: "Costa Rica", country_code: "CR", lat: 9.9281, lng: -84.0907 },
  { slug: "panama", name: "Ciudad de Panamá", country: "Panamá", country_code: "PA", lat: 8.9824, lng: -79.5199 },
  { slug: "bogota", name: "Bogotá", country: "Colombia", country_code: "CO", lat: 4.711, lng: -74.0721 },
  { slug: "lima", name: "Lima", country: "Perú", country_code: "PE", lat: -12.0464, lng: -77.0428 },
  { slug: "cdmx", name: "Ciudad de México", country: "México", country_code: "MX", lat: 19.4326, lng: -99.1332 },
];

export function findCity(slug: string): CityEntry | null {
  return CITIES.find((c) => c.slug === slug.toLowerCase()) ?? null;
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(s));
}

/** Nearest directory city to a point — used for "use my location". */
export function nearestCity(lat: number, lng: number): CityEntry {
  let best = CITIES[0];
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = distanceKm(lat, lng, c.lat, c.lng);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
