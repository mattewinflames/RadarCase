/**
 * Lookup delle quotazioni OMI (Agenzia Entrate) per un immobile geolocalizzato.
 *
 * Dato lat/lng, trova la Zona OMI che lo contiene (point-in-polygon) e restituisce
 * le fasce di prezzo. Nessuna dipendenza esterna: il point-in-polygon è ray-casting.
 *
 * Fonte dati: "Agenzia Entrate - OMI" (attribuzione obbligatoria).
 * I valori sono per ZONA e "di larga massima": un segnale, non una perizia.
 */
 
export interface OmiQuote {
  tipologia: string;   // es. "Abitazioni civili"
  stato: string;       // OTTIMO | NORMALE | SCADENTE
  comprMin: number | null;  // €/m² compravendita
  comprMax: number | null;
  locMin: number | null;    // €/m²/mese locazione
  locMax: number | null;
}
 
export interface OmiZone {
  prov: string;
  comune: string;
  zona: string;
  zonaDescr: string;
  fascia: string;
  semestre: string;
  fonte: string;
  quotazioni: OmiQuote[];
}
 
type Ring = number[][];              // [[lng,lat], ...]
type Geometry =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] };
 
interface Feature { type: 'Feature'; geometry: Geometry; properties: OmiZone; }
export interface OmiFeatureCollection { type: 'FeatureCollection'; metadata?: any; features: Feature[]; }
 
/* ---------------------------------------------------------------- point-in-polygon */
 
// Ray casting: vero se il punto è dentro l'anello.
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
 
// Dentro il primo anello (outer) e fuori dagli eventuali buchi (inner).
function pointInPolygon(lng: number, lat: number, rings: Ring[]): boolean {
  if (rings.length === 0 || !pointInRing(lng, lat, rings[0])) return false;
  for (let k = 1; k < rings.length; k++) {
    if (pointInRing(lng, lat, rings[k])) return false; // in un buco
  }
  return true;
}
 
function geometryContains(geom: Geometry, lng: number, lat: number): boolean {
  if (geom.type === 'Polygon') return pointInPolygon(lng, lat, geom.coordinates);
  return geom.coordinates.some(poly => pointInPolygon(lng, lat, poly));
}
 
/* ---------------------------------------------------------------- API */
 
/** Trova la Zona OMI che contiene il punto, o null. */
export function findZone(fc: OmiFeatureCollection, lat: number, lng: number): OmiZone | null {
  for (const f of fc.features) {
    if (geometryContains(f.geometry, lng, lat)) return f.properties;
  }
  return null;
}
 
/**
 * Sceglie la quotazione residenziale di riferimento di una zona:
 * preferisce "Abitazioni civili" in stato NORMALE, con fallback ragionevoli.
 */
export function residentialQuote(zone: OmiZone): OmiQuote | null {
  const q = zone.quotazioni;
  const civili = q.filter(v => /abitazioni civili/i.test(v.tipologia));
  return (
    civili.find(v => /normale/i.test(v.stato)) ||
    civili[0] ||
    q.find(v => /normale/i.test(v.stato)) ||
    q[0] ||
    null
  );
}
 
export interface PriceAssessment {
  position: 'sotto' | 'in linea' | 'sopra';
  deltaPct: number;   // scostamento dal punto medio della fascia, in %
  bandMin: number;
  bandMax: number;
}
 
/**
 * Colloca il prezzo/m² di un immobile rispetto alla fascia OMI di compravendita.
 * "in linea" se dentro [min, max]; altrimenti sotto/sopra, con lo scostamento % dal medio.
 */
export function assessPricePerSqm(pricePerSqm: number, quote: OmiQuote): PriceAssessment | null {
  const min = quote.comprMin, max = quote.comprMax;
  if (!min || !max || min <= 0 || max <= 0) return null;
  const mid = (min + max) / 2;
  const deltaPct = Math.round(((pricePerSqm - mid) / mid) * 100);
  let position: PriceAssessment['position'] = 'in linea';
  if (pricePerSqm < min) position = 'sotto';
  else if (pricePerSqm > max) position = 'sopra';
  return { position, deltaPct, bandMin: min, bandMax: max };
}
 
/* ---------------------------------------------------------------- caricamento lazy
 
I GeoJSON stanno in public/omi/. Vengono caricati una sola volta per provincia
e tenuti in cache. La provincia si sceglie dalla latitudine (le due province
configurate sono lontane: Bologna a nord, Roma al centro). */
 
const _cache: Record<string, OmiFeatureCollection | null> = {};
 
export function provinceForPoint(lat: number, _lng: number): 'bo' | 'rm' | null {
  if (lat >= 43.3) return 'bo';           // Bologna ~44.5
  if (lat >= 41.0 && lat < 43.3) return 'rm'; // Roma ~41.9
  return null;
}
 
export async function loadOmiForPoint(lat: number, lng: number): Promise<OmiFeatureCollection | null> {
  const prov = provinceForPoint(lat, lng);
  if (!prov) return null;
  if (!(prov in _cache)) {
    try {
      const res = await fetch(`/omi/omi-${prov}.geojson`);
      _cache[prov] = res.ok ? await res.json() : null;
    } catch (e) {
      _cache[prov] = null;
    }
  }
  return _cache[prov];
}
 
export interface OmiResult {
  zone: OmiZone;
  quote: OmiQuote;
  assessment: PriceAssessment | null;
}
 
/** Tutto in una chiamata: carica, trova la zona, sceglie la quota, valuta il prezzo/m². */
export async function getOmiAssessment(lat: number, lng: number, pricePerSqm: number): Promise<OmiResult | null> {
  const fc = await loadOmiForPoint(lat, lng);
  if (!fc) return null;
  const zone = findZone(fc, lat, lng);
  if (!zone) return null;
  const quote = residentialQuote(zone);
  if (!quote) return null;
  return { zone, quote, assessment: assessPricePerSqm(pricePerSqm, quote) };
}
 
