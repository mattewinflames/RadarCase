import React, { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants/defaults';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => Promise<void>;
  onReset: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onReset
}) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [activeTab, setActiveTab] = useState<'buy' | 'rent'>(settings.appMode);

  // Sincronizza lo stato locale quando la modale si apre o i settings cambiano
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setActiveTab(settings.appMode);
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await onSave({ ...localSettings, appMode: activeTab });
      onClose();
    } catch (error) {
      console.error("Errore durante il salvataggio:", error);
      alert("Errore nel salvataggio delle impostazioni.");
    }
  };

  const handleReset = async () => {
    const modeLabel = activeTab === 'buy' ? 'Acquisto Casa' : 'Affitto';
    if (window.confirm(`Sei sicuro di voler resettare le impostazioni di "${modeLabel}" ai valori iniziali?`)) {
      // 1. Reset locale immediato per la tab corrente
      const resetSettings = {
        ...localSettings,
        [activeTab]: DEFAULT_SETTINGS[activeTab]
      };
      setLocalSettings(resetSettings);
      
      // 2. Notifica il parent per aggiornare Firestore
      await onReset();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh] shadow-xl">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Impostazioni Calcolo</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'buy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('buy')}
          >
            Parametri Acquisto
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'rent' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('rent')}
          >
            Parametri Affitto
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'buy' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capitale Iniziale (€)</label>
                <input
                  type="number"
                  value={localSettings.buy.initialCapital}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    buy: { ...localSettings.buy, initialCapital: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tasso Mutuo (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={localSettings.buy.mortgageRate}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    buy: { ...localSettings.buy, mortgageRate: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Mensile Massimo (€)</label>
                <input
                  type="number"
                  value={localSettings.rent.monthlyBudget}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    rent: { ...localSettings.rent, monthlyBudget: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex flex-wrap gap-3">
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset {activeTab === 'buy' ? 'Acquisto' : 'Affitto'}
          </button>
          
          <div className="flex-1" />
          
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
};
