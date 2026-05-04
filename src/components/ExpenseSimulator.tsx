/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { House } from '../types';
import { Home, Calculator, RotateCcw, Info, Wallet, Briefcase, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  houses: House[];
  selectedHouseId: string | null;
  onHouseSelect: (id: string | null) => void;
}

// Function to estimate notary fees based on purchase price (includes sales deed + mortgage deed)
const estimateNotaryFee = (price: number, hasMortgage: boolean) => {
  let min = 0;
  let max = 0;

  if (price <= 100000) { min = 1200; max = 1800; }
  else if (price <= 150000) { min = 1400; max = 2200; }
  else if (price <= 200000) { min = 1800; max = 2800; }
  else if (price <= 300000) { min = 2200; max = 3500; }
  else { min = 3000; max = 5000; }

  // If mortgage is present, the fee increases for the second deed
  const multiplier = hasMortgage ? 1.4 : 1.0;
  return { min: min * multiplier, max: max * multiplier };
};

export default function ExpenseSimulator({ houses, selectedHouseId, onHouseSelect }: Props) {
  // Input State
  const [price, setPrice] = useState<number>(250000);
  const [cadastralIncome, setCadastralIncome] = useState<number | null>(null);
  const [hasMortgage, setHasMortgage] = useState(true);
  const [mortgageAmount, setMortgageAmount] = useState<number>(200000);
  const [hasAgency, setHasAgency] = useState(true);
  const [agencyPercentage, setAgencyPercentage] = useState(3);
  const isFirstHome = true;
  
  // Overrides state
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  // Sync price when house is selected
  useEffect(() => {
    if (selectedHouseId) {
      const house = houses.find(h => h.id === selectedHouseId);
      if (house) {
        setPrice(house.price);
        // Reset mortgage to 80% of price if it was default
        setMortgageAmount(Math.round(house.price * 0.8));
      }
    }
  }, [selectedHouseId, houses]);

  const selectedHouse = houses.find(h => h.id === selectedHouseId);

  const calcs = useMemo(() => {
    // 1. Valore Catastale
    const safePrice = price || 0;
    const catValue = cadastralIncome 
      ? (cadastralIncome * 1.05 * 110)
      : (safePrice * 0.40); // Estimation approx 40%

    // 2. Imposte
    const regTaxRate = 0.02; // Always first home for now
    const baseRegistryTax = Math.max(1000, catValue * regTaxRate);
    const registryTax = overrides.registryTax ?? baseRegistryTax;
    const ipoTax = 50; 
    const catTax = 50;
    const totalTaxes = registryTax + ipoTax + catTax;

    // 3. Notaio (Estimate Range)
    const notaryRange = estimateNotaryFee(safePrice, hasMortgage);
    const notaryAvg = overrides.notary ?? ((notaryRange.min + notaryRange.max) / 2);

    // 4. Agenzia
    const baseAgencyPercentage = agencyPercentage || 3;
    const agencyBase = hasAgency ? (safePrice * (baseAgencyPercentage / 100)) : 0;
    const agencyIVA = agencyBase * 0.22;
    const totalAgency = overrides.agency ?? (agencyBase + agencyIVA);

    // 5. Mutuo (Updated based on user screenshot/technical note)
    const safeMortgageAmount = mortgageAmount || 0;
    const baseMortSubstituteTax = hasMortgage ? (safeMortgageAmount * 0.0025) : 0;
    const mortSubstituteTax = overrides.mortSubstituteTax ?? baseMortSubstituteTax;
    
    // Values from user screenshot
    const basePerizia = hasMortgage ? 320 : 0;
    const perizia = overrides.perizia ?? basePerizia;
    
    const baseIstruttoria = hasMortgage ? 0 : 0;
    const istruttoria = overrides.istruttoria ?? baseIstruttoria;
    
    const baseAssicurazione = hasMortgage ? 250 : 0;
    const assicurazione = overrides.assicurazione ?? baseAssicurazione;
    
    const totalMortgageCosts = mortSubstituteTax + perizia + istruttoria + assicurazione;

    // 6. Altre Spese (Visure etc)
    const extraMisc = overrides.misc ?? 250;
    const condoFeesExtra = (selectedHouse?.condoFees ?? 0) * 12;

    // 7. Buffer (1% suggested)
    const buffer = overrides.buffer ?? (safePrice * 0.01);

    // Dynamic totals
    const nMin = overrides.notary ?? notaryRange.min;
    const nMax = overrides.notary ?? notaryRange.max;

    const totalMin = totalTaxes + nMin + totalAgency + totalMortgageCosts + extraMisc + condoFeesExtra;
    const totalMax = totalTaxes + nMax + totalAgency + totalMortgageCosts + extraMisc + condoFeesExtra + buffer;

    return {
      catValue,
      registryTax,
      totalTaxes,
      notaryRange,
      totalAgency,
      totalMortgageCosts,
      extraMisc,
      condoFeesExtra,
      buffer,
      totalMin,
      totalMax,
      notaryAvg,
      agencyBase,
      agencyIVA,
      mortSubstituteTax,
      perizia,
      istruttoria,
      assicurazione
    };
  }, [price, cadastralIncome, hasMortgage, mortgageAmount, hasAgency, agencyPercentage, overrides, selectedHouse]);

  const handleOverride = (id: string, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    const numValue = Number(cleanValue);
    if (!isNaN(numValue)) {
      setOverrides(prev => ({ ...prev, [id]: numValue }));
    }
  };

  const resetOverride = (id: string) => {
    const next = { ...overrides };
    delete next[id];
    setOverrides(next);
  };

  const resetAll = () => {
    setOverrides({});
    setCadastralIncome(null);
  };

  return (
    <section className="bg-slate-900 rounded-[48px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden" id="simulator">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full -ml-32 -mb-32 blur-[80px]" />

      <div className="relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-600 rounded-3xl shadow-lg shadow-blue-600/20">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Analisi Spese Accessorie</h2>
              <p className="text-xs text-slate-400 font-medium">Calcolo accurato Prima Casa (Italia)</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-slate-800/40 p-6 rounded-[32px] border border-slate-800">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-4">Immobile da analizzare</label>
              {selectedHouse ? (
                <div className="flex items-center justify-between bg-slate-800 border border-blue-500/30 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500">
                      <Home size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{selectedHouse.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Prezzo: €{selectedHouse.price.toLocaleString('it-IT')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={resetAll}
                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 transition-colors flex items-center gap-2 group"
                    title="Reset tutti i parametri"
                  >
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Reset</span>
                    <RotateCcw size={16} />
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 px-6 border-2 border-dashed border-slate-700 rounded-2xl">
                  <p className="text-xs text-slate-500 italic">Seleziona una casa nel radar per iniziare</p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Rendita Catastale (€)</label>
                    <span className="text-[10px] text-blue-400 font-mono italic">
                      {cadastralIncome ? 'Dichiarata' : 'Stimata (40% prezzo)'}
                    </span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      placeholder="Esempio: 650"
                      value={cadastralIncome || ''}
                      onChange={(e) => setCadastralIncome(e.target.value ? Number(e.target.value) : null)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-4 text-sm font-mono focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700"
                    />
                    <FileText className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 pointer-events-none" />
                  </div>
                  <p className="text-[9px] text-slate-600 mt-2 leading-relaxed">
                    Serve per calcolare il Valore Catastale (Base imponibile imposte).
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                className={`p-6 rounded-[32px] border transition-all cursor-pointer ${hasMortgage ? 'bg-blue-600/10 border-blue-500/50' : 'bg-slate-800/40 border-slate-800'}`}
                onClick={() => setHasMortgage(!hasMortgage)}
              >
                <div className="flex items-center justify-between mb-4">
                  <Wallet className={`w-5 h-5 ${hasMortgage ? 'text-blue-500' : 'text-slate-600'}`} />
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${hasMortgage ? 'bg-blue-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${hasMortgage ? 'left-4.5' : 'left-0.5'}`} />
                  </div>
                </div>
                <p className="text-xs font-bold mb-1">C'è un mutuo?</p>
                <p className="text-[10px] text-slate-500">Aggiunge onorario notaio e spese banca</p>
              </div>

              <div 
                className={`p-6 rounded-[32px] border transition-all cursor-pointer ${hasAgency ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-slate-800/40 border-slate-800'}`}
                onClick={() => setHasAgency(!hasAgency)}
              >
                <div className="flex items-center justify-between mb-4">
                  <Briefcase className={`w-5 h-5 ${hasAgency ? 'text-indigo-500' : 'text-slate-600'}`} />
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${hasAgency ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${hasAgency ? 'left-4.5' : 'left-0.5'}`} />
                  </div>
                </div>
                <p className="text-xs font-bold mb-1">C'è un'agenzia?</p>
                <p className="text-[10px] text-slate-500">Provvigione media 3% + IVA</p>
              </div>
            </div>

            {hasMortgage && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/40 p-6 rounded-[32px] border border-slate-800"
              >
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Importo Mutuo (€)</label>
                  <span className="text-sm font-bold font-mono">€{mortgageAmount.toLocaleString('it-IT')}</span>
                </div>
                <input 
                  type="range"
                  min={0}
                  max={price * 1.2}
                  step={1000}
                  value={mortgageAmount}
                  onChange={(e) => setMortgageAmount(Number(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between mt-2 text-[9px] text-slate-600 font-bold">
                  <span>0%</span>
                  <span>{Math.round((mortgageAmount/price)*100)}% del prezzo</span>
                  <span>100%+</span>
                </div>
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-8">
            <div className="bg-slate-800/20 border border-slate-800 rounded-[40px] p-8 md:p-10 divide-y divide-slate-800">
              <div className="pb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-6 whitespace-nowrap">Dettaglio Imposte</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center group relative">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">Registro (2%)</span>
                        {overrides.registryTax && (
                          <button onClick={() => resetOverride('registryTax')} className="text-[9px] text-blue-500 hover:text-blue-400">
                            <RotateCcw size={10} />
                          </button>
                        )}
                      </div>
                      {editingField === 'registryTax' ? (
                        <input 
                          autoFocus
                          className="bg-slate-900 border border-blue-500 rounded px-2 w-24 text-right font-mono text-xs"
                          defaultValue={calcs.registryTax}
                          onBlur={(e) => {
                            handleOverride('registryTax', e.target.value);
                            setEditingField(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                      ) : (
                        <span 
                          onClick={() => setEditingField('registryTax')}
                          className={`font-mono text-xs cursor-pointer hover:text-white transition-colors border-b border-white/0 hover:border-white/20 ${overrides.registryTax ? 'text-blue-400 font-bold' : ''}`}
                        >
                          {Math.round(calcs.registryTax).toLocaleString('it-IT')} €
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Ipotecaria/Catastale</span>
                      <span className="font-mono">100 €</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold pt-2 border-t border-slate-800/50">
                      <span className="text-slate-200 uppercase tracking-widest text-[10px]">Totale Fisco</span>
                      <span className="text-blue-400">{Math.round(calcs.totalTaxes).toLocaleString('it-IT')} €</span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-6">Professionisti</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center group relative">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs flex items-center gap-1.5 border-b border-dashed border-slate-700 cursor-help">
                          Notaio
                          <Info size={10} className="text-slate-600" />
                        </span>
                        {overrides.notary && (
                          <button onClick={() => resetOverride('notary')} className="text-[9px] text-blue-500 hover:text-blue-400">
                            <RotateCcw size={10} />
                          </button>
                        )}
                      </div>
                      {editingField === 'notary' ? (
                        <input 
                          autoFocus
                          className="bg-slate-900 border border-blue-500 rounded px-2 w-24 text-right font-mono text-xs"
                          defaultValue={calcs.notaryAvg}
                          onBlur={(e) => {
                            handleOverride('notary', e.target.value);
                            setEditingField(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                      ) : (
                        <span 
                          onClick={() => setEditingField('notary')}
                          className={`font-mono text-xs cursor-pointer hover:text-white transition-colors border-b border-white/0 hover:border-white/20 ${overrides.notary ? 'text-blue-400 font-bold' : ''}`}
                        >
                          ~ {Math.round(calcs.notaryAvg).toLocaleString('it-IT')} €
                        </span>
                      )}
                    </div>
                    {hasAgency && (
                      <div className="flex justify-between items-center group">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400">Agenzia (IVA incl.)</span>
                          {overrides.agency && (
                            <button onClick={() => resetOverride('agency')} className="text-[9px] text-blue-500 hover:text-blue-400">
                              <RotateCcw size={10} />
                            </button>
                          )}
                        </div>
                        {editingField === 'agency' ? (
                          <input 
                            autoFocus
                            className="bg-slate-900 border border-blue-500 rounded px-2 w-24 text-right font-mono text-xs"
                            defaultValue={calcs.totalAgency || 0}
                            onBlur={(e) => {
                              handleOverride('agency', e.target.value);
                              setEditingField(null);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          />
                        ) : (
                          <span 
                            onClick={() => setEditingField('agency')}
                            className={`font-mono text-xs cursor-pointer hover:text-white transition-colors border-b border-white/0 hover:border-white/20 ${overrides.agency ? 'text-blue-400 font-bold' : ''}`}
                          >
                            {Math.round(calcs.totalAgency).toLocaleString('it-IT')} €
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between items-center group">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Varie e Visure</span>
                        {overrides.misc && (
                          <button onClick={() => resetOverride('misc')} className="text-[9px] text-blue-500 hover:text-blue-400">
                            <RotateCcw size={10} />
                          </button>
                        )}
                      </div>
                      {editingField === 'misc' ? (
                        <input 
                          autoFocus
                          className="bg-slate-900 border border-blue-500 rounded px-2 w-24 text-right font-mono text-xs"
                          defaultValue={calcs.extraMisc}
                          onBlur={(e) => {
                            handleOverride('misc', e.target.value);
                            setEditingField(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                      ) : (
                        <span 
                          onClick={() => setEditingField('misc')}
                          className={`font-mono text-xs cursor-pointer hover:text-white transition-colors border-b border-white/0 hover:border-white/20 ${overrides.misc ? 'text-blue-400 font-bold' : ''}`}
                        >
                          {calcs.extraMisc.toLocaleString('it-IT')} €
                        </span>
                      )}
                    </div>

                    {calcs.condoFeesExtra > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Extra • Spese condominio (annue)</span>
                        <span className="font-mono">{Math.round(calcs.condoFeesExtra).toLocaleString('it-IT')} €</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {hasMortgage && (
                <div className="py-8">
                  <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-6">Costi del Mutuo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    {/* Imposta Sostitutiva */}
                    <div className="flex justify-between items-center group">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Imposta Sost. (0.25%)</span>
                        {overrides.mortSubstituteTax && (
                          <button onClick={() => resetOverride('mortSubstituteTax')} className="text-[9px] text-blue-500 hover:text-blue-400">
                            <RotateCcw size={10} />
                          </button>
                        )}
                      </div>
                      {editingField === 'mortSubstituteTax' ? (
                        <input 
                          autoFocus
                          className="bg-slate-900 border border-blue-500 rounded px-2 w-24 text-right font-mono text-xs"
                          defaultValue={calcs.mortSubstituteTax}
                          onBlur={(e) => {
                            handleOverride('mortSubstituteTax', e.target.value);
                            setEditingField(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                      ) : (
                        <span 
                          onClick={() => setEditingField('mortSubstituteTax')}
                          className={`font-mono text-xs cursor-pointer hover:text-white transition-colors border-b border-white/0 hover:border-white/20 ${overrides.mortSubstituteTax ? 'text-blue-400 font-bold' : ''}`}
                        >
                          {Math.round(calcs.mortSubstituteTax).toLocaleString('it-IT')} €
                        </span>
                      )}
                    </div>

                    {/* Istruttoria */}
                    <div className="flex justify-between items-center group">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Istruttoria</span>
                        {overrides.istruttoria && (
                          <button onClick={() => resetOverride('istruttoria')} className="text-[9px] text-blue-500 hover:text-blue-400">
                            <RotateCcw size={10} />
                          </button>
                        )}
                      </div>
                      {editingField === 'istruttoria' ? (
                        <input 
                          autoFocus
                          className="bg-slate-900 border border-blue-500 rounded px-2 w-24 text-right font-mono text-xs"
                          defaultValue={calcs.istruttoria}
                          onBlur={(e) => {
                            handleOverride('istruttoria', e.target.value);
                            setEditingField(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                      ) : (
                        <span 
                          onClick={() => setEditingField('istruttoria')}
                          className={`font-mono text-xs cursor-pointer hover:text-white transition-colors border-b border-white/0 hover:border-white/20 ${overrides.istruttoria ? 'text-blue-400 font-bold' : ''}`}
                        >
                          {Math.round(calcs.istruttoria).toLocaleString('it-IT')} €
                        </span>
                      )}
                    </div>

                    {/* Perizia */}
                    <div className="flex justify-between items-center group">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Perizia</span>
                        {overrides.perizia && (
                          <button onClick={() => resetOverride('perizia')} className="text-[9px] text-blue-500 hover:text-blue-400">
                            <RotateCcw size={10} />
                          </button>
                        )}
                      </div>
                      {editingField === 'perizia' ? (
                        <input 
                          autoFocus
                          className="bg-slate-900 border border-blue-500 rounded px-2 w-24 text-right font-mono text-xs"
                          defaultValue={calcs.perizia}
                          onBlur={(e) => {
                            handleOverride('perizia', e.target.value);
                            setEditingField(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                      ) : (
                        <span 
                          onClick={() => setEditingField('perizia')}
                          className={`font-mono text-xs cursor-pointer hover:text-white transition-colors border-b border-white/0 hover:border-white/20 ${overrides.perizia ? 'text-blue-400 font-bold' : ''}`}
                        >
                          {Math.round(calcs.perizia).toLocaleString('it-IT')} €
                        </span>
                      )}
                    </div>

                    {/* Assicurazione */}
                    <div className="flex justify-between items-center group">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Polizza Scoppio/Inc.</span>
                        {overrides.assicurazione && (
                          <button onClick={() => resetOverride('assicurazione')} className="text-[9px] text-blue-500 hover:text-blue-400">
                            <RotateCcw size={10} />
                          </button>
                        )}
                      </div>
                      {editingField === 'assicurazione' ? (
                        <input 
                          autoFocus
                          className="bg-slate-900 border border-blue-500 rounded px-2 w-24 text-right font-mono text-xs"
                          defaultValue={calcs.assicurazione}
                          onBlur={(e) => {
                            handleOverride('assicurazione', e.target.value);
                            setEditingField(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                      ) : (
                        <span 
                          onClick={() => setEditingField('assicurazione')}
                          className={`font-mono text-xs cursor-pointer hover:text-white transition-colors border-b border-white/0 hover:border-white/20 ${overrides.assicurazione ? 'text-blue-400 font-bold' : ''}`}
                        >
                          ~ {Math.round(calcs.assicurazione).toLocaleString('it-IT')} €
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em]">Spese Extra Totali</span>
                      <div className="px-1.5 py-0.5 bg-amber-500/10 rounded text-[8px] font-bold text-amber-500 uppercase">Buffer incl.</div>
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold tracking-tighter text-white font-mono">
                      € {Math.round(calcs.totalMin).toLocaleString('it-IT')} <span className="text-slate-600 font-light mx-1">/</span> {Math.round(calcs.totalMax).toLocaleString('it-IT')}
                    </p>
                  </div>
                  
                  <div className="text-left md:text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Budget Necessario</p>
                    <div className="bg-blue-600 px-6 py-3 rounded-2xl shadow-xl shadow-blue-900/40">
                      <p className="text-[9px] text-blue-200 uppercase font-bold tracking-widest mb-0.5 whitespace-nowrap">Prezzo + Spese</p>
                      <p className="text-2xl font-bold text-white font-mono leading-none">
                        € {Math.round(price + calcs.totalMax).toLocaleString('it-IT')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 p-6 bg-slate-800/40 rounded-2xl border border-slate-800 flex items-start gap-4">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 shrink-0">
                    <AlertCircle size={18} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      <b>Nota:</b> Per mantenere le agevolazioni, devi trasferire la residenza nel comune entro <b>18 mesi</b> dall'atto. 
                    </p>
                    {hasAgency && (
                      <p className="text-[10px] text-slate-500 italic">
                        La provvigione agenzia è detraibile al 19% su un massimo di €1.000.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
