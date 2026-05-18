import { VercelRequest, VercelResponse } from '@vercel/node';

// Mappa condizione italiana → valore interno
function mapCondition(raw: string): string | undefined {
  const s = raw.toLowerCase();
  if (s.includes('ottimo')) return 'ottimo';
  if (s.includes('ristrutturato') && !s.includes('ristrutturare')) return 'ristrutturato';
  if (s.includes('ristrutturare')) return 'da_ristrutturare';
  if (s.includes('buono') || s.includes('abitabile')) return 'buono';
  return undefined;
}

// Mappa riscaldamento italiano → valore interno
function mapHeating(raw: string): string | undefined {
  const s = raw.toLowerCase();
  if (s.includes('autonomo')) return 'autonomo';
  if (s.includes('centralizzato')) return 'centralizzato';
  if (s.includes('assente') || s.includes('inesistente')) return 'assente';
  return undefined;
}

// Estrae numero dal piano ("Piano terra, 1" → 1, "Piano terra" → 0, "3" → 3)
function parseFloor(raw: string): number | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  if (s.includes('terra') && !s.match(/\d/)) return 0;
  const nums = raw.match(/\d+/g);
  if (nums) return Math.max(...nums.map(Number));
  return undefined;
}

// Estrae numero da stringa superficie ("114 m²" → 114)
function parseSqm(raw: string): number {
  const n = parseInt(raw.replace(/\D/g, ''));
  return isNaN(n) ? 0 : n;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body || {};

  if (!url || typeof url !== 'string' || !url.includes('immobiliare.it/annunci/')) {
    return res.status(400).json({ error: 'URL non valido — inserisci un link a un annuncio immobiliare.it' });
  }

  let html: string;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Errore nel recupero della pagina (HTTP ${response.status})` });
    }

    html = await response.text();
  } catch (err: any) {
    return res.status(502).json({ error: `Impossibile raggiungere immobiliare.it: ${err.message}` });
  }

  // Verifica DataDome
  if (html.length < 10000 || html.includes('captcha-delivery.com')) {
    return res.status(503).json({ error: 'Pagina bloccata da sistema anti-bot — riprova tra qualche minuto' });
  }

  // Estrai __NEXT_DATA__
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    return res.status(422).json({ error: '__NEXT_DATA__ non trovato — la struttura della pagina potrebbe essere cambiata' });
  }

  let json: any;
  try {
    json = JSON.parse(match[1]);
  } catch {
    return res.status(422).json({ error: 'Errore nel parsing del JSON della pagina' });
  }

  const re = json?.props?.pageProps?.detailData?.realEstate;
  if (!re) {
    return res.status(422).json({ error: 'Struttura dati inattesa — percorso detailData.realEstate non trovato' });
  }

  const prop = re.properties?.[0];
  const loc = prop?.location;
  const energy = prop?.energy;

  // --- Mappatura campi ---

  const title: string = re.title || '';
  const price: number = re.price?.value || 0;
  const sqm: number = parseSqm(prop?.surface || '');
  const floor: number | undefined = parseFloor(prop?.floor?.value || '');
  const condition: string | undefined = mapCondition(prop?.condition || '');
  const heating: string | undefined = mapHeating(energy?.heatingType || '');

  // Classe energetica — normalizza (es. "E" → "E", "A+" → non mappato)
  const energyClassRaw: string = energy?.energyClass || energy?.energyStatus || '';
  const validClasses = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'];
  const energyClass: string | undefined = validClasses.includes(energyClassRaw.toUpperCase())
    ? energyClassRaw.toUpperCase()
    : undefined;

  // kWh/m²·anno — prova più percorsi
  let kwh: number | undefined;
  const kwhPaths = [
    energy?.prestazione?.consumo?.value,
    energy?.globalEnergyPerformanceIndex,
    energy?.annualEnergyConsumption,
  ];
  for (const v of kwhPaths) {
    if (v != null && !isNaN(parseFloat(v))) { kwh = parseFloat(v); break; }
  }
  // Fallback: cerca nel HTML "X kWh/m²" o "X kWh/m2"
  if (!kwh) {
    const kwhMatch = html.match(/(\d+(?:[.,]\d+)?)\s*kWh\/m[²2]/i);
    if (kwhMatch) kwh = parseFloat(kwhMatch[1].replace(',', '.'));
  }

  // Spese condominio
  let condoFees: number | undefined;
  const condoRaw = prop?.condominiumExpenses ?? prop?.monthlyCondominiumFees ?? prop?.condominium?.fees?.monthly;
  if (condoRaw != null && !isNaN(Number(condoRaw))) {
    condoFees = Number(condoRaw);
  }
  // Se la pagina dice esplicitamente "Nessuna spesa condominiale" → 0
  if (condoFees === undefined && html.includes('Nessuna spesa condominiale')) {
    condoFees = 0;
  }

  // Location: zona + comune
  const locationParts = [loc?.macrozone, loc?.city].filter(Boolean);
  const location: string = locationParts.length > 0 ? locationParts.join(', ') : (loc?.city || '');

  // Indirizzo completo per geocoding (usato da RadarCase come fa già AddHouseModal)
  const fullAddress: string = [loc?.address, loc?.streetNumber, loc?.city].filter(Boolean).join(' ');

  return res.status(200).json({
    title,
    price,
    sqm,
    location,
    fullAddress,   // campo extra — usato dal frontend per pre-popolare il campo location con indirizzo completo se disponibile
    link: url,
    floor,
    condition,
    heating,
    energyClass,
    kwh,
    condoFees,
  });
}
