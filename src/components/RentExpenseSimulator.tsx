import React, { useState, useMemo, useEffect } from 'react';
import { House } from '../types';
import { Key, Calculator, RotateCcw, Info, Wallet, Briefcase, FileText, AlertCircle, Building2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  houses: House[];
  selectedHouseId: string | null;
  onHouseSelect: (id: string | null) => void;
}

export default function RentExpenseSimulator({ houses, selectedHouseId, onHouseSelect }: Props) {
  const [rent, setRent] = useState<number>(1000);
  const [depositMonths, setDepositMonths] = useState<number>(3);
  const [hasAgency, setHasAgency] = useState(true);

  // Sync rent when house is selected
  useEffect(() => {
    if (selectedHouseId) {
      const house = houses.find(h => h.id === selectedHouseId);
      if (house) {
        setRent(house.price);
      }
    }
  }, [selectedHouseId, houses]);

  const selectedHouse = houses.find(h => h.id === selectedHouseId);
  const condoFees = selectedHouse?.condoFees ?? 0;

  const calcs = useMemo(() => {
    // 1. Agency Fee: 1 month + 22% VAT
    const agencyBase = hasAgency ? rent : 0;
    const agencyIVA = agencyBase * 0.22;
    const totalAgency = agencyBase + agencyIVA;

    // 2. Security Deposit
    const totalDeposit = rent * depositMonths;

    // 3. First Month Rent
    const firstMonth = rent;

    // 4. Other Estimate Spese (Stamp tax, registration approx)
    const miscSpese = 100;

    const totalStartup = totalAgency + totalDeposit + firstMonth + miscSpese;
    const monthlyRecurring = rent + condoFees;

    return {
      agencyBase,
      agencyIVA,
      totalAgency,
      totalDeposit,
      firstMonth,
      miscSpese,
      totalStartup,
      monthlyRecurring
    };
  }, [rent, depositMonths, hasAgency, condoFees]);

  return (
    <section className="bg-slate-900 rounded-[48px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden" id="simulator">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/10 rounded-full -mr-32 -mt-32 blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-600/10 rounded-full -ml-32 -mb-32 blur-[80px]" />

      <div className="relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-600 rounded-3xl shadow-lg shadow-amber-600/20">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Calcolo Spese Iniziali Affitto</h2>
              <p className="text-xs text-slate-400 font-medium">Stima dei costi per l'ingresso in casa</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-slate-800/40 p-6 rounded-[32px] border border-slate-800">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-4">Immobile da analizzare</label>
              {selectedHouse ? (
                <div className="flex items-center justify-between bg-slate-800 border border-amber-500/30 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center text-amber-500">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{selectedHouse.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Canone: €{selectedHouse.price.toLocaleString('it-IT')}/mese</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onHouseSelect(null)}
                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 transition-colors flex items-center gap-2 group"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 px-6 border-2 border-dashed border-slate-700 rounded-2xl">
                  <p className="text-xs text-slate-500 italic">Seleziona un affitto nel radar per iniziare</p>
                </div>
              )}

              <div className="mt-8 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Canone Mensile (€)</label>
                    <span className="text-sm font-bold font-mono">€{rent.toLocaleString('it-IT')}</span>
                  </div>
                  <input 
                    type="range"
                    min={300}
                    max={5000}
                    step={50}
                    value={rent || 1000}
                    onChange={(e) => setRent(Number(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Mensilità di Deposito</label>
                    <span className="text-sm font-bold font-mono">{depositMonths} mesi</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 6].map(m => (
                      <button
                        key={m}
                        onClick={() => setDepositMonths(m)}
                        className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all ${
                          depositMonths === m 
                            ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/20' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`p-6 rounded-[32px] border transition-all cursor-pointer ${hasAgency ? 'bg-amber-600/10 border-amber-500/50' : 'bg-slate-800/40 border-slate-800'}`}
              onClick={() => setHasAgency(!hasAgency)}
            >
              <div className="flex items-center justify-between mb-4">
                <Briefcase className={`w-5 h-5 ${hasAgency ? 'text-amber-500' : 'text-slate-600'}`} />
                <div className={`w-8 h-4 rounded-full relative transition-colors ${hasAgency ? 'bg-amber-600' : 'bg-slate-700'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${hasAgency ? 'left-4.5' : 'left-0.5'}`} />
                </div>
              </div>
              <p className="text-xs font-bold mb-1">C'è un'agenzia?</p>
              <p className="text-[10px] text-slate-500">Provvigione: 1 mensilità + IVA 22%</p>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <div className="bg-slate-800/20 border border-slate-800 rounded-[40px] p-8 md:p-10 divide-y divide-slate-800">
              <div className="pb-8 space-y-6">
                <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-4">Dettaglio Costi Iniziali</h3>
                
                <div className="space-y-4">
                  {hasAgency && (
                    <div className="flex justify-between items-center group">
                      <div className="space-y-0.5">
                        <p className="text-slate-200 text-sm font-medium">Agenzia Immobiliare</p>
                        <p className="text-[10px] text-slate-500">1 mensilità (€{rent}) + IVA 22%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold font-mono">€ {calcs.totalAgency.toLocaleString('it-IT')}</p>
                        <p className="text-[9px] text-slate-600 font-medium">IVA: € {calcs.agencyIVA.toLocaleString('it-IT')}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center group">
                    <div className="space-y-0.5">
                      <p className="text-slate-200 text-sm font-medium">Deposito Cauzionale</p>
                      <p className="text-[10px] text-slate-500">{depositMonths} mensilità ({depositMonths} x €{rent})</p>
                    </div>
                    <p className="text-sm font-bold font-mono">€ {calcs.totalDeposit.toLocaleString('it-IT')}</p>
                  </div>

                  <div className="flex justify-between items-center group">
                    <div className="space-y-0.5">
                      <p className="text-slate-200 text-sm font-medium">Primo Mese Anticipato</p>
                      <p className="text-[10px] text-slate-500">Canone corrente</p>
                    </div>
                    <p className="text-sm font-bold font-mono">€ {calcs.firstMonth.toLocaleString('it-IT')}</p>
                  </div>

                  {condoFees > 0 && (
                    <div className="flex justify-between items-center group">
                      <div className="space-y-0.5">
                        <p className="text-slate-200 text-sm font-medium">Extra • Spese Condominio</p>
                        <p className="text-[10px] text-slate-500">Dato importato dai dettagli immobile</p>
                      </div>
                      <p className="text-sm font-bold font-mono">€ {condoFees.toLocaleString('it-IT')}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center group">
                    <div className="space-y-0.5">
                      <p className="text-slate-200 text-sm font-medium">Bolli e Registrazione</p>
                      <p className="text-[10px] text-slate-500">Stima forfettaria</p>
                    </div>
                    <p className="text-sm font-bold font-mono">€ {calcs.miscSpese.toLocaleString('it-IT')}</p>
                  </div>
                </div>
              </div>

              <div className="pt-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em]">Budget per l'ingresso</span>
                      <div className="px-1.5 py-0.5 bg-amber-500/10 rounded text-[8px] font-bold text-amber-500 uppercase">Totale Start</div>
                    </div>
                    <p className="text-4xl sm:text-5xl font-bold tracking-tighter text-white font-mono">
                      € {Math.round(calcs.totalStartup).toLocaleString('it-IT')}
                    </p>
                  </div>
                  
                  <div className="text-left md:text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Costo Ricorrente</p>
                    <div className="bg-amber-600 px-6 py-3 rounded-2xl shadow-xl shadow-amber-900/40">
                      <p className="text-[9px] text-amber-100 uppercase font-bold tracking-widest mb-0.5 whitespace-nowrap">Ogni Mese (canone + extra)</p>
                      <p className="text-2xl font-bold text-white font-mono leading-none">
                        € {calcs.monthlyRecurring.toLocaleString('it-IT')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 p-6 bg-slate-800/40 rounded-2xl border border-slate-800 flex items-start gap-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 shrink-0">
                    <Info size={18} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      <b>Consiglio:</b> Verifica se il contratto è in <b>"Cedolare Secca"</b>. In tal caso, non pagherai imposte di registro né bolli per la registrazione e il canone rimarrà bloccato.
                    </p>
                    <p className="text-[10px] text-slate-500 italic">
                      Le mensilità di deposito (cauzione) ti verranno restituite a fine contratto con gli eventuali interessi legali maturati.
                    </p>
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
