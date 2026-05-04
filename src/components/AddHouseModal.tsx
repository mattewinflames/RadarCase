/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
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
    score: 3,
    yearBuilt: '' as string | number,
    floor: '' as string | number,
    condition: '' as House['condition'] | '',
    heating: '' as House['heating'] | '',
    kwh: '' as string | number,
    energyClass: '' as House['energyClass'] | '',
    rentalContractType: '' as House['rentalContractType'] | '',
    condoFees: '' as string | number,
  });

  const [priceInput, setPriceInput] = useState('');
  const [sqmInput, setSqmInput] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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

    const finalFormData: any = {
      ...formData,
      title: formData.title || formData.location.split(',')[0],
      score: Math.min(5, Math.max(1, formData.score)),
    };

    // Clean up optional numeric fields
    if (formData.yearBuilt !== '') finalFormData.yearBuilt = Number(formData.yearBuilt);
    else delete finalFormData.yearBuilt;

    if (formData.floor !== '') finalFormData.floor = Number(formData.floor);
    else delete finalFormData.floor;

    if (formData.kwh !== '') finalFormData.kwh = Number(formData.kwh);
    else delete finalFormData.kwh;

    if (formData.condoFees !== '') finalFormData.condoFees = Number(formData.condoFees);
    else delete finalFormData.condoFees;

    if (!formData.condition) delete finalFormData.condition;
    if (!formData.heating) delete finalFormData.heating;
    if (!formData.energyClass) delete finalFormData.energyClass;
    if (!formData.rentalContractType) delete finalFormData.rentalContractType;

    onAdd(finalFormData);
    onClose();
    setShowErrors(false);
    setShowDetails(false);
    setFormData({
      title: '',
      price: 0,
      sqm: 0,
      location: '',
      link: '',
      notes: '',
      visited: false,
      score: 3,
      yearBuilt: '',
      floor: '',
      condition: '',
      heating: '',
      kwh: '',
      energyClass: '',
      rentalContractType: '',
      condoFees: '',
    });
    setPriceInput('');
    setSqmInput('');
  };

  const selectClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-700";
  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm";

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
                  className={inputClass}
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
                    className={inputClass}
                    value={formData.score}
                    onChange={e => setFormData({...formData, score: Number(e.target.value)})}
                  />
                </div>
              </div>

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

              {/* Sezione dettagli aggiuntivi collassabile */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Dettagli immobile
                    <span className="ml-2 text-[9px] text-slate-300 normal-case">per analisi AI</span>
                  </span>
                  {showDetails 
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />
                  }
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Anno costruzione</label>
                            <input
                              type="number"
                              placeholder="es. 1980"
                              min="1800"
                              max={new Date().getFullYear()}
                              className={inputClass}
                              value={formData.yearBuilt}
                              onChange={e => setFormData({...formData, yearBuilt: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Piano</label>
                            <input
                              type="number"
                              placeholder="es. 2"
                              min="0"
                              className={inputClass}
                              value={formData.floor}
                              onChange={e => setFormData({...formData, floor: e.target.value})}
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
                              className={inputClass}
                              value={formData.kwh}
                              onChange={e => setFormData({...formData, kwh: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Classe energetica</label>
                            <select
                              className={selectClass}
                              value={formData.energyClass}
                              onChange={e => setFormData({...formData, energyClass: e.target.value as House['energyClass']})}
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
                            className={selectClass}
                            value={formData.condition}
                            onChange={e => setFormData({...formData, condition: e.target.value as House['condition']})}
                          >
                            <option value="">-</option>
                            <option value="ottimo">Ottimo</option>
                            <option value="ristrutturato">Ristrutturato</option>
                            <option value="buono">Buono</option>
                            <option value="da_ristrutturare">Da ristrutturare</option>
                          </select>
                        </div>



                        {appMode === 'rent' && (
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Tipo contratto</label>
                            <select
                              className={selectClass}
                              value={formData.rentalContractType}
                              onChange={e => setFormData({...formData, rentalContractType: e.target.value as House['rentalContractType']})}
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
                            className={inputClass}
                            value={formData.condoFees}
                            onChange={e => setFormData({...formData, condoFees: e.target.value})}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Riscaldamento</label>
                          <select
                            className={selectClass}
                            value={formData.heating}
                            onChange={e => setFormData({...formData, heating: e.target.value as House['heating']})}
                          >
                            <option value="">-</option>
                            <option value="autonomo">Autonomo</option>
                            <option value="centralizzato">Centralizzato</option>
                            <option value="assente">Assente</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
