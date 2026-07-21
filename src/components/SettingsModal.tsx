import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Save, MapPin, Briefcase, Heart, Home, Key, Trash2, Plus } from 'lucide-react';
import { UserSettings, DEFAULT_SETTINGS, Destination, newDestinationId } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
  onReset: (mode: 'buy' | 'rent') => Promise<void>;
}

export default function SettingsModal({ isOpen, onClose, settings, onSave, onReset }: Props) {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  // Sincronizza il form SOLO all'apertura del modale.
  // `settings` è escluso di proposito dalle dipendenze: se lo includessimo, qualsiasi
  // aggiornamento dello stato globale (es. un refresh dell'autenticazione) mentre il
  // modale è aperto riscriverebbe il form, azzerando gli indirizzi appena inseriti.
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

const handleReset = async () => {
    const modeLabel = localSettings.appMode === 'buy' ? 'Acquisto Casa' : 'Affitto';
    if (confirm(`Sei sicuro di voler resettare le impostazioni di "${modeLabel}"?`)) {
      const resetSettings = {
        ...localSettings,
        [localSettings.appMode]: DEFAULT_SETTINGS[localSettings.appMode]
      };
      setLocalSettings(resetSettings);
      await onReset(localSettings.appMode);
    onClose();
    }
  };

  const setAppMode = (mode: 'buy' | 'rent') => {
    setLocalSettings(prev => ({ ...prev, appMode: mode }));
  };

  const updateDestination = (id: string, field: string, value: string | number) => {
    setLocalSettings(prev => {
      let finalValue: string | number = value;
      if (field === 'lat' || field === 'lng') {
        const parsed = parseFloat(value.toString());
        finalValue = isNaN(parsed) ? 0 : parsed;
      }
      const mode = prev.appMode;
      return {
        ...prev,
        [mode]: {
          ...prev[mode],
          destinations: prev[mode].destinations.map(d =>
            d.id === id ? { ...d, [field]: finalValue } : d
          )
        }
      };
    });
  };

  const addDestination = () => {
    setLocalSettings(prev => {
      const mode = prev.appMode;
      const newDest: Destination = {
        id: newDestinationId(), label: '', short: '', address: '',
        houseNumber: '', zip: '', city: '', lat: 0, lng: 0, isDefault: false
      };
      return { ...prev, [mode]: { ...prev[mode], destinations: [...prev[mode].destinations, newDest] } };
    });
  };

  const removeDestination = (id: string) => {
    setLocalSettings(prev => {
      const mode = prev.appMode;
      return { ...prev, [mode]: { ...prev[mode], destinations: prev[mode].destinations.filter(d => d.id !== id) } };
    });
  };

  // Rende un blocco di campi per una destinazione. I predefiniti (Figlia/Lavoro)
  // non hanno il pulsante di rimozione; gli extra sì.
  const renderDestination = (dest: Destination, index: number) => {
    const icon = dest.id === 'daughter' ? <Heart size={18} /> : dest.id === 'work' ? <Briefcase size={18} /> : <MapPin size={18} />;
    const iconWrap = dest.id === 'daughter' ? 'bg-pink-50 text-pink-600' : dest.id === 'work' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600';
    const ring = 'focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50';
    return (
      <div key={dest.id} className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${iconWrap}`}>{icon}</div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-800 block truncate">
              {dest.label || dest.short || `Punto di Riferimento ${index + 1}`}
            </span>
            <p className="text-[9px] text-slate-500 uppercase font-medium">Usato per il calcolo delle distanze</p>
          </div>
          {!dest.isDefault && (
            <button
              onClick={() => removeDestination(dest.id)}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              title="Rimuovi questo punto di riferimento"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome</label>
            <input
              type="text"
              value={dest.label}
              onChange={(e) => updateDestination(dest.id, 'label', e.target.value)}
              className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-300 ${ring}`}
              placeholder="Es: Palestra, Scuola..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sigla</label>
            <input
              type="text"
              value={dest.short}
              onChange={(e) => updateDestination(dest.id, 'short', e.target.value)}
              className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-300 ${ring}`}
              placeholder="Es: Pal, Scu"
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Indirizzo (Via/Piazza)</label>
            <div className="relative group">
              <input
                type="text"
                value={dest.address || ''}
                onChange={(e) => updateDestination(dest.id, 'address', e.target.value)}
                className={`w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-300 ${ring}`}
                placeholder="Via Emilia..."
              />
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            </div>
          </div>
          <div className="col-span-1 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Civico</label>
            <input
              type="text"
              value={dest.houseNumber || ''}
              onChange={(e) => updateDestination(dest.id, 'houseNumber', e.target.value)}
              className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 outline-none transition-all ${ring}`}
              placeholder="3/N"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">CAP</label>
            <input
              type="text"
              value={dest.zip || ''}
              onChange={(e) => updateDestination(dest.id, 'zip', e.target.value)}
              className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 outline-none transition-all ${ring}`}
              placeholder="40100"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Città</label>
            <input
              type="text"
              value={dest.city || ''}
              onChange={(e) => updateDestination(dest.id, 'city', e.target.value)}
              className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-300 ${ring}`}
              placeholder="Bologna"
            />
          </div>
        </div>

        <div className="pt-2">
          <p className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-widest ml-1">Precisione Extra: Coordinate GPS</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-300 uppercase tracking-widest ml-1">Latitudine</label>
              <input
                type="number"
                step="any"
                value={dest.lat || 0}
                onChange={(e) => updateDestination(dest.id, 'lat', e.target.value)}
                className="w-full bg-slate-100/50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-mono text-slate-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/30 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-300 uppercase tracking-widest ml-1">Longitudine</label>
              <input
                type="number"
                step="any"
                value={dest.lng || 0}
                onChange={(e) => updateDestination(dest.id, 'lng', e.target.value)}
                className="w-full bg-slate-100/50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-mono text-slate-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/30 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Settings size={20} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Impostazioni</h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleReset}
                  className="p-2 hover:bg-red-50 rounded-xl transition-colors text-slate-400 hover:text-red-500 group"
                  title="Reset Impostazioni"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 min-h-0">
              {/* App Mode Toggle */}
              <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Modalità Applicazione</span>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setAppMode('buy')}
                      className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-[24px] border-2 transition-all duration-300 ${
                        localSettings.appMode === 'buy'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg shadow-blue-500/10 scale-[1.02]'
                          : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${localSettings.appMode === 'buy' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Home size={20} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest">Acquisto Casa</span>
                    </button>
                    <button
                      onClick={() => setAppMode('rent')}
                      className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-[24px] border-2 transition-all duration-300 ${
                        localSettings.appMode === 'rent'
                          ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-lg shadow-amber-500/10 scale-[1.02]'
                          : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${localSettings.appMode === 'rent' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Key size={20} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest">Casa in Affitto</span>
                    </button>
                  </div>
                </div>

                {/* Punti di riferimento (lista dinamica: i primi due sono fissi, gli altri aggiungibili) */}
                {localSettings[localSettings.appMode].destinations.map((dest, i) => renderDestination(dest, i))}

                <button
                  onClick={addDestination}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-bold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 transition-all active:scale-[0.99]"
                >
                  <Plus size={18} />
                  Aggiungi punto di riferimento
                </button>
            </div>

            {/* Sticky Footer */}
            <div className="px-8 py-6 border-t border-slate-100 flex gap-4 shrink-0 bg-white">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98]"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                className="flex-[1.5] px-6 py-4 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                <Save size={18} />
                Salva Modifiche
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
