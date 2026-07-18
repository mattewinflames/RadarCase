import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, MapPin, Trash2, Navigation, Check, AlertCircle, RefreshCw, MoreVertical, Sparkles, X, Edit2 } from 'lucide-react';
import { House, UserSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { deleteField } from '../lib/firebase';
import HeartRating from './HeartRating';

interface HouseCardProps {
  house: House;
  settings: UserSettings;
  onDelete: (id: string) => Promise<void> | void;
  onToggleVisited: (id: string) => Promise<void> | void;
  onUpdate: (id: string, updates: Partial<House>) => Promise<void> | void;
  onRetryGeocoding?: (id: string) => Promise<void> | void;
  isSelected?: boolean;
  onSelect?: () => void;
}

const conditionLabel: Record<string, string> = {
  ottimo: 'Ottimo',
  ristrutturato: 'Ristrutturato',
  buono: 'Buono',
  da_ristrutturare: 'Da ristrutturare',
};

const heatingLabel: Record<string, string> = {
  autonomo: 'Autonomo',
  centralizzato: 'Centralizzato',
  assente: 'Assente',
};

const HouseCard: React.FC<HouseCardProps> = ({ house, settings, onDelete, onToggleVisited, onUpdate, onRetryGeocoding, isSelected, onSelect }) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [isEditingSqm, setIsEditingSqm] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    yearBuilt: house.yearBuilt?.toString() || '',
    floor: house.floor?.toString() || '',
    kwh: house.kwh?.toString() || '',
    condition: house.condition || '' as House['condition'] | '',
    heating: house.heating || '' as House['heating'] | '',
    energyClass: house.energyClass || '' as House['energyClass'] | '',
    rentalContractType: house.rentalContractType || '' as House['rentalContractType'] | '',
    condoFees: house.condoFees?.toString() || '',
  });
  const [questions, setQuestions] = useState<string[]>([]);
  // Valutazione fattuale generata insieme alle domande: punti di forza e criticità.
  const [assessment, setAssessment] = useState<{ strengths: string[]; concerns: string[] } | null>(null);
  const [checkedQuestions, setCheckedQuestions] = useState<Set<number>>(new Set());
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const formatItalianNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const [tempPriceInput, setTempPriceInput] = useState(formatItalianNumber(house.price.toString()));
  const [tempSqmInput, setTempSqmInput] = useState(house.sqm?.toString() || '');
  const [tempLocationInput, setTempLocationInput] = useState(house.location);
  const [tempNotesInput, setTempNotesInput] = useState(house.notes || '');

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatItalianNumber(e.target.value);
    setTempPriceInput(formatted);
  };

  const handleSavePrice = () => {
    const numericValue = Number(tempPriceInput.replace(/\D/g, ''));
    if (numericValue <= 0) {
      setTempPriceInput(formatItalianNumber(house.price.toString()));
      setIsEditingPrice(false);
      return;
    }
    onUpdate(house.id, { price: numericValue });
    setIsEditingPrice(false);
  };

  const handleSaveSqm = () => {
    const numericValue = Number(tempSqmInput.replace(/\D/g, ''));
    if (numericValue <= 0) {
      setTempSqmInput(house.sqm?.toString() || '');
      setIsEditingSqm(false);
      return;
    }
    onUpdate(house.id, { sqm: numericValue });
    setIsEditingSqm(false);
  };

  const handleSaveLocation = () => {
    if (tempLocationInput.trim() && tempLocationInput !== house.location) {
      onUpdate(house.id, { 
        location: tempLocationInput.trim(),
        lat: null as any,
        lng: null as any,
        geocodingFailed: false
      });
    } else {
      setTempLocationInput(house.location);
    }
    setIsEditingLocation(false);
  };

  const handleSaveNotes = () => {
    onUpdate(house.id, { notes: tempNotesInput.trim() });
    setIsEditingNotes(false);
  };

  const getGoogleMapsRoute = (dest: { address: string, houseNumber?: string, zip?: string, city?: string, lat?: number, lng?: number }) => {
    // Use coordinates for destination if available — more precise
    if (dest.lat && dest.lng) {
      const origin = house.houseNumber
        ? `${house.location} ${house.houseNumber.trim()}`
        : house.location;
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${dest.lat},${dest.lng}&travelmode=driving`;
    }

    let destStr = dest.address;
    if (dest.houseNumber) destStr += ` ${dest.houseNumber}`;
    if (dest.zip) destStr += `, ${dest.zip}`;
    if (dest.city) destStr += `, ${dest.city}`;
    if (!destStr.toLowerCase().includes('italy')) destStr += ', Italy';

    const origin = house.houseNumber
      ? `${house.location} ${house.houseNumber.trim()}`
      : house.location;

    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destStr)}&travelmode=driving`;
  };

  const handleAnalyze = async () => {
    setMenuOpen(false);
    setQuestionsOpen(true);
    if (questions.length > 0 || assessment) return; // già analizzato
    setLoadingQuestions(true);
    try {
      const contractType = house.type === 'buy' ? 'acquisto' : 'affitto';
      const pricePerSqm = house.sqm && house.sqm > 0
        ? Math.round(house.price / house.sqm)
        : null;
      const details = [
        house.yearBuilt ? `Anno di costruzione: ${house.yearBuilt}` : null,
        house.floor !== undefined ? `Piano: ${house.floor}` : null,
        house.kwh ? `Consumo energetico: ${house.kwh} kWh/m² anno` : null,
        house.condition ? `Stato: ${conditionLabel[house.condition]}` : null,
        house.heating ? `Riscaldamento: ${heatingLabel[house.heating]}` : null,
        house.energyClass ? `Classe energetica: ${house.energyClass}` : null,
        house.sqm ? `Superficie: ${house.sqm} mq` : null,
        pricePerSqm ? `Prezzo al m²: circa €${pricePerSqm.toLocaleString('it-IT')}/m²` : null,
        house.condoFees ? `Spese condominiali: €${house.condoFees}/mese` : null,
        house.notes ? `Note personali dell'utente: ${house.notes}` : null,
      ].filter(Boolean).join('\n');

      const prompt = `Sei un consulente immobiliare indipendente e schietto che aiuta un privato a valutare un annuncio. Analizza questo immobile basandoti ESCLUSIVAMENTE sui dati qui sotto.

Immobile: ${house.title}
Tipo contratto: ${contractType.charAt(0).toUpperCase() + contractType.slice(1)}
Indirizzo: ${house.location}
Prezzo: €${house.price.toLocaleString('it-IT')}
${details}

Restituisci un oggetto JSON con questa struttura ESATTA:
{"strengths": ["..."], "concerns": ["..."], "questions": ["..."]}

- strengths: 2-4 punti di forza REALI e concreti, dedotti dai dati (non dagli aggettivi dell'annuncio). Se i dati non ne mostrano di evidenti, restituisci un array vuoto.
- concerns: 2-4 criticità o aspetti da verificare. Dai priorità alle INCONGRUENZE tra i numeri: prezzo al m² fuori scala per la zona, superficie o piano incoerenti, classe energetica non coerente col consumo dichiarato, piano alto senza ascensore, spese condominiali elevate, immobile datato senza ristrutturazione. Sii diretto.
- questions: 12-15 domande pratiche e mirate da fare in visita, adatte a un contratto di ${contractType}.

Regole rigide:
- Basati SOLO sui dati forniti. NON ripetere gli aggettivi promozionali tipici degli annunci ("luminoso", "accogliente", "contesto riservato"): sono marketing, non fatti.
- Se un dato manca o non è verificabile, NON inventarlo: trasformalo in una domanda.
- NON esprimere giudizi su ciò che non puoi vedere dai dati: qualità delle foto, luminosità reale, rumore della zona, stato preciso delle finiture.
- Ogni voce è una frase breve e concreta, in italiano.
- Rispondi SOLO con il JSON, senza markdown, senza backtick, senza testo aggiuntivo.`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'analysis' })
      });

      const data = await response.json();
      const clean = data.result.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(clean);

      setQuestions(Array.isArray(parsed.questions) ? parsed.questions : []);
      setAssessment({
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      });
    } catch (e) {
      setAssessment(null);
      setQuestions(['Errore nella generazione. Riprova.']);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onRetryGeocoding) {
      setIsRetrying(true);
      await onRetryGeocoding(house.id);
      setIsRetrying(false);
    }
  };

  const currentDestinations = settings[settings.appMode].destinations;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ 
          y: -5,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          borderColor: isSelected ? "rgb(37, 99, 235)" : "rgb(148, 163, 184)"
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={() => onSelect?.()}
        className={`relative cursor-pointer bg-white border-2 rounded-[24px] overflow-hidden group shadow-sm transition-colors duration-200 ${
          isSelected ? 'border-blue-600 ring-4 ring-blue-50' : 'border-slate-200'
        }`}
        id={`house-card-${house.id}`}
      >
        {isSelected && (
          <div className="absolute top-0 right-0 p-2 z-10">
            <div className="bg-blue-600 text-white rounded-full p-1 shadow-lg">
              <Check className="w-3 h-3" />
            </div>
          </div>
        )}
        
        <div className="p-5">
          {/* Header */}
          <div className="flex justify-between items-start mb-3" onClick={e => e.stopPropagation()}>
            <button 
              id={`toggle-visited-${house.id}`}
              onClick={() => onToggleVisited(house.id)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                house.visited ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              {house.visited ? 'VISITATA' : 'DA VISITARE'}
            </button>

            {/* Context menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Azioni"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden min-w-[200px] py-1"
                  >
                    {onRetryGeocoding && house.lat && house.lng && (
                      <button
                        onClick={handleRetry}
                        disabled={isRetrying}
                        className="w-full flex items-center justify-start gap-2.5 px-4 py-2.5 text-sm leading-5 whitespace-nowrap text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                        Ricalcola distanze
                      </button>
                    )}
                    <button
                      onClick={() => { setMenuOpen(false); setDetailsOpen(true); }}
                      className="w-full flex items-center justify-start gap-2.5 px-4 py-2.5 text-sm leading-5 whitespace-nowrap text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Modifica dettagli
                    </button>
                    <button
                      onClick={handleAnalyze}
                      className="w-full flex items-center justify-start gap-2.5 px-4 py-2.5 text-sm leading-5 whitespace-nowrap text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Analizza annuncio
                    </button>
                    <div className="border-t border-slate-100" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(house.id); }}
                      className="w-full flex items-center justify-start gap-2.5 px-4 py-2.5 text-sm leading-5 whitespace-nowrap text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Elimina
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-900 mb-1 truncate">
            {house.title}
          </h3>
          
          {/* Location */}
          <div className="mb-4" onClick={e => e.stopPropagation()}>
            {isEditingLocation ? (
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-blue-500" />
                <input 
                  autoFocus
                  type="text"
                  className="flex-1 bg-slate-50 border border-blue-200 rounded px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={tempLocationInput}
                  onChange={e => setTempLocationInput(e.target.value)}
                  onBlur={handleSaveLocation}
                  onKeyDown={e => e.key === 'Enter' && handleSaveLocation()}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <p 
                  onClick={() => setIsEditingLocation(true)}
                  className="text-xs text-slate-500 flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 px-1 -ml-1 rounded transition-colors group/loc"
                  title="Clicca per modificare l'indirizzo"
                >
                  <MapPin className={`w-3 h-3 ${house.geocodingFailed ? 'text-red-500' : (!house.lat && !house.lng) ? 'text-blue-400 animate-pulse' : 'text-slate-400 group-hover/loc:text-blue-500'}`} />
                  <span className="truncate">{house.location}{house.houseNumber ? ` ${house.houseNumber}` : ''}</span>
                  {house.geocodingFailed && <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />}
                </p>
                {house.geocodingFailed && (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[9px] text-red-600 font-bold uppercase tracking-tight">Posizione non trovata</p>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (onRetryGeocoding) {
                          setIsRetrying(true);
                          await onRetryGeocoding(house.id);
                          setIsRetrying(false);
                        }
                      }}
                      disabled={isRetrying}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[9px] font-bold uppercase hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isRetrying ? 'animate-spin' : ''}`} />
                      Riprova
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price, sqm, score */}
          <div className="flex items-center gap-3 mb-6" onClick={e => e.stopPropagation()}>
            {isEditingPrice ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-600">€</span>
                <input 
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  className="w-24 bg-slate-50 border border-blue-200 rounded px-2 py-0.5 text-sm font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={tempPriceInput}
                  onChange={handlePriceInputChange}
                  onBlur={handleSavePrice}
                  onKeyDown={e => e.key === 'Enter' && handleSavePrice()}
                />
              </div>
            ) : (
              <span 
                onClick={() => {
                  setTempPriceInput(formatItalianNumber(house.price.toString()));
                  setIsEditingPrice(true);
                }}
                className="text-sm font-bold text-blue-600 uppercase cursor-pointer hover:bg-blue-50 px-1 rounded transition-colors"
                title="Clicca per modificare il prezzo"
              >
                € {house.price.toLocaleString('it-IT')}{(house.type || 'buy') === 'rent' && ' / mese'}
              </span>
            )}
            
            <div className="flex items-center gap-1.5 border-l border-slate-100 pl-3">
              {isEditingSqm ? (
                <input 
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  className="w-12 bg-slate-50 border border-blue-200 rounded px-1 py-0.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={tempSqmInput}
                  onChange={e => setTempSqmInput(e.target.value)}
                  onBlur={handleSaveSqm}
                  onKeyDown={e => e.key === 'Enter' && handleSaveSqm()}
                />
              ) : (
                <span 
                  onClick={() => setIsEditingSqm(true)}
                  className="text-[11px] font-bold text-slate-600 hover:bg-slate-50 px-1 rounded transition-colors"
                  title="Clicca per modificare i mq"
                >
                  {house.sqm || '-'} mq²
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-100 pl-3" onClick={e => e.stopPropagation()}>
              <HeartRating
                value={house.score}
                onChange={v => onUpdate(house.id, { score: v })}
                size="sm"
                showLabel={false}
              />
            </div>
          </div>

          {/* Commute */}
          <div className="grid grid-cols-2 gap-3 mb-2" onClick={e => e.stopPropagation()}>
            {currentDestinations.daughter.label && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">{currentDestinations.daughter.label}</p>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-lg font-light text-slate-900">
                    {(!house.commute?.daughter.distance || parseFloat(house.commute.daughter.distance.toString()) > 4000) ? '-' : house.commute.daughter.distance}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">km</span>
                  {house.commute?.daughter.duration && (
                    <span className="text-[10px] text-slate-400 ml-1">• {house.commute.daughter.duration}</span>
                  )}
                </div>
              </div>
            )}
            
            {currentDestinations.work.label && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">{currentDestinations.work.label}</p>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-lg font-light text-slate-900">
                    {(!house.commute?.work.distance || parseFloat(house.commute.work.distance.toString()) > 4000) ? '-' : house.commute.work.distance}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">km</span>
                  {house.commute?.work.duration && (
                    <span className="text-[10px] text-slate-400 ml-1">• {house.commute.work.duration}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Extra details badge row */}
          {(house.condition || house.energyClass || house.yearBuilt || house.heating) && (
            <div className="flex flex-wrap gap-2 mb-4 mt-2" onClick={e => e.stopPropagation()}>
              {house.condition && (
                <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-600 text-[9px] font-semibold uppercase tracking-wide rounded-full border border-slate-200">
                  {conditionLabel[house.condition]}
                </span>
              )}
              {house.energyClass && (
                <div className="relative group/energy">
                  <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-semibold uppercase tracking-wide rounded-full border border-emerald-200 cursor-default">
                    Classe {house.energyClass}
                  </span>
                  {(house.kwh || house.sqm) && (
                    <div className="absolute bottom-full left-0 mb-2 z-20 hidden group-hover/energy:block">
                      <div className="bg-slate-900 text-white text-[10px] rounded-xl px-3 py-2 shadow-xl whitespace-nowrap">
                        {house.kwh && (
                          <p>⚡ {house.kwh} kWh/m²·anno</p>
                        )}
                        {house.kwh && house.sqm && (
                          <p className="mt-0.5 text-green-300">
                            💰 ~€ {Math.round(house.kwh * house.sqm / 10 * 0.75).toLocaleString('it-IT')} / anno stimati
                          </p>
                        )}
                        <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-900" />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {house.yearBuilt && (
                <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-600 text-[9px] font-semibold uppercase tracking-wide rounded-full border border-slate-200">
                  {house.yearBuilt}
                </span>
              )}
              {house.heating && (
                <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-600 text-[9px] font-semibold uppercase tracking-wide rounded-full border border-slate-200">
                  Risc. {heatingLabel[house.heating]}
                </span>
              )}
            </div>
          )}

          {/* Notes */}
          <div 
            onClick={e => e.stopPropagation()}
            onDoubleClick={() => {
              setTempNotesInput(house.notes || '');
              setIsEditingNotes(true);
            }}
            className="relative"
          >
            {isEditingNotes ? (
              <textarea
                autoFocus
                className="w-full p-3 bg-white border border-blue-200 rounded-xl text-slate-700 text-[11px] leading-relaxed mb-4 outline-none ring-2 ring-blue-500/20"
                value={tempNotesInput}
                onChange={e => setTempNotesInput(e.target.value)}
                onBlur={handleSaveNotes}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveNotes(); }
                  if (e.key === 'Escape') setIsEditingNotes(false);
                }}
                rows={3}
              />
            ) : (
              <div 
                className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 italic text-slate-500 text-[11px] leading-relaxed mb-4 cursor-text hover:bg-slate-50 transition-colors"
                title="Doppio clic per modificare le note"
              >
                {house.notes || 'Aggiungi note...'}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            <a 
              href={house.link} 
              target="_blank" 
              rel="noreferrer"
              className="flex-1 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              id={`link-ad-${house.id}`}
            >
              Annuncio
            </a>
            {currentDestinations.daughter.label && currentDestinations.daughter.address && (
              <button 
                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                title={`Percorso verso ${currentDestinations.daughter.label}`}
                onClick={() => window.open(getGoogleMapsRoute(currentDestinations.daughter), '_blank')}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">{currentDestinations.daughter.short}</span>
              </button>
            )}
            {currentDestinations.work.label && currentDestinations.work.address && (
              <button 
                className="px-3 py-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors flex items-center gap-2"
                title={`Percorso verso ${currentDestinations.work.label}`}
                onClick={() => window.open(getGoogleMapsRoute(currentDestinations.work), '_blank')}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">{currentDestinations.work.short}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Questions Modal */}
      <AnimatePresence>
        {questionsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuestionsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[201] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <h2 className="text-base font-bold text-slate-800">Analisi dell'annuncio</h2>
                  </div>
                  <p className="text-[10px] text-slate-400">{house.title}</p>
                </div>
                <button
                  onClick={() => setQuestionsOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingQuestions ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-400">Analisi in corso...</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {assessment && (assessment.strengths.length > 0 || assessment.concerns.length > 0) && (
                      <div className="space-y-3">
                        {assessment.strengths.length > 0 && (
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
                            <div className="flex items-center gap-1.5 mb-2 text-emerald-700">
                              <Check className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Punti di forza</span>
                            </div>
                            <ul className="space-y-1.5">
                              {assessment.strengths.map((s, i) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-700 leading-snug">
                                  <span className="text-emerald-500 shrink-0">•</span>{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {assessment.concerns.length > 0 && (
                          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5">
                            <div className="flex items-center gap-1.5 mb-2 text-amber-700">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Da verificare</span>
                            </div>
                            <ul className="space-y-1.5">
                              {assessment.concerns.map((c, i) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-700 leading-snug">
                                  <span className="text-amber-500 shrink-0">•</span>{c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 leading-relaxed px-1">
                          Valutazione basata solo sui dati dell'annuncio: non tiene conto di foto, stato reale o caratteristiche della zona.
                        </p>
                      </div>
                    )}

                    {questions.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">
                          Domande per la visita
                        </p>
                        <div className="space-y-2">
                          {questions.map((q, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                const next = new Set(checkedQuestions);
                                next.has(i) ? next.delete(i) : next.add(i);
                                setCheckedQuestions(next);
                              }}
                              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                checkedQuestions.has(i)
                                  ? 'bg-green-50 border-green-200 text-slate-400 line-through'
                                  : 'bg-slate-50 border-slate-100 hover:border-blue-200 hover:bg-blue-50/30'
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                                checkedQuestions.has(i) ? 'bg-green-500 border-green-500' : 'border-slate-300'
                              }`}>
                                {checkedQuestions.has(i) && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-sm text-slate-700 leading-relaxed">{q}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!loadingQuestions && (questions.length > 0 || assessment) && (
                <div className="p-4 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => {
                      let text = `Analisi annuncio — ${house.title}\n`;
                      if (assessment && assessment.strengths.length > 0) {
                        text += `\nPunti di forza:\n` + assessment.strengths.map(s => `• ${s}`).join('\n') + '\n';
                      }
                      if (assessment && assessment.concerns.length > 0) {
                        text += `\nDa verificare:\n` + assessment.concerns.map(c => `• ${c}`).join('\n') + '\n';
                      }
                      if (questions.length > 0) {
                        text += `\nDomande per la visita:\n` + questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
                      }
                      const blob = new Blob([text], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `analisi-${house.title.replace(/\s+/g, '-').toLowerCase()}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-colors"
                  >
                    ↓ Scarica
                  </button>
                  <button
                    onClick={() => {
                      setQuestions([]);
                      setAssessment(null);
                      setCheckedQuestions(new Set());
                      handleAnalyze();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Rigenera
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Details editing panel */}
      <AnimatePresence>
        {detailsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[201] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Edit2 className="w-4 h-4 text-slate-500" />
                    <h2 className="text-base font-bold text-slate-800">Dettagli immobile</h2>
                  </div>
                  <p className="text-[10px] text-slate-400">{house.title}</p>
                </div>
                <button
                  onClick={() => setDetailsOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Anno costruzione</label>
                    <input
                      type="number"
                      placeholder="es. 1980"
                      min="1800"
                      max={new Date().getFullYear()}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      value={detailsForm.yearBuilt}
                      onChange={e => setDetailsForm({...detailsForm, yearBuilt: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Piano</label>
                    <input
                      type="number"
                      placeholder="es. 2"
                      min="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      value={detailsForm.floor}
                      onChange={e => setDetailsForm({...detailsForm, floor: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">kWh/m² anno</label>
                    <input
                      type="number"
                      placeholder="es. 145"
                      min="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      value={detailsForm.kwh}
                      onChange={e => setDetailsForm({...detailsForm, kwh: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Classe energetica</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-700"
                      value={detailsForm.energyClass}
                      onChange={e => setDetailsForm({...detailsForm, energyClass: e.target.value as House['energyClass']})}
                    >
                      <option value="">-</option>
                      {['A4','A3','A2','A1','B','C','D','E','F','G'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Stato immobile</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-700"
                    value={detailsForm.condition}
                    onChange={e => setDetailsForm({...detailsForm, condition: e.target.value as House['condition']})}
                  >
                    <option value="">-</option>
                    <option value="ottimo">Ottimo</option>
                    <option value="ristrutturato">Ristrutturato</option>
                    <option value="buono">Buono</option>
                    <option value="da_ristrutturare">Da ristrutturare</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Riscaldamento</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-700"
                    value={detailsForm.heating}
                    onChange={e => setDetailsForm({...detailsForm, heating: e.target.value as House['heating']})}
                  >
                    <option value="">-</option>
                    <option value="autonomo">Autonomo</option>
                    <option value="centralizzato">Centralizzato</option>
                    <option value="assente">Assente</option>
                  </select>
                </div>

                {house.type === 'rent' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Tipo contratto</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-700"
                      value={detailsForm.rentalContractType}
                      onChange={e => setDetailsForm({...detailsForm, rentalContractType: e.target.value as House['rentalContractType']})}
                    >
                      <option value="">-</option>
                      <option value="4+4">4+4</option>
                      <option value="3+2">3+2</option>
                      <option value="transitorio">Transitorio</option>
                      <option value="uso_studenti">Uso studenti</option>
                      <option value="libero">Libero</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Spese condominio (€/mese)</label>
                  <input
                    type="number"
                    placeholder="es. 120"
                    min="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    value={detailsForm.condoFees}
                    onChange={e => setDetailsForm({...detailsForm, condoFees: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    // Ogni campo viene sempre incluso: se valorizzato scrive il valore,
                    // se svuotato usa deleteField() per RIMUOVERLO da Firestore.
                    // Così un campo già impostato può essere azzerato (prima restava il vecchio valore).
                    const updates: Record<string, any> = {
                      yearBuilt: detailsForm.yearBuilt ? Number(detailsForm.yearBuilt) : deleteField(),
                      floor: detailsForm.floor !== '' ? Number(detailsForm.floor) : deleteField(),
                      kwh: detailsForm.kwh ? Number(detailsForm.kwh) : deleteField(),
                      condition: detailsForm.condition ? detailsForm.condition : deleteField(),
                      heating: detailsForm.heating ? detailsForm.heating : deleteField(),
                      energyClass: detailsForm.energyClass ? detailsForm.energyClass : deleteField(),
                      rentalContractType: detailsForm.rentalContractType ? detailsForm.rentalContractType : deleteField(),
                      condoFees: detailsForm.condoFees !== '' ? Number(detailsForm.condoFees) : deleteField(),
                    };
                    onUpdate(house.id, updates as Partial<House>);
                    setDetailsOpen(false);
                  }}
                  className="w-full bg-slate-900 text-white rounded-xl py-3 font-bold uppercase tracking-widest text-[11px] hover:bg-slate-800 transition-all"
                >
                  Salva dettagli
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default HouseCard;
