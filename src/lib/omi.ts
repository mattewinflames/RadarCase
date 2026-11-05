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
export type OmiMode = 'buy' | 'rent';

/** Fascia della quotazione per il tipo di contratto: compravendita (€/m²) o locazione (€/m²/mese). */
export function bandOf(quote: OmiQuote, mode: OmiMode): { min: number; max: number } | null {
  const min = mode === 'rent' ? quote.locMin : quote.comprMin;
  const max = mode === 'rent' ? quote.locMax : quote.comprMax;
  if (!min || !max || min <= 0 || max <= 0) return null;
  return { min, max };
}

/**
 * Sceglie la quotazione residenziale di riferimento di una zona:
 * preferisce "Abitazioni civili" in stato NORMALE, con fallback ragionevoli.
 * Considera solo le quotazioni che hanno la fascia del contratto richiesto:
 * molte quotazioni OTTIMO non riportano il canone, e senza questo filtro
 * un affitto finirebbe confrontato con una fascia vuota.
 */
export function residentialQuote(zone: OmiZone, mode: OmiMode = 'buy'): OmiQuote | null {
  const q = zone.quotazioni.filter(v => bandOf(v, mode) !== null);
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
  mode: OmiMode;
  position: 'sotto' | 'in linea' | 'sopra';
  deltaPct: number;     // scostamento dal punto medio della fascia, in %
  bandMin: number;      // €/m² (acquisto) oppure €/m²/mese (affitto)
  bandMax: number;
  pricePerSqm: number;  // €/m² (acquisto, intero) oppure €/m²/mese (affitto, 2 decimali)
}

/**
 * Colloca il prezzo/m² di un immobile rispetto alla fascia OMI del suo contratto.
 * "in linea" se dentro [min, max]; altrimenti sotto/sopra, con lo scostamento % dal medio.
 */
export function assessPricePerSqm(pricePerSqm: number, quote: OmiQuote, mode: OmiMode = 'buy'): PriceAssessment | null {
  const band = bandOf(quote, mode);
  if (!band || !(pricePerSqm > 0)) return null;
  const mid = (band.min + band.max) / 2;
  const deltaPct = Math.round(((pricePerSqm - mid) / mid) * 100);
  let position: PriceAssessment['position'] = 'in linea';
  if (pricePerSqm < band.min) position = 'sotto';
  else if (pricePerSqm > band.max) position = 'sopra';
  return { mode, position, deltaPct, bandMin: band.min, bandMax: band.max, pricePerSqm };
}

/** €/m² (acquisto, intero) o €/m²/mese (affitto, 2 decimali): l'unità segue il contratto. */
export function pricePerSqmFor(price: number, sqm: number, mode: OmiMode): number | null {
  if (!price || !sqm || sqm <= 0) return null;
  const v = price / sqm;
  return mode === 'rent' ? Math.round(v * 100) / 100 : Math.round(v);
}

/** Formato it-IT coerente con l'unità: "2.067 €/m²" oppure "13,57 €/m²/mese". */
export function formatPerSqm(v: number, mode: OmiMode): string {
  return mode === 'rent'
    ? `${v.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} €/m²/mese`
    : `${Math.round(v).toLocaleString('it-IT')} €/m²`;
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

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export interface OmiValue { min: number; max: number; mid: number; }

/** Valore stimato dell'immobile: fascia €/m² OMI × superficie. */
export function omiValueRange(quote: OmiQuote, sqm: number): OmiValue | null {
  if (!quote.comprMin || !quote.comprMax || !sqm || sqm <= 0) return null;
  const min = quote.comprMin * sqm;
  const max = quote.comprMax * sqm;
  return { min, max, mid: (min + max) / 2 };
}

export interface OfferRange { low: number; high: number; }

/**
 * Offerta di partenza indicativa. Àncora al valore "equo" (medio OMI) ma non
 * propone MAI sopra il prezzo richiesto; ~10% di margine di trattativa sotto l'àncora.
 * Arrotondata al migliaio. È un'indicazione di larga massima, non una valutazione.
 */
export function suggestedOffer(asking: number, quote: OmiQuote, sqm: number): OfferRange | null {
  const v = omiValueRange(quote, sqm);
  if (!v || !asking || asking <= 0) return null;
  const anchor = Math.min(asking, v.mid);
  const low = roundTo(anchor * 0.90, 1000);
  const high = roundTo(anchor, 1000);
  if (low <= 0 || high <= 0 || low > high) return null;
  return { low, high };
}

/** Canone mensile OMI stimato per l'immobile: fascia €/m²/mese × superficie (solo affitto). */
export function omiRentRange(quote: OmiQuote, sqm: number): OmiValue | null {
  const band = bandOf(quote, 'rent');
  if (!band || !sqm || sqm <= 0) return null;
  const min = band.min * sqm;
  const max = band.max * sqm;
  return { min, max, mid: (min + max) / 2 };
}

/**
 * Tutto in una chiamata: carica, trova la zona, sceglie la quota del contratto
 * giusto e valuta il prezzo (vendita) o il canone (affitto) al m².
 */
export async function getOmiAssessment(
  lat: number, lng: number, price: number, sqm: number, mode: OmiMode = 'buy'
): Promise<OmiResult | null> {
  const pps = pricePerSqmFor(price, sqm, mode);
  if (pps == null) return null;
  const fc = await loadOmiForPoint(lat, lng);
  if (!fc) return null;
  const zone = findZone(fc, lat, lng);
  if (!zone) return null;
  const quote = residentialQuote(zone, mode);
  if (!quote) return null;
  return { zone, quote, assessment: assessPricePerSqm(pps, quote, mode) };
}

/**
 * Riga di contesto OMI per i prompt AI, con l'unità del contratto esplicita
 * (evita che l'AI confronti un canone mensile con una fascia di compravendita).
 */
export function omiPromptLine(r: OmiResult | null): string {
  if (!r || !r.assessment) return '';
  const a = r.assessment;
  const tipo = a.mode === 'rent' ? 'locazione' : 'compravendita';
  const fascia = a.mode === 'rent'
    ? `${a.bandMin.toLocaleString('it-IT')}-${a.bandMax.toLocaleString('it-IT')} €/m²/mese`
    : `${a.bandMin.toLocaleString('it-IT')}-${a.bandMax.toLocaleString('it-IT')} €/m²`;
  const segno = a.deltaPct >= 0 ? '+' : '';
  return `Quotazione OMI di zona (Agenzia Entrate, sem. ${r.zone.semestre} — ${r.zone.comune}, zona ${r.zone.zona} "${r.zone.zonaDescr}"), ${tipo}: ${fascia}. ` +
    `${a.mode === 'rent' ? 'Il canone' : 'Il prezzo'} di questo immobile (${formatPerSqm(a.pricePerSqm, a.mode)}) è ${a.position} rispetto alla fascia (${segno}${a.deltaPct}% dal valore medio).`;
}
