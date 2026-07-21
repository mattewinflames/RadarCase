import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { House, UserSettings } from '../types';
import { Home as HomeIcon, Briefcase, User as UserIcon, ExternalLink, AlertCircle, ChevronDown } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Fix for default marker icon in Leaflet + React
// We use custom icons for everything to avoid path issues
const createCustomIcon = (iconElement: React.ReactNode, color: string, shape: 'circle' | 'square' = 'circle') => {
  const html = renderToStaticMarkup(
    <div style={{ 
      color: 'white', 
      backgroundColor: color,
      padding: '8px',
      borderRadius: shape === 'square' ? '9px' : '50%',
      border: '2px solid white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {iconElement}
    </div>
  );
  return L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

interface Props {
  houses: House[];
  onSelectHouse: (id: string) => void;
  settings: UserSettings;
}

// Solleva l'istanza della mappa al componente padre, così il pannello-legenda
// (che vive fuori da MapContainer) può comandare pan/zoom.
function MapReady({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  React.useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}

function SetViewOnSelection({ houses, settings }: { houses: House[], settings: UserSettings }) {
  const map = useMap();
  React.useEffect(() => {
    const validPoints = houses.filter(h => h.lat && h.lng);
    const dest = settings[settings.appMode].destinations;

    const allPoints: [number, number][] = [
      ...validPoints.map(p => [p.lat!, p.lng!] as [number, number]),
      ...(dest.daughter.lat && dest.daughter.lng ? [[dest.daughter.lat, dest.daughter.lng] as [number, number]] : []),
      ...(dest.work.lat && dest.work.lng ? [[dest.work.lat, dest.work.lng] as [number, number]] : []),
    ];

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [70, 70], animate: true });
    }
  }, [houses, settings, map]);
  return null;
}

function LazyMarkers({ houses, onSelectHouse }: { houses: House[], onSelectHouse: (id: string) => void }) {
  const map = useMap();
  const [visibleHouses, setVisibleHouses] = React.useState<House[]>([]);

  const updateVisibleMarkers = React.useCallback(() => {
    const bounds = map.getBounds();
    const filtered = houses.filter(house => {
      if (!house.lat || !house.lng) return false;
      return bounds.contains(L.latLng(house.lat, house.lng));
    });
    setVisibleHouses(filtered);
  }, [houses, map]);

  useMapEvents({
    moveend: updateVisibleMarkers,
    zoomend: updateVisibleMarkers,
  });

  // Initial update and sync when houses prop changes
  React.useEffect(() => {
    updateVisibleMarkers();
  }, [houses, updateVisibleMarkers]);

  return (
    <>
      {visibleHouses.map(house => (
        <Marker 
          key={house.id} 
          position={[house.lat!, house.lng!]}
          icon={createCustomIcon(<HomeIcon size={18} />, '#2563eb')}
        >
          <Popup className="custom-popup">
            <div className="p-2 min-w-[200px]">
              <h4 className="font-bold text-slate-900 mb-1 leading-tight">{house.title}</h4>
              <p className="text-[10px] text-slate-500 mb-3">{house.location}</p>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                 <p className="text-sm font-bold text-blue-600">€ {house.price.toLocaleString('it-IT')}</p>
                 <div className="flex gap-2">
                   <a href={house.link} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                      <ExternalLink size={14} />
                   </a>
                   <button 
                    onClick={() => onSelectHouse(house.id)}
                    className="text-[10px] font-bold uppercase tracking-widest bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                   >
                     Dettagli
                   </button>
                 </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export default function PropertyMap({ houses, onSelectHouse, settings }: Props) {
  const mapHouses = houses.filter(h => h.lat && h.lng);
  const dest = settings[settings.appMode].destinations;

  const [mapInstance, setMapInstance] = React.useState<L.Map | null>(null);
  const [listOpen, setListOpen] = React.useState(false);
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  // Porta la mappa su un immobile (usato al passaggio del mouse / al tap nel pannello).
  const focusHouse = React.useCallback((house: House) => {
    if (!mapInstance || house.lat == null || house.lng == null) return;
    const z = Math.max(mapInstance.getZoom(), 14);
    mapInstance.flyTo([house.lat, house.lng], z, { duration: 0.5 });
  }, [mapInstance]);

  const hoveredHouse = hoveredId ? mapHouses.find(h => h.id === hoveredId) : null;

  return (
    <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden h-full relative z-0" id="property-map">
      <MapContainer 
        center={[44.4949, 11.3426]} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <MapReady onReady={setMapInstance} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="topright" />
        
        {/* Target Locations Markers - renderizzati solo se hanno coordinate reali,
            altrimenti si creerebbero marker "fantasma" al centro di Bologna con etichetta vuota.
            Il doppio ! forza un booleano: con lat/lng a 0 (default) React renderizzerebbe "0". */}
        {!!(settings[settings.appMode].destinations.daughter.lat && settings[settings.appMode].destinations.daughter.lng) && (
          <Marker 
            position={[settings[settings.appMode].destinations.daughter.lat, settings[settings.appMode].destinations.daughter.lng]} 
            icon={createCustomIcon(<UserIcon size={18} />, '#10b981', 'square')}
          >
            <Popup>
              <div className="p-1">
                <p className="font-bold text-xs">{settings[settings.appMode].destinations.daughter.label}</p>
                <p className="text-[10px] text-slate-500">{settings[settings.appMode].destinations.daughter.address}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {!!(settings[settings.appMode].destinations.work.lat && settings[settings.appMode].destinations.work.lng) && (
          <Marker 
            position={[settings[settings.appMode].destinations.work.lat, settings[settings.appMode].destinations.work.lng]} 
            icon={createCustomIcon(<Briefcase size={18} />, '#f59e0b', 'square')}
          >
            <Popup>
              <div className="p-1">
                <p className="font-bold text-xs">{settings[settings.appMode].destinations.work.label}</p>
                <p className="text-[10px] text-slate-500">{settings[settings.appMode].destinations.work.address}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Houses Markers (Lazy Loaded) */}
        <LazyMarkers houses={mapHouses} onSelectHouse={onSelectHouse} />

        {/* Evidenziazione dell'immobile sotto il mouse nel pannello */}
        {hoveredHouse && hoveredHouse.lat != null && hoveredHouse.lng != null && (
          <CircleMarker
            center={[hoveredHouse.lat, hoveredHouse.lng]}
            radius={22}
            pathOptions={{ color: '#2563eb', weight: 3, fillColor: '#2563eb', fillOpacity: 0.12 }}
          />
        )}

      <SetViewOnSelection houses={houses} settings={settings} />
      </MapContainer>

      {/* Map Legend/Overlay */}
      <div className="absolute top-6 left-6 z-[1000] bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-200 shadow-2xl flex flex-col gap-4">
         <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Legenda Mappa</h3>
         <button
           onClick={() => setListOpen(o => !o)}
           className="flex items-center gap-3 w-full text-left group"
           title="Mostra l'elenco degli immobili localizzati"
         >
           <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0"><HomeIcon size={14} /></div>
           <span className="text-[11px] font-bold text-slate-700 flex-1">Immobili Salvati ({mapHouses.length}/{houses.length})</span>
           {mapHouses.length > 0 && (
             <ChevronDown size={14} className={`text-slate-400 transition-transform ${listOpen ? 'rotate-180' : ''}`} />
           )}
         </button>

         {listOpen && mapHouses.length > 0 && (
           <div className="-mt-1 max-h-64 overflow-y-auto no-scrollbar flex flex-col gap-0.5 pr-1">
             {mapHouses.map(h => (
               <button
                 key={h.id}
                 onMouseEnter={() => { setHoveredId(h.id); focusHouse(h); }}
                 onMouseLeave={() => setHoveredId(null)}
                 onClick={() => { focusHouse(h); onSelectHouse(h.id); }}
                 className={`text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                   hoveredId === h.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                 }`}
               >
                 <p className="text-[11px] font-bold text-slate-700 truncate">{h.title}</p>
                 <p className="text-[10px] text-slate-400 truncate">
                   € {h.price.toLocaleString('it-IT')}{h.type === 'rent' ? '/mese' : ''} · {h.location}
                 </p>
               </button>
             ))}
           </div>
         )}

         {!!(dest.daughter.lat && dest.daughter.lng) && (
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: '#10b981' }}><UserIcon size={14} /></div>
             <span className="text-[11px] font-bold text-slate-700">{dest.daughter.label || 'Destinazione 1'}</span>
           </div>
         )}

         {!!(dest.work.lat && dest.work.lng) && (
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: '#f59e0b' }}><Briefcase size={14} /></div>
             <span className="text-[11px] font-bold text-slate-700">{dest.work.label || 'Destinazione 2'}</span>
           </div>
         )}

         {houses.some(h => h.geocodingFailed) && (
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 border border-red-200"><AlertCircle size={14} /></div>
             <span className="text-[11px] font-bold text-red-600">{houses.filter(h => h.geocodingFailed).length} errori posizione</span>
           </div>
         )}

         {mapHouses.length < houses.length && houses.some(h => !h.lat && !h.geocodingFailed) && (
           <p className="text-[9px] text-blue-500 font-bold animate-pulse">
              Geolocalizzazione in corso...
           </p>
         )}
      </div>
    </div>
  );
}
