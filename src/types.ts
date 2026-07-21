/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CommuteInfo {
  distance: string;
  duration?: string;
}

export interface House {
  id: string;
  type: 'buy' | 'rent';
  title: string;
  price: number;
  location: string;
  houseNumber?: string;
  sqm?: number;
  link: string;
  notes: string;
  visited: boolean;
  score: number; // 1-5
  createdAt: number;
  lat?: number | null;
  lng?: number | null;
  geocodingFailed?: boolean;
  commute?: {
    [destId: string]: CommuteInfo;
  };
  // Campi aggiuntivi per analisi AI
  yearBuilt?: number;
  floor?: number;
  condition?: 'ottimo' | 'ristrutturato' | 'buono' | 'da_ristrutturare';
  heating?: 'autonomo' | 'centralizzato' | 'assente';
  kwh?: number;
  energyClass?: 'A4' | 'A3' | 'A2' | 'A1' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  rentalContractType?: '4+4' | '3+2' | 'transitorio' | 'uso_studenti' | 'libero';
  condoFees?: number;
  // Stato disponibilità (scritto dallo script di controllo, non cancella mai l'immobile)
  availability?: 'available' | 'unavailable';
  lastCheckStatus?: 'available' | 'unavailable' | 'unknown';
  lastChecked?: number;      // epoch ms dell'ultimo controllo
  unavailableSince?: number; // epoch ms da quando risulta non più disponibile
}

export type BuyingStep = 'ricerca' | 'proposta' | 'compromesso' | 'mutuo' | 'rogito';

export interface Task {
  id: string;
  label: string;
  isMandatory: boolean;
  type?: 'checkbox' | 'document';
}

export interface StepInfo {
  id: BuyingStep;
  label: string;
  description: string;
  icon: string;
  tasks: Task[];
}

export const JOURNEY_STEPS: StepInfo[] = [
  {
    id: 'ricerca',
    label: 'Ricerca e Visite',
    description: 'Esplora il mercato, definisci il budget e inizia le visite.',
    icon: 'Search',
    tasks: [
      { id: 'fin_check', label: 'Verifica disponibilità finanziaria e pre-delibera mutuo', isMandatory: true, type: 'checkbox' },
      { id: 'budget', label: 'Definire budget massimo (incluse spese accessorie ~8-10%)', isMandatory: true, type: 'checkbox' },
      { id: 'zones', label: 'Selezionare zone di interesse', isMandatory: true, type: 'checkbox' },
      { id: 'visura_plan_visit', label: 'Richiesta visura catastale e planimetria prima della visita', isMandatory: false, type: 'document' },
      { id: 'first_visit', label: 'Effettuare la prima visita', isMandatory: false, type: 'checkbox' },
      { id: 'comparison', label: 'Confrontare almeno 3 immobili', isMandatory: false, type: 'checkbox' },
    ]
  },
  {
    id: 'proposta',
    label: 'Proposta d\'Acquisto',
    description: 'Verifiche tecniche e offerta formale al venditore.',
    icon: 'FileText',
    tasks: [
      { id: 'visura_ipotecaria', label: 'Verifica titolo di proprietà (visura ipotecaria)', isMandatory: true, type: 'document' },
      { id: 'no_liens', label: 'Verifica assenza ipoteche o vincoli', isMandatory: true, type: 'checkbox' },
      { id: 'rre_conformity', label: 'Richiesta RRE e conformità urbanistica', isMandatory: true, type: 'document' },
      { id: 'plans_check', label: 'Controllo planimetrie catastali', isMandatory: true, type: 'document' },
      { id: 'negotiation', label: 'Negoziazione prezzo e condizioni sospensive', isMandatory: false, type: 'checkbox' },
      { id: 'proposal_sign', label: 'Firma proposta d\'acquisto', isMandatory: true, type: 'document' },
      { id: 'deposit_pay', label: 'Versamento caparra confirmatoria (tipicamente 5-10%)', isMandatory: true, type: 'document' },
      { id: 'seller_accept', label: 'Accettazione scritta da parte del venditore', isMandatory: true, type: 'document' },
    ]
  },
  {
    id: 'compromesso',
    label: 'Compromesso',
    description: 'Contratto preliminare e accordi condominiali.',
    icon: 'Handshake',
    tasks: [
      { id: 'notaio_choice', label: 'Scelta del notaio', isMandatory: true, type: 'checkbox' },
      { id: 'condo_check', label: 'Verifica spese condominiali e delibere pendenti', isMandatory: true, type: 'document' },
      { id: 'preliminary_draft', label: 'Lettura e approvazione bozza del preliminare', isMandatory: true, type: 'document' },
      { id: 'registration', label: 'Registrazione atto preliminare (entro 20 gg dalla firma)', isMandatory: true, type: 'document' },
      { id: 'extra_deposit', label: 'Versamento eventuale integrazione caparra', isMandatory: false, type: 'document' },
      { id: 'parallel_mortgage', label: 'Avvio parallelo istruttoria mutuo', isMandatory: true, type: 'checkbox' },
    ]
  },
  {
    id: 'mutuo',
    label: 'Istruttoria Mutuo',
    description: 'Pratiche bancarie, perizia e delibera finale.',
    icon: 'Banknote',
    tasks: [
      { id: 'bank_choice', label: 'Scelta banca e tipo tasso (fisso/variabile/misto)', isMandatory: true, type: 'checkbox' },
      { id: 'docs_handover', label: 'Consegna documenti a consulente/banca', isMandatory: true, type: 'document' },
      { id: 'bank_account', label: 'Apertura conto corrente con la banca se richiesto', isMandatory: false, type: 'checkbox' },
      { id: 'valuation', label: 'Sopralluogo perito tecnico (perizia immobile)', isMandatory: true, type: 'document' },
      { id: 'approval', label: 'Ottenimento delibera definitiva', isMandatory: true, type: 'document' },
      { id: 'loan_sign', label: 'Lettura e firma contratto di mutuo', isMandatory: true, type: 'document' },
    ]
  },
  {
    id: 'rogito',
    label: 'Rogito Notarile',
    description: 'Atto finale, consegna chiavi e adempimenti post-vendita.',
    icon: 'Key',
    tasks: [
      { id: 'notary_draft', label: 'Ricevere bozza atto notarile (almeno 2-3 gg prima)', isMandatory: true, type: 'document' },
      { id: 'draft_verify', label: 'Verifica bozza con il proprio notaio o legale', isMandatory: true, type: 'checkbox' },
      { id: 'final_payment', label: 'Esecuzione bonifico di saldo', isMandatory: true, type: 'document' },
      { id: 'deed_sign', label: 'Firma rogito e contestuale atto di mutuo', isMandatory: true, type: 'document' },
      { id: 'keys_handover', label: 'Consegna chiavi e presa di possesso', isMandatory: true, type: 'checkbox' },
      { id: 'condo_comms', label: 'Comunicazione acquisto all\'amministratore condominiale', isMandatory: false, type: 'document' },
      { id: 'utilities', label: 'Volture utenze (Luce, Gas, Tari)', isMandatory: false, type: 'checkbox' },
      { id: 'insurance', label: 'Stipula assicurazione casa', isMandatory: false, type: 'document' },
      { id: 'residence_change', label: 'Cambio residenza entro 18 mesi', isMandatory: false, type: 'document' },
    ]
  },
];

export interface Destination {
  id: string;          // stabile; 'daughter'/'work' per i predefiniti, generato per gli altri
  label: string;
  address: string;
  houseNumber?: string;
  zip?: string;
  city?: string;
  short: string;
  lat: number;
  lng: number;
  isDefault?: boolean; // true per Figlia/Lavoro: non eliminabili
}

export interface UserSettings {
  appMode: 'buy' | 'rent';
  buy: {
    destinations: Destination[];
  };
  rent: {
    destinations: Destination[];
  };
}

function emptyDest(id: string, isDefault: boolean): Destination {
  return { id, label: '', address: '', houseNumber: '', zip: '', city: '', short: '', lat: 0, lng: 0, isDefault };
}

// I due predefiniti, sempre presenti e non eliminabili.
export function makeDefaultDestinations(): Destination[] {
  return [emptyDest('daughter', true), emptyDest('work', true)];
}

// Genera un id per una nuova destinazione aggiunta dall'utente.
export function newDestinationId(): string {
  return 'dest_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Migrazione: accetta sia il vecchio formato { daughter, work } sia il nuovo array,
 * e restituisce SEMPRE un array che inizia con i due predefiniti (id daughter, work),
 * seguiti dagli eventuali extra. Nessun dato viene perso.
 */
export function normalizeDestinations(raw: any): Destination[] {
  const coerce = (d: any, id: string, isDefault: boolean): Destination => ({
    id: (d && d.id) ? d.id : id,
    label: (d && d.label) ?? '',
    address: (d && d.address) ?? '',
    houseNumber: (d && d.houseNumber) ?? '',
    zip: (d && d.zip) ?? '',
    city: (d && d.city) ?? '',
    short: (d && d.short) ?? '',
    lat: (d && typeof d.lat === 'number') ? d.lat : 0,
    lng: (d && typeof d.lng === 'number') ? d.lng : 0,
    isDefault,
  });

  let daughterRaw: any, workRaw: any, extrasRaw: any[] = [];

  if (Array.isArray(raw)) {
    daughterRaw = raw.find(d => d && d.id === 'daughter');
    workRaw = raw.find(d => d && d.id === 'work');
    extrasRaw = raw.filter(d => d && d.id !== 'daughter' && d.id !== 'work');
  } else if (raw && typeof raw === 'object') {
    daughterRaw = raw.daughter;
    workRaw = raw.work;
    extrasRaw = Object.keys(raw)
      .filter(k => k !== 'daughter' && k !== 'work' && raw[k] && typeof raw[k] === 'object')
      .map(k => ({ ...raw[k], id: raw[k].id || k }));
  }

  const daughter = coerce(daughterRaw, 'daughter', true);
  const work = coerce(workRaw, 'work', true);
  const extras = extrasRaw.map((d, i) => coerce(d, (d && d.id) || newDestinationId() + i, false));
  return [daughter, work, ...extras];
}

// Migra l'intero oggetto impostazioni letto da Firestore.
export function migrateSettings(data: any): UserSettings {
  const legacyTop = data && data.destinations; // vecchissimo formato con destinations top-level
  const buyRaw = (data && data.buy && data.buy.destinations) || legacyTop;
  const rentRaw = (data && data.rent && data.rent.destinations) || legacyTop;
  return {
    appMode: (data && data.appMode === 'rent') ? 'rent' : 'buy',
    buy: { destinations: normalizeDestinations(buyRaw) },
    rent: { destinations: normalizeDestinations(rentRaw) },
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  appMode: 'buy',
  buy: {
    destinations: makeDefaultDestinations()
  },
  rent: {
    destinations: makeDefaultDestinations()
  }
};
