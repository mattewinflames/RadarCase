import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { House, UserSettings } from '../types';
import { Home as HomeIcon, Briefcase, User as UserIcon, ExternalLink, AlertCircle } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Fix for default marker icon in Leaflet + React
// We use custom icons for everything to avoid path issues
const createCustomIcon = (iconElement: React.ReactNode, color: string) => {
  const html = renderToStaticMarkup(
    <div style={{ 
      color: 'white', 
      backgroundColor: color,
      padding: '8px',
      borderRadius: '50%',
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

  return (
    <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden h-full relative z-0" id="property-map">
      <MapContainer 
        center={[44.4949, 11.3426]} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="topright" />
        
        {/* Target Locations Markers */}
        <Marker 
          position={[settings[settings.appMode].destinations.daughter.lat || 44.4949, settings[settings.appMode].destinations.daughter.lng || 11.3426]} 
          icon={createCustomIcon(<UserIcon size={18} />, '#10b981')}
        >
          <Popup>
            <div className="p-1">
              <p className="font-bold text-xs">{settings[settings.appMode].destinations.daughter.label}</p>
              <p className="text-[10px] text-slate-500">{settings[settings.appMode].destinations.daughter.address}</p>
            </div>
          </Popup>
        </Marker>

        <Marker 
          position={[settings[settings.appMode].destinations.work.lat || 44.4949, settings[settings.appMode].destinations.work.lng || 11.3426]} 
          icon={createCustomIcon(<Briefcase size={18} />, '#6366f1')}
        >
          <Popup>
            <div className="p-1">
              <p className="font-bold text-xs">{settings[settings.appMode].destinations.work.label}</p>
              <p className="text-[10px] text-slate-500">{settings[settings.appMode].destinations.work.address}</p>
            </div>
          </Popup>
        </Marker>

        {/* Houses Markers (Lazy Loaded) */}
        <LazyMarkers houses={mapHouses} onSelectHouse={onSelectHouse} />

      <SetViewOnSelection houses={houses} settings={settings} />
      </MapContainer>

      {/* Map Legend/Overlay */}
      <div className="absolute top-6 left-6 z-[1000] bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-200 shadow-2xl flex flex-col gap-4">
         <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Legenda Mappa</h3>
         <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200"><HomeIcon size={14} /></div>
           <span className="text-[11px] font-bold text-slate-700">Immobili Salvati ({mapHouses.length}/{houses.length})</span>
         </div>

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
