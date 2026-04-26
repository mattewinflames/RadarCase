import React from 'react';
import { File, Download, Search, Clock, Folder } from 'lucide-react';
import { motion } from 'motion/react';
import { JOURNEY_STEPS } from '../types';

interface TaskDocument {
  name: string;
  url: string;
  uploadedAt: number;
}

interface Props {
  taskDocuments: Record<string, TaskDocument>;
}

export default function DocumentArchive({ taskDocuments }: Props) {
  const allDocs = Object.entries(taskDocuments).map(([taskId, doc]) => {
    const step = JOURNEY_STEPS.find(s => s.tasks.some(t => t.id === taskId));
    const task = step?.tasks.find(t => t.id === taskId);
    return {
      ...doc,
      taskId,
      stepLabel: step?.label || 'Sconosciuto',
      taskLabel: task?.label || 'Sconosciuto'
    };
  }).sort((a, b) => b.uploadedAt - a.uploadedAt);

  if (allDocs.length === 0) return null;

  return (
    <div className="bg-white rounded-[48px] p-8 md:p-12 border border-slate-200 shadow-xl shadow-slate-200/30">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-3 bg-blue-50 rounded-2xl">
          <Folder className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Archivio Documenti</h2>
          <p className="text-sm text-slate-500">Tutti i file caricati durante il tuo percorso.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allDocs.map((doc, idx) => (
          <motion.div 
            key={doc.taskId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="group p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <File className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">{doc.stepLabel}</p>
                <h4 className="text-sm font-bold text-slate-900 truncate mb-1">{doc.name}</h4>
                <p className="text-[10px] text-slate-500 font-medium">{doc.taskLabel}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-200/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase tracking-widest">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
              </div>
              <a 
                href={doc.url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-[9px] font-bold uppercase tracking-widest text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-slate-100"
              >
                <Download className="w-3 h-3" />
                Scarica
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
