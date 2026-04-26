import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Save, MapPin, Briefcase, Heart, Home, Key, Trash2 } from 'lucide-react';
import { UserSettings, DEFAULT_SETTINGS } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export default function SettingsModal({ isOpen, onClose, settings, onSave }: Props) {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    if (confirm('Sei sicuro di voler resettare tutte le impostazioni?')) {
      setLocalSettings(DEFAULT_SETTINGS);
    }
  };

  const setAppMode = (mode: 'buy' | 'rent') => {
    setLocalSettings(prev => ({ ...prev, appMode: mode }));
  };

  const updateDestination = (key: 'daughter' | 'work', field: string, value: string | number) => {
    setLocalSettings(prev => {
      let finalValue = value;
      if (field === 'lat' || field === 'lng') {
        const parsed = parseFloat(value.toString());
        finalValue = isNaN(parsed) ? 0 : parsed;
      }
      
      const mode = prev.appMode;
      return {
        ...prev,
        [mode]: {
          ...prev[mode],
          destinations: {
            ...prev[mode].destinations,
            [key]: {
              ...prev[mode].destinations[key],
              [field]: finalValue
            }
          }
        }
      };
    });
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

                {/* Destination 1 */}
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 rounded-xl text-pink-600">
                      <Heart size={18} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-800 block">Punto di Riferimento 1</span>
                      <p className="text-[9px] text-slate-500 uppercase font-medium">Usato per il calcolo delle distanze</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Breve</label>
                      <input
                        type="text"
                        value={localSettings[localSettings.appMode].destinations.daughter.label}
                        onChange={(e) => updateDestination('daughter', 'label', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500/50 outline-none transition-all placeholder:text-slate-300"
                        placeholder="Es: Palestra, Scuola..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sigla / Label</label>
                      <input
                        type="text"
                        value={localSettings[localSettings.appMode].destinations.daughter.short}
                        onChange={(e) => updateDestination('daughter', 'short', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500/50 outline-none transition-all placeholder:text-slate-300"
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
                          value={localSettings[localSettings.appMode].destinations.daughter.address || ''}
                          onChange={(e) => updateDestination('daughter', 'address', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500/50 outline-none transition-all placeholder:text-slate-300"
                          placeholder="Via Emilia..."
                        />
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-pink-500 transition-colors" size={16} />
                      </div>
                    </div>
                    <div className="col-span-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Civico</label>
                      <input
                        type="text"
                        value={localSettings[localSettings.appMode].destinations.daughter.houseNumber || ''}
                        onChange={(e) => updateDestination('daughter', 'houseNumber', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500/50 outline-none transition-all"
                        placeholder="3/N"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">CAP</label>
                      <input
                        type="text"
                        value={localSettings[localSettings.appMode].destinations.daughter.zip || ''}
                        onChange={(e) => updateDestination('daughter', 'zip', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500/50 outline-none transition-all"
                        placeholder="40100"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Città</label>
                      <input
                        type="text"
                        value={localSettings[localSettings.appMode].destinations.daughter.city || ''}
                        onChange={(e) => updateDestination('daughter', 'city', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500/50 outline-none transition-all placeholder:text-slate-300"
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
                          value={localSettings[localSettings.appMode].destinations.daughter.lat || 0}
                          onChange={(e) => updateDestination('daughter', 'lat', e.target.value)}
                          className="w-full bg-slate-100/50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-mono text-slate-500 focus:bg-white focus:ring-4 focus:ring-pink-500/5 focus:border-pink-500/30 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-300 uppercase tracking-widest ml-1">Longitudine</label>
                        <input
                          type="number"
                          step="any"
                          value={localSettings[localSettings.appMode].destinations.daughter.lng || 0}
                          onChange={(e) => updateDestination('daughter', 'lng', e.target.value)}
                          className="w-full bg-slate-100/50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-mono text-slate-500 focus:bg-white focus:ring-4 focus:ring-pink-500/5 focus:border-pink-500/30 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Destination 2 */}
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-800 block">Punto di Riferimento 2</span>
                      <p className="text-[9px] text-slate-500 uppercase font-medium">Usato per il calcolo delle distanze</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Breve</label>
                      <input
                        type="text"
                        value={localSettings[localSettings.appMode].destinations.work.label}
                        onChange={(e) => updateDestination('work', 'label', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-300"
                        placeholder="Es: Lavoro, Famiglia..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sigla / Label</label>
                      <input
                        type="text"
                        value={localSettings[localSettings.appMode].destinations.work.short}
                        onChange={(e) => updateDestination('work', 'short', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-300"
                        placeholder="Es: Lav, Fam"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Indirizzo (Via/Piazza)</label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={localSettings[localSettings.appMode].destinations.work.address || ''}
                          onChange={(e) => updateDestination('work', 'address', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-300"
                          placeholder="Via Emilia..."
                        />
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                      </div>
                    </div>
                    <div className="col-span-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Civico</label>
                      <input
                        type="text"
                        value={localSettings[localSettings.appMode].destinations.work.houseNumber || ''}
                        onChange={(e) => updateDestination('work', 'houseNumber', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
                        placeholder="3/N"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">CAP</label>
                      <input
                        type="text"
                        value={localSettings[localSettings.appMode].destinations.work.zip || ''}
                        onChange={(e) => updateDestination('work', 'zip', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
                        placeholder="40100"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Città</label>
                      <input
                        type="text"
                        value={localSettings[localSettings.appMode].destinations.work.city || ''}
                        onChange={(e) => updateDestination('work', 'city', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-300"
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
                          value={localSettings[localSettings.appMode].destinations.work.lat || 0}
                          onChange={(e) => updateDestination('work', 'lat', e.target.value)}
                          className="w-full bg-slate-100/50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-mono text-slate-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/30 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-300 uppercase tracking-widest ml-1">Longitudine</label>
                        <input
                          type="number"
                          step="any"
                          value={localSettings[localSettings.appMode].destinations.work.lng || 0}
                          onChange={(e) => updateDestination('work', 'lng', e.target.value)}
                          className="w-full bg-slate-100/50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-mono text-slate-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/30 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
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
