/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, FileText, Handshake, Banknote, Key, CheckCircle2, 
  Circle, AlertCircle, TrendingUp, ArrowRight, Info, Upload, Eye, File
} from 'lucide-react';
import { JOURNEY_STEPS, BuyingStep, Task } from '../types';

const ICON_MAP = {
  Search: Search,
  FileText: FileText,
  Handshake: Handshake,
  Banknote: Banknote,
  Key: Key,
};

interface TaskDocument {
  name: string;
  url: string;
  uploadedAt: number;
}

interface Props {
  currentStep: BuyingStep;
  completedTasks: string[];
  taskDocuments: Record<string, TaskDocument>;
  onStepChange: (step: BuyingStep) => void;
  onToggleTask: (taskId: string) => void;
  onUploadDocument: (taskId: string, file: File) => void;
}

export default function JourneyTracker({ 
  currentStep, 
  completedTasks, 
  taskDocuments,
  onStepChange, 
  onToggleTask,
  onUploadDocument
}: Props) {
  const currentIdx = JOURNEY_STEPS.findIndex(s => s.id === currentStep);
  const activeStep = JOURNEY_STEPS[currentIdx];
  
  const stepProgress = activeStep.tasks.length > 0 
    ? (activeStep.tasks.filter(t => completedTasks.includes(t.id)).length / activeStep.tasks.length) * 100
    : 0;

  const totalMandatoryTasks = JOURNEY_STEPS.flatMap(s => s.tasks.filter(t => t.isMandatory));
  const completedMandatoryTasks = totalMandatoryTasks.filter(t => completedTasks.includes(t.id));
  const overallProgress = (completedMandatoryTasks.length / totalMandatoryTasks.length) * 100;

  const handleFileChange = (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadDocument(taskId, file);
    }
  };

  return (
    <div className="space-y-8" id="journey-tracker">
      {/* Horizontal Mini-Map Navigation */}
      <div className="bg-white rounded-[32px] p-2 border border-slate-200 shadow-sm flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        {JOURNEY_STEPS.map((step, idx) => {
          const Icon = ICON_MAP[step.icon as keyof typeof ICON_MAP];
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;

          return (
            <button
              key={step.id}
              onClick={() => onStepChange(step.id)}
              className={`flex-1 min-w-[120px] flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                  : 'hover:bg-slate-50 text-slate-400'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isActive ? 'bg-blue-500' : isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'
              }`}>
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest truncate ${isActive ? 'text-white' : 'text-slate-500'}`}>
                {step.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Dashboard Card */}
      <div className="bg-white rounded-[48px] p-8 md:p-12 border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        {/* Decorative background pulse */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full -mr-48 -mt-48 blur-[80px]" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
          
          {/* Left Column: Info & Summary */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                  {React.createElement(ICON_MAP[activeStep.icon as keyof typeof ICON_MAP], { className: "w-6 h-6" })}
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">{activeStep.label}</h2>
                  <p className="text-slate-500 text-sm">{activeStep.description}</p>
                </div>
              </div>
              
              <div className="pt-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">Progresso Fase</span>
                  <span className="text-lg font-bold text-blue-600">{Math.round(stepProgress)}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stepProgress}%` }}
                    className="h-full bg-blue-600 rounded-full"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
              <div className="flex items-center gap-2 mb-4 text-slate-900">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-widest text-[10px]">Stato Complessivo</span>
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold">{Math.round(overallProgress)}%</span>
                <span className="text-slate-400 text-xs mb-1.5">del percorso completato</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed italic">
                "{idxToMotivation(currentIdx)}"
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
               <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
               <div>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-1">Consiglio Esperto</p>
                 <p className="text-xs text-amber-700 leading-relaxed">
                   {getStepTips(activeStep.id)}
                 </p>
               </div>
            </div>
          </div>

          {/* Right Column: Interactive Checklist */}
          <div className="lg:col-span-7">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              Cose da fare ora
            </h3>

            <div className="space-y-4">
              {activeStep.tasks.map((task) => {
                const isDone = completedTasks.includes(task.id);
                const doc = taskDocuments[task.id];
                const isDocumentTask = task.type === 'document';

                return (
                  <div 
                    key={task.id}
                    className={`w-full flex flex-col p-5 rounded-2xl border-2 transition-all group ${
                      isDone 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
                        : 'bg-white border-slate-100 hover:border-blue-100 hover:shadow-md text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-4 w-full">
                      <button
                        onClick={() => onToggleTask(task.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold transition-all ${isDone ? 'line-through opacity-60' : ''}`}>
                          {task.label}
                        </p>
                        {task.isMandatory && !isDone && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-blue-500">Obbligatorio</span>
                        )}
                      </div>
                    </div>

                    {isDocumentTask && (
                      <div className="mt-4 pt-4 border-t border-slate-100/50 flex flex-wrap items-center gap-3">
                        {doc ? (
                          <div className="flex items-center gap-3 bg-white/50 px-3 py-2 rounded-xl border border-emerald-200 w-full">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                              <File className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-emerald-800 truncate">{doc.name}</p>
                              <p className="text-[9px] text-emerald-600 opacity-70">
                                Caricato il {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="p-2 hover:bg-emerald-200 rounded-lg text-emerald-700 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          </div>
                        ) : (
                          <div className="relative w-full">
                            <input 
                              type="file" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                              onChange={(e) => handleFileChange(task.id, e)}
                            />
                            <div className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl group-hover:border-blue-200 transition-colors text-slate-400 group-hover:text-blue-500">
                              <Upload className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Carica Documento</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {stepProgress === 100 && activeStep.id !== 'rogito' && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onStepChange(JOURNEY_STEPS[currentIdx + 1].id)}
                className="mt-8 w-full bg-slate-900 text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-slate-800 shadow-xl active:scale-[0.98] transition-all"
              >
                Passa alla Fase Successiva
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function idxToMotivation(idx: number): string {
  const quotes = [
    "La fase preparatoria è fondamentale. Definire bene il budget e la zona ti farà risparmiare mesi di ricerche a vuoto.",
    "L'offerta è un atto di coraggio e strategia. Verifica ogni documento prima di firmare per dormire sonni tranquilli.",
    "Il compromesso suggella l'accordo. La regolarità urbanistica e condominiale è la tua priorità in questo momento.",
    "I numeri entrano nel vivo. Il mutuo è un impegno a lungo termine, scegli bene il tuo partner finanziario.",
    "Sei arrivato alla meta! Il rogito è il traguardo di un lungo viaggio. Benvenuto nella tua nuova casa!"
  ];
  return quotes[idx] || quotes[0];
}

function getStepTips(step: BuyingStep): string {
  switch(step) {
    case 'ricerca': return "Chiedi sempre la visura catastale prima di visitare: ti dirà se la casa è 'regolare' ancor prima di entrarci.";
    case 'proposta': return "Non dimenticare mai la clausola sospensiva per il mutuo: ti tutela se la banca dovesse negarti il finanziamento.";
    case 'compromesso': return "La trascrizione del preliminare dal notaio ti protegge da eventuali pignoramenti o doppie vendite del proprietario.";
    case 'mutuo': return "Il perito banca non guarda la bellezza della casa, ma la sua vendibilità e regolarità. Sii presente durante il sopralluogo.";
    case 'rogito': return "Il saldo prezzo va fatto con assegni circolari o bonifico irrevocabile (BIR). Controlla che le chiavi aprano tutte le porte!";
    default: return "";
  }
}
