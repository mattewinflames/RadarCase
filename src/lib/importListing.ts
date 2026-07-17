/**
 * Importazione annunci da portali immobiliari.
 *
 * Il bookmarklet raccoglie i dati grezzi e li consegna nel frammento dell'URL
 * (#import=...), che NON viene mai inviato al server: resta nel browser.
 *
 * Tutta l'intelligenza sta qui, non nel bookmarklet: cosi' le correzioni si
 * distribuiscono con un deploy, senza che nessuno debba reinstallare il segnalibro.
 */

import { House } from '../types';

export type ImportDraft = {
  title?: string;
  price?: number;
  sqm?: number;
  location?: string;
  link?: string;
  yearBuilt?: number;
  floor?: number;
  kwh?: number;
  energyClass?: House['energyClass'];
  heating?: House['heating'];
  condition?: House['condition'];
  condoFees?: number;
  lat?: number;
  lng?: number;
  /** 'sale' o 'rent' dichiarato dal portale, per avvisare se non combacia con appMode */
  contract?: 'buy' | 'rent';
  /** da dove arriva: serve solo per i messaggi a schermo */
  source?: string;
};

export interface ImportPayload {
  v: number;
  mode: 'exact' | 'text';
  url: string;
  data?: any;
  text?: string;
  title?: string;
  hints?: string[];
}

/* ------------------------------------------------------------------ */
/* Helper di parsing                                                    */
/* ------------------------------------------------------------------ */

/**
 * Estrae il primo numero da una stringa in formato italiano.
 * "€ 81/mese" -> 81 | "120.000 €" -> 120000 | "346,7 kWh/m²" -> 346.7 | "75 m²" -> 75
 */
export function toNumber(raw: any): number | undefined {
  if (typeof raw === 'number') return isFinite(raw) ? raw : undefined;
  if (typeof raw !== 'string') return undefined;
  const m = raw.replace(/\s/g, '').match(/-?\d[\d.]*(?:,\d+)?/);
  if (!m) return undefined;
  const n = Number(m[0].replace(/\./g, '').replace(',', '.'));
  return isFinite(n) ? n : undefined;
}

export function mapCondition(raw: any): House['condition'] | undefined {
  const t = String(raw || '').toLowerCase();
  if (!t) return undefined;
  // l'ordine conta: "Ottimo / Ristrutturato" contiene entrambe le parole
  if (t.includes('da ristrutturare')) return 'da_ristrutturare';
  if (t.includes('ottimo') || t.includes('nuovo') || t.includes('costruzione')) return 'ottimo';
  if (t.includes('ristrutturato')) return 'ristrutturato';
  if (t.includes('buono') || t.includes('abitabile')) return 'buono';
  return undefined;
}

export function mapHeating(raw: any): House['heating'] | undefined {
  const t = String(raw || '').toLowerCase();
  if (!t) return undefined;
  if (t.includes('autonomo')) return 'autonomo';
  if (t.includes('centralizzato')) return 'centralizzato';
  if (t.includes('assente') || t.includes('nessun')) return 'assente';
  return undefined;
}

const ENERGY_CLASSES: House['energyClass'][] = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'];

export function mapEnergyClass(raw: any): House['energyClass'] | undefined {
  const t = String(raw || '').toUpperCase().replace(/[\s.]/g, '');
  if (!t) return undefined;
  const hit = ENERGY_CLASSES.find(c => c === t);
  if (hit) return hit;
  // "A+" o "A" non sono mappabili con certezza su A1..A4: meglio lasciare vuoto
  return undefined;
}

/** Rimuove le chiavi undefined: Firestore le rifiuta. */
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  Object.keys(obj).forEach(k => {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') out[k] = obj[k];
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Decodifica del frammento                                             */
/* ------------------------------------------------------------------ */

function fromBase64Url(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return decodeURIComponent(escape(atob(b64)));
}

/**
 * Legge #import=... dall'URL. Restituisce null se non c'e' o non e' valido.
 */
export function decodeImportHash(hash: string): ImportPayload | null {
  if (!hash) return null;
  const m = hash.match(/[#&]import=([^&]+)/);
  if (!m) return null;
  try {
    const payload = JSON.parse(fromBase64Url(m[1]));
    if (!payload || (payload.mode !== 'exact' && payload.mode !== 'text')) return null;
    return payload as ImportPayload;
  } catch (e) {
    console.error('Import: frammento illeggibile', e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Immobiliare: estrazione esatta                                       */
/* ------------------------------------------------------------------ */

export function normalizeExact(data: any, url: string): ImportDraft {
  if (!data) throw new Error('Dati dell\'annuncio mancanti.');

  const locationParts = [
    [data.address, data.streetNumber].filter(Boolean).join(' '),
    data.city
  ].filter(Boolean);

  const draft: ImportDraft = {
    title: data.title || undefined,
    price: toNumber(data.price),
    sqm: toNumber(data.surface),
    location: locationParts.join(', ') || undefined,
    link: url,
    yearBuilt: toNumber(data.buildingYear),
    floor: toNumber(data.floor),
    kwh: toNumber(data.epi),
    energyClass: mapEnergyClass(data.energyClass),
    heating: mapHeating(data.heating),
    condition: mapCondition(data.condition),
    condoFees: toNumber(data.condoFees),
    lat: typeof data.lat === 'number' ? data.lat : undefined,
    lng: typeof data.lng === 'number' ? data.lng : undefined,
    contract: data.contract === 'rent' ? 'rent' : data.contract === 'sale' ? 'buy' : undefined,
    source: 'Immobiliare.it'
  };

  return stripUndefined(draft) as ImportDraft;
}

/* ------------------------------------------------------------------ */
/* Altri portali: estrazione dal testo tramite Gemini                   */
/* ------------------------------------------------------------------ */

const EXTRACTION_PROMPT = `Sei un estrattore di dati da annunci immobiliari italiani.
Dal TESTO qui sotto estrai un oggetto JSON con ESATTAMENTE queste chiavi, usando null quando il dato non e' presente:

{"title":string,"price":number,"sqm":number,"location":string,"yearBuilt":number,"floor":number,"kwh":number,"energyClass":string,"heating":string,"condition":string,"condoFees":number}

Regole rigide:
- price: prezzo di vendita o canone in euro, solo numero intero senza separatori (es. 120000)
- sqm: superficie in metri quadri, solo numero (es. 84)
- location: via, numero civico e comune (es. "Via Provinciale Superiore 49, Molinella")
- floor: numero intero del piano. Piano terra = 0. "1º piano" = 1
- yearBuilt: anno di costruzione (es. 1942)
- kwh: consumo energetico in kWh/m² anno (es. 346.7)
- energyClass: una sola tra "A4","A3","A2","A1","B","C","D","E","F","G". Cercala anche nella descrizione (a volte scritta come "C.E.: G" o "Classe G"). Se non e' esplicita, null
- heating: una sola tra "autonomo","centralizzato","assente"
- condition: una sola tra "ottimo","ristrutturato","buono","da_ristrutturare". Mappa "buono stato" e "abitabile" su "buono"
- condoFees: spese condominiali mensili in euro, solo numero
- Ignora menu, banner, cookie e annunci correlati: considera solo l'immobile principale
- Rispondi SOLO con il JSON, senza testo attorno.

TESTO:
`;

export async function parseTextWithAI(payload: ImportPayload): Promise<ImportDraft> {
  const hints = payload.hints && payload.hints.length
    ? `\n\nINDIZI AGGIUNTIVI (etichette di elementi grafici della pagina):\n${payload.hints.join('\n')}`
    : '';

  const prompt = EXTRACTION_PROMPT + (payload.text || '').slice(0, 15000) + hints;

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    throw new Error('Il servizio di lettura annunci non ha risposto. Riprova o inserisci i dati a mano.');
  }

  const data = await response.json();

  let parsed: any;
  try {
    parsed = JSON.parse(String(data.result || '').trim());
  } catch (e) {
    throw new Error('Non sono riuscito a leggere l\'annuncio. Inserisci i dati a mano.');
  }

  let host = '';
  try { host = new URL(payload.url).hostname.replace(/^www\./, ''); } catch (e) { /* url malformato */ }

  const draft: ImportDraft = {
    title: parsed.title || payload.title || undefined,
    price: toNumber(parsed.price),
    sqm: toNumber(parsed.sqm),
    location: parsed.location || undefined,
    link: payload.url,
    yearBuilt: toNumber(parsed.yearBuilt),
    floor: toNumber(parsed.floor),
    kwh: toNumber(parsed.kwh),
    energyClass: mapEnergyClass(parsed.energyClass),
    heating: mapHeating(parsed.heating),
    condition: mapCondition(parsed.condition),
    condoFees: toNumber(parsed.condoFees),
    source: host || 'annuncio'
  };

  // Nota: da questi portali non arrivano coordinate.
  // L'immobile verra' geocodificato dall'app come qualsiasi inserimento manuale.
  return stripUndefined(draft) as ImportDraft;
}

/* ------------------------------------------------------------------ */

export async function buildDraft(payload: ImportPayload): Promise<ImportDraft> {
  if (payload.mode === 'exact') return normalizeExact(payload.data, payload.url);
  return parseTextWithAI(payload);
}
