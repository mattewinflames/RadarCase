import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Radar, MousePointerClick, Check, Copy, Zap, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** URL di produzione dell'app, usato dal bookmarklet come destinazione. */
  appUrl: string;
}

/**
 * Sorgente del bookmarklet importatore.
 * Deve restare allineato a importer.js. {{APP_URL}} viene sostituito a runtime,
 * cosi' il segnalibro punta sempre al dominio giusto senza dover ricompilare.
 */
const IMPORTER_SOURCE = "(function () { var APP = '{{APP_URL}}'; function b64url(s) { return btoa(unescape(encodeURIComponent(s))) .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, ''); } var url = location.href.split('#')[0]; var payload = null; try { if (/(^|\\.)immobiliare\\.it$/.test(location.hostname)) { var nd = document.getElementById('__NEXT_DATA__'); if (nd) { var j = JSON.parse(nd.textContent); var dd = j && j.props && j.props.pageProps && j.props.pageProps.detailData; var re = dd && dd.realEstate; var p = re && re.properties && re.properties[0]; if (re && p) { var loc = p.location || {}; var en = p.energy || {}; var costs = p.costs || {}; payload = { v: 1, mode: 'exact', url: url, data: { title: re.title, price: (re.price && re.price.value) || (p.price && p.price.value) || null, surface: p.surface, address: loc.address, streetNumber: loc.streetNumber, city: loc.city, lat: loc.latitude, lng: loc.longitude, buildingYear: p.buildingYear, floor: p.floor && p.floor.floorOnlyValue, condition: p.condition, heating: p.ga4Heating || en.heatingType, energyClass: en.class && en.class.name, epi: en.epi, condoFees: costs.condominiumExpenses, contract: re.contract } }; } } } } catch (e) { payload = null; /* struttura cambiata: si ripiega sul testo */ } if (!payload) { var hints = []; try { var nodes = document.querySelectorAll('img[alt], [aria-label], [title]'); for (var i = 0; i < nodes.length && hints.length < 12; i++) { var el = nodes[i]; var s = el.getAttribute('alt') || el.getAttribute('aria-label') || el.getAttribute('title') || ''; if (s && /energ|classe|certific/i.test(s) && hints.indexOf(s) === -1) { hints.push(s.slice(0, 80)); } } } catch (e) { /* niente indizi, pazienza */ } payload = { v: 1, mode: 'text', url: url, title: document.title, text: (document.body.innerText || '').slice(0, 15000), hints: hints }; } var target = APP + '#import=' + b64url(JSON.stringify(payload)); var w = window.open(target, '_blank'); if (!w) { location.href = target; } /* popup bloccato: si naviga nella stessa scheda */ })();";

export default function InstallBookmarkletModal({ isOpen, onClose, appUrl }: Props) {
  const dragRef = useRef<HTMLAnchorElement | null>(null);
  const [copied, setCopied] = useState(false);

  const bookmarklet = 'javascript:' + encodeURIComponent(
    IMPORTER_SOURCE.replace('{{APP_URL}}', appUrl)
  );

  // React sanifica gli href "javascript:", quindi non si puo' passarlo come prop.
  // Lo iniettiamo direttamente nel nodo dopo il montaggio: serve un <a> reale
  // perche' il segnalibro sia trascinabile sulla barra dei preferiti.
  useEffect(() => {
    if (isOpen && dragRef.current) {
      dragRef.current.setAttribute('href', bookmarklet);
    }
  }, [isOpen, bookmarklet]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(bookmarklet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      /* clipboard negata: l'utente puo' selezionare il testo a mano */
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto"
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Radar className="text-indigo-600" size={20} />
                  <h2 className="text-lg font-bold text-slate-800">Importa con un clic</h2>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Chiudi">
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                Aggiungi il pulsante ai preferiti del browser. Poi, da un annuncio su Immobiliare o
                Idealista, ti bastera' un clic per aprire RadarCase con la scheda gia' compilata.
              </p>

              {/* Zona di trascinamento */}
              <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-slate-50 p-6 text-center mb-3">
                <a
                  ref={dragRef}
                  onClick={e => e.preventDefault()}
                  className="inline-block cursor-grab active:cursor-grabbing select-none rounded-lg bg-indigo-600 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-600/30"
                >
                  Importa in RadarCase
                </a>
                <p className="mt-3 text-xs text-slate-500">
                  Trascinami sulla barra dei preferiti
                </p>
              </div>

              {/* Ripiego: copia il codice */}
              <div className="mb-6">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copied ? 'Codice copiato' : 'Il trascinamento non funziona? Copia il codice'}
                </button>
                <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
                  Crea un segnalibro qualsiasi, aprilo in modifica e incolla il codice al posto dell'indirizzo.
                </p>
              </div>

              {/* Come si usa */}
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <Step icon={<MousePointerClick size={15} />} n="1">
                  Apri un annuncio su <strong>Immobiliare</strong> o <strong>Idealista</strong> e aspetta che carichi del tutto.
                </Step>
                <Step icon={<Radar size={15} />} n="2">
                  Clicca <strong>Importa in RadarCase</strong> nei preferiti: si apre una scheda con il modulo pieno.
                </Step>
                <Step icon={<Check size={15} />} n="3">
                  Controlla i campi, aggiungi voto e note, salva.
                </Step>
              </div>

              {/* Cosa aspettarsi */}
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                  <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                    <Zap size={13} />
                    <span className="text-[11px] font-bold uppercase tracking-wide">Immobiliare</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">Esatto e istantaneo, mappa inclusa.</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                  <div className="flex items-center gap-1.5 text-amber-700 mb-1">
                    <Sparkles size={13} />
                    <span className="text-[11px] font-bold uppercase tracking-wide">Idealista e altri</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">Letto dall'AI, qualche secondo.</p>
                </div>
              </div>

              <p className="mt-5 text-[10px] text-slate-400 leading-relaxed">
                I dati dell'annuncio restano nel tuo browser e non vengono inviati a nessun server esterno.
                Su telefono i segnalibri sono scomodi: l'importazione da bookmarklet e' pensata per il computer.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Step({ icon, n, children }: { icon: ReactNode; n: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
        {icon}
      </div>
      <p className="text-sm text-slate-600 leading-relaxed pt-0.5">
        <span className="font-bold text-slate-400 mr-1">{n}.</span>{children}
      </p>
    </div>
  );
}
