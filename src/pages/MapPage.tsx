import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';
import PropertyMap from '../components/PropertyMap';
import { House, UserSettings } from '../types';

interface Props {
  houses: House[];
  onSelectHouse: (id: string) => void;
  settings: UserSettings;
}

export default function MapPage({ houses, onSelectHouse, settings }: Props) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Map Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 h-20 flex items-center px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2.5 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors flex items-center gap-2 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Torna alla Dashboard</span>
            </button>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                <MapIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">Mappa Esplorativa</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Panoramica geografica immobili</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 hidden md:block">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                {houses.filter(h => h.lat && h.lng).length} Immobili Localizzati
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Map Content */}
      <main className="flex-1 relative">
        <div className="absolute inset-0">
          <PropertyMap 
            houses={houses} 
            settings={settings}
            onSelectHouse={(id) => {
              onSelectHouse(id);
              navigate('/'); // Optional: navigate back to show house details
            }} 
          />
        </div>
      </main>

      {/* Floating Info for Mobile */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-2xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-600 rounded-full" />
              <span className="text-xs font-bold text-slate-700">Immobili Salvati</span>
            </div>
            <span className="text-xs font-bold text-slate-400">{houses.filter(h => h.lat && h.lng).length}</span>
        </div>
      </div>
    </div>
  );
}
