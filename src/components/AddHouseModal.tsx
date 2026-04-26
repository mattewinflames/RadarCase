/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { House } from '../types';

interface Props {
  onAdd: (house: Omit<House, 'id' | 'createdAt'>) => void;
  isOpen: boolean;
  onClose: () => void;
  appMode: 'buy' | 'rent';
}

export default function AddHouseModal({ onAdd, isOpen, onClose, appMode }: Props) {
  const [formData, setFormData] = useState({
    title: '',
    price: 0,
    sqm: 0,
    location: '',
    link: '',
    notes: '',
    visited: false,
    score: 3
  });

  const [priceInput, setPriceInput] = useState('');
  const [sqmInput, setSqmInput] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const errors = {
    price: formData.price <= 0,
    sqm: formData.sqm <= 0,
    location: !formData.location.trim()
  };

  const formatItalianNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatItalianNumber(rawValue);
    const numericValue = Number(rawValue.replace(/\D/g, ''));
    setPriceInput(formatted);
    setFormData({ ...formData, price: numericValue });
  };

  const handleSqmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = Number(rawValue.replace(/\D/g, ''));
    setSqmInput(rawValue.replace(/\D/g, ''));
    setFormData({ ...formData, sqm: numericValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.price || errors.sqm || errors.location) {
      setShowErrors(true);
      return;
    }

    setShowErrors(false);

    const finalFormData = {
      ...formData,
      title: formData.title || formData.location.split(',')[0]
    };

    onAdd(finalFormData);
    onClose();
    setShowErrors(false);
    setFormData({
      title: '',
      price: 0,
      sqm: 0,
      location: '',
      link: '',
      notes: '',
      visited: false,
      score: 3
    });
    setPriceInput('');
    setSqmInput('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] p-8 overflow-y-auto"
            id="add-house-modal"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Nuovo Immobile</h2>
                {showErrors && (
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-1">
                    Campi obbligatori mancanti
                  </p>
                )}
              </div>
              <button 
                id="close-modal"
                onClick={onClose} 
                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex justify-between">
                  Titolo Annuncio
                  <span className="text-[9px] text-slate-300">Opzionale</span>
                </label>
                <input 
                  type="text"
                  placeholder="es. Trilocale luminoso San Lazzaro"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 transition-colors ${showErrors && errors.price ? 'text-red-500' : 'text-slate-400'}`}>
                    {appMode === 'buy' ? 'Prezzo (€)' : 'Affitto / Mese (€)'}
                  </label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    placeholder={appMode === 'buy' ? "280.000" : "1.200"}
                    className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none transition-all text-sm font-mono ${
                      showErrors && errors.price 
                        ? 'bg-red-50 border-red-200 focus:ring-red-500/10 focus:border-red-500' 
                        : 'bg-slate-50 border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                    value={priceInput}
                    onChange={handlePriceChange}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 transition-colors ${showErrors && errors.sqm ? 'text-red-500' : 'text-slate-400'}`}>Mq²</label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    placeholder="95"
                    className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none transition-all text-sm font-mono ${
                      showErrors && errors.sqm 
                        ? 'bg-red-50 border-red-200 focus:ring-red-500/10 focus:border-red-500' 
                        : 'bg-slate-50 border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                    value={sqmInput}
                    onChange={handleSqmChange}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Voto (1-5)</label>
                  <input 
                    type="number"
                    min="1"
                    max="5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    value={formData.score}
                    onChange={e => setFormData({...formData, score: Number(e.target.value)})}
                  />
                </div>
              </div>

              {/* ✅ Indirizzo a larghezza piena — civico incluso direttamente */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 transition-colors ${showErrors && errors.location ? 'text-red-500' : 'text-slate-400'}`}>
                  Indirizzo completo
                </label>
                <input 
                  type="text"
                  placeholder="es. Via Emilia 3, Bologna"
                  className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none transition-all text-sm ${
                    showErrors && errors.location 
                      ? 'bg-red-50 border-red-200 focus:ring-red-500/10 focus:border-red-500' 
                      : 'bg-slate-50 border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Link Annuncio (URL)</label>
                <input 
                  type="url"
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono text-xs"
                  value={formData.link}
                  onChange={e => setFormData({...formData, link: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Note Personali</label>
                <textarea 
                  rows={3}
                  placeholder="Cosa ti ha colpito?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-slate-900 text-white rounded-xl py-4 font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
              >
                Salva Immobile
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
