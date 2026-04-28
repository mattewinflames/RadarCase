import React, { useState } from 'react';
import { ExternalLink, MapPin, Trash2, Navigation, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { House, UserSettings } from '../types';
import { motion } from 'motion/react';

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

const HouseCard: React.FC<HouseCardProps> = ({ house, settings, onDelete, onToggleVisited, onUpdate, onRetryGeocoding, isSelected, onSelect }) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  const formatItalianNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const [tempPriceInput, setTempPriceInput] = useState(formatItalianNumber(house.price.toString()));
  const [isEditingSqm, setIsEditingSqm] = useState(false);
  const [tempSqmInput, setTempSqmInput] = useState(house.sqm?.toString() || '');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [tempLocationInput, setTempLocationInput] = useState(house.location);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotesInput, setTempNotesInput] = useState(house.notes || '');

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

  const getGoogleMapsRoute = (dest: { address: string, houseNumber?: string, zip?: string, city?: string, lat?: number, lng?: number }) => {
    let destStr = dest.address;
    if (dest.houseNumber) destStr += ` ${dest.houseNumber}`;
    if (dest.zip) destStr += `, ${dest.zip}`;
    if (dest.city) destStr += `, ${dest.city}`;
    if (!destStr.toLowerCase().includes('italy')) destStr += ', Italy';
    
    if (!dest.address && dest.lat && dest.lng) {
      destStr = `${dest.lat},${dest.lng}`;
    }

    // ✅ FIX: include il numero civico nell'indirizzo di origine
    const origin = house.houseNumber
      ? `${house.location} ${house.houseNumber.trim()}`
      : house.location;
    
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destStr)}&travelmode=driving`;
  };

  const handleSaveNotes = () => {
    onUpdate(house.id, { notes: tempNotesInput.trim() });
    setIsEditingNotes(false);
  };

  const currentDestinations = settings[settings.appMode].destinations;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -5,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        borderColor: isSelected ? "rgb(37, 99, 235)" : "rgb(148, 163, 184)"
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 30 
      }}
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
          <div className="flex items-center gap-1">
            <button 
              id={`delete-${house.id}`}
              onClick={() => onDelete(house.id)}
              className="text-slate-300 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-1 truncate">
          {house.title}
        </h3>
        
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
                {house.geocodingFailed && (
                   <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                )}
              </p>
              {house.geocodingFailed && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[9px] text-red-600 font-bold uppercase tracking-tight">
                     Posizione non trovata
                  </p>
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

          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-l border-slate-100 pl-3">
            Voto: {house.score}/5
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-2" onClick={e => e.stopPropagation()}>
          {currentDestinations.daughter.label && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">{currentDestinations.daughter.label}</p>
              <div className="flex items-center gap-1">
                <>
                  <span className="text-lg font-light text-slate-900">
                    {(!house.commute?.daughter.distance || parseFloat(house.commute.daughter.distance.toString()) > 4000) ? '-' : house.commute.daughter.distance}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">km</span>
                  {house.commute?.daughter.duration && (
                    <span className="text-[10px] text-slate-400 ml-1">• {house.commute.daughter.duration}</span>
                  )}
                </>
              </div>
            </div>
          )}
          
          {currentDestinations.work.label && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">{currentDestinations.work.label}</p>
              <div className="flex items-center gap-1">
                <>
                  <span className="text-lg font-light text-slate-900">
                    {(!house.commute?.work.distance || parseFloat(house.commute.work.distance.toString()) > 4000) ? '-' : house.commute.work.distance}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">km</span>
                  {house.commute?.work.duration && (
                    <span className="text-[10px] text-slate-400 ml-1">• {house.commute.work.duration}</span>
                  )}
                </>
              </div>
            </div>
          )}
        </div>

        {/* Recalculate button */}
        {onRetryGeocoding && house.lat && house.lng && (
          <div className="flex justify-end mb-4" onClick={e => e.stopPropagation()}>
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
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-400 text-[9px] font-bold uppercase tracking-wide hover:bg-blue-50 hover:text-blue-500 transition-colors disabled:opacity-50"
              title="Ricalcola distanze e tempi"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isRetrying ? 'animate-spin' : ''}`} />
              Ricalcola
            </button>
          </div>
        )}
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
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveNotes();
                }
                if (e.key === 'Escape') {
                  setIsEditingNotes(false);
                }
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
               onClick={() => {
                 window.open(getGoogleMapsRoute(currentDestinations.daughter), '_blank');
               }}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">{currentDestinations.daughter.short}</span>
            </button>
          )}
          {currentDestinations.work.label && currentDestinations.work.address && (
            <button 
               className="px-3 py-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors flex items-center gap-2"
               title={`Percorso verso ${currentDestinations.work.label}`}
               onClick={() => {
                 window.open(getGoogleMapsRoute(currentDestinations.work), '_blank');
               }}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">{currentDestinations.work.short}</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default HouseCard;
