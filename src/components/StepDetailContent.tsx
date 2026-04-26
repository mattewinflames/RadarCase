import React, { useState } from 'react';
import { BuyingStep } from '../types';
import { CheckCircle2, ClipboardList } from 'lucide-react';

interface Props {
  step: BuyingStep;
}

export default function StepDetailContent({ 
  step
}: Props) {
  if (step === 'proposta' || step === 'mutuo') {
    const checklistData = [
      { id: 'pers', category: 'Documenti Personali', items: ['Carta d\'Identità', 'Codice Fiscale', 'Stato Civile'] },
      { id: 'redd', category: 'Documenti di Reddito', items: ['Ultime 3 buste paga', 'CUD/Modello Unico (ultimi 2 anni)', 'Estratti conto (3-6 mesi)'] },
      { id: 'imm', category: 'Documenti Immobile', items: ['Proposta accettata', 'Compromesso registrato', 'Visura e Planimetria catastale'] }
    ];

    return (
      <ChecklistSection data={checklistData} />
    );
  }

  return null;
}

function ChecklistSection({ data }: { data: any[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 mb-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden p-8 md:p-12">
          <div className="flex items-center gap-6 mb-12">
             <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
               <ClipboardList className="w-8 h-8" />
             </div>
             <div>
               <h2 className="text-2xl font-bold text-slate-900">Dossier Documentazione</h2>
               <p className="text-sm text-slate-500">Prepara tutto il necessario per la banca e il notaio.</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {data.map(group => (
              <div key={group.id} className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600 mb-6">{group.category}</h4>
                <ul className="space-y-3">
                  {group.items.map((item: string, i: number) => {
                    const itemId = `${group.id}-${i}`;
                    const isChecked = checked[itemId];
                    return (
                      <li 
                        key={i} 
                        className="flex items-start gap-3 group cursor-pointer"
                        onClick={() => toggle(itemId)}
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isChecked ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-100' : 'border-slate-200 group-hover:border-blue-400'
                        }`}>
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={`text-sm transition-all duration-300 ${
                          isChecked ? 'text-slate-400 line-through' : 'text-slate-600 font-medium group-hover:text-slate-900'
                        }`}>{item}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-start gap-4">
             <CheckCircle2 className="w-5 h-5 text-blue-600 mt-1" />
             <p className="text-sm text-blue-950/70 leading-relaxed italic">
               "Per ottenere la delibera del mutuo, dovrai preparare un dossier corposo. Inizia a raccogliere questi documenti il prima possibile per evitare ritardi."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
