/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Home, Map, Calculator, Layers, LayoutGrid, Info, LogOut, LogIn, 
  ArrowUpDown, Clock, Euro, Star, MapPin, ChevronDown, ChevronLeft, ChevronRight,
  ArrowLeft, Settings, Menu, X, Heart, Database, Shield, Radar
} from 'lucide-react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import JourneyTracker from './components/JourneyTracker';
import HouseCard from './components/HouseCard';
import ExpenseSimulator from './components/ExpenseSimulator';
import RentExpenseSimulator from './components/RentExpenseSimulator';
import AddHouseModal from './components/AddHouseModal';
import StepDetailContent from './components/StepDetailContent';
import PropertyMap from './components/PropertyMap';
import MapPage from './pages/MapPage';
import DocumentArchive from './components/DocumentArchive';
import Logo from './components/Logo';
import SettingsModal from './components/SettingsModal';
import { House, BuyingStep, UserSettings, DEFAULT_SETTINGS } from './types';
import { useDragScroll } from './hooks/useDragScroll';
import { 
  auth, 
  db, 
  signIn, 
  signOut, 
  onAuthStateChanged, 
  User,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  setDoc,
  getDoc,
  checkRedirectResult,
  getDocFromServer
} from './lib/firebase';

type SortOption = 'date' | 'price' | 'sqm' | 'score' | 'distance_arianna' | 'distance_work';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<BuyingStep>('ricerca');
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [taskDocuments, setTaskDocuments] = useState<Record<string, any>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [connectionError, setConnectionError] = useState(false);

  // Connection Test
  const testConnection = async () => {
    setConnectionError(false);
    try {
      // Use a timeout to avoid waiting too long for the unavailable state
      const connectionPromise = getDocFromServer(doc(db, 'test', 'connection'));
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      );
      
      await Promise.race([connectionPromise, timeoutPromise]);
    } catch (error: any) {
      if (
        error.message === 'timeout' ||
        error.message?.includes('the client is offline') || 
        error.code === 'unavailable' ||
        error.code === 'deadline-exceeded'
      ) {
        console.error("Firebase connection check failed:", error);
        setConnectionError(true);
      }
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const [sortBy, setSortBy] = useState<SortOption>('date');
  const dragScroll = useDragScroll();

  const sortedHouses = useMemo(() => {
    const filtered = houses.filter(h => (h.type || 'buy') === userSettings.appMode);
    const mode = userSettings.appMode;
    const dest = userSettings[mode].destinations;

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price': return a.price - b.price;
        case 'sqm': return (b.sqm || 0) - (a.sqm || 0);
        case 'score': return (b.score || 0) - (a.score || 0);
        case 'distance_arianna': 
          const distA = parseFloat((a.commute?.daughter.distance || '999').toString());
          const distB = parseFloat((b.commute?.daughter.distance || '999').toString());
          const safeA = isNaN(distA) ? 999 : distA;
          const safeB = isNaN(distB) ? 999 : distB;
          return safeA - safeB;
        case 'distance_work':
          const wA = parseFloat((a.commute?.work.distance || '999').toString());
          const wB = parseFloat((b.commute?.work.distance || '999').toString());
          const safeWA = isNaN(wA) ? 999 : wA;
          const safeWB = isNaN(wB) ? 999 : wB;
          return safeWA - safeWB;
        default: return b.createdAt - a.createdAt;
      }
    });
  }, [houses, sortBy, userSettings]);

  // Auth Listener
  useEffect(() => {
    // Handle redirect result for mobile
    checkRedirectResult().catch(err => {
      console.error("Redirect login error:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setHouses([]);
        setSelectedHouseId(null);
        setUserSettings(DEFAULT_SETTINGS);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Houses from Firestore
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setHouses([]);
    setLastDoc(null);
    setHasMore(true);

    // We use a query with a limit for the initial load
    // Note: for real-time + pagination we usually listen to a base query 
    // but for very large datasets, we fetch pages. 
    // Here we'll start with a limit and provide a "load more" function.
    const q = query(
      collection(db, 'houses'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const housesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as House[];
      
      setHouses(housesData);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 10);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching houses:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const loadMoreHouses = async () => {
    if (!user || loadingMore || !hasMore || !lastDoc) return;

    setLoadingMore(true);
    try {
      const nextQuery = query(
        collection(db, 'houses'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(10)
      );

      // Page fetching usually doesn't use onSnapshot for subsequent pages 
      // unless we want a complex real-time pagination system.
      // For simplicity and typical "load more" behavior:
      const { getDocs } = await import('firebase/firestore');
      const snapshot = await getDocs(nextQuery);
      
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        const nextHouses = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as House[];

        setHouses(prev => [...prev, ...nextHouses]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 10);
      }
    } catch (error) {
      console.error("Error loading more houses:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Helper for straight-line distance (km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const performGeocoding = async (house: House) => {
    const tryGeocode = async (query: string) => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&region=it&language=it`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          return { lat, lng };
        }
        return null;
      } catch {
        return null;
      }
    };

    try {
      let result = null;
      // Clean location: remove internal/floor info but preserve exact numbers and slashes
      const cleanAddress = (addr: string) => {
        return addr
          .replace(/\b(int|interno|p(?:\.|iano)?)\b\.?\s*\d+/gi, '') // Remove internal/floor info
          .replace(/\s+/g, ' ')
          .trim();
      };

      const baseLocation = house.location.trim();
      const houseNum = house.houseNumber?.trim() || '';
      // Try without comma first as it often works better for house numbers with slashes
      const fullAddress = houseNum ? `${baseLocation} ${houseNum}` : baseLocation;
      const cleaned = cleanAddress(fullAddress);
      
      // Attempt 1: The full formatted address as entered
      result = await tryGeocode(cleaned);

      // Attempt 2: With comma
      if (!result && houseNum) {
        result = await tryGeocode(`${baseLocation}, ${houseNum}`);
      }

      // Attempt 3: Replace slash with space (sometimes geocoders like this better)
      if (!result && houseNum.includes('/')) {
        const altHouseNum = houseNum.replace('/', ' ');
        result = await tryGeocode(`${baseLocation} ${altHouseNum}`);
      }
      
      // Attempt 4: Use only the part before the slash (last resort for coordinates)
      if (!result && houseNum.includes('/')) {
        const shortHouseNum = houseNum.split('/')[0];
        result = await tryGeocode(`${baseLocation} ${shortHouseNum}`);
      }

      // Attempt 5: Add city context to the full precise address
      if (!result) {
        let queryWithCity = cleaned;
        if (!queryWithCity.toLowerCase().includes('bologna') && !queryWithCity.toLowerCase().includes('san lazzaro')) {
          queryWithCity += ', Bologna, Italy';
        } else if (!queryWithCity.toLowerCase().includes('italy')) {
          queryWithCity += ', Italy';
        }
        result = await tryGeocode(queryWithCity);
      }

      // Attempt 6: If still no result, try a slightly stripped version ONLY IF it has commas separating city info
      if (!result && baseLocation.includes(',')) {
        const parts = baseLocation.split(',');
        if (parts.length > 1) {
          // Keep the first part (street + number) and add context
          result = await tryGeocode(`${parts[0].trim()}, Bologna, Italy`);
        }
      }
      
      if (result) {
        const { lat, lng } = result;
        
        const mode = userSettings.appMode;
        const currentDest = userSettings[mode].destinations;
        // Calculate distances automatically
        const distArianna = (currentDest.daughter.lat !== 0 && currentDest.daughter.lng !== 0)
          ? calculateDistance(
              lat, 
              lng, 
              currentDest.daughter.lat, 
              currentDest.daughter.lng
            )
          : '';
          
        const distWork = (currentDest.work.lat !== 0 && currentDest.work.lng !== 0)
          ? calculateDistance(
              lat, 
              lng, 
              currentDest.work.lat, 
              currentDest.work.lng
            )
          : '';

        await updateHouse(house.id, {
          lat,
          lng,
          geocodingFailed: false,
          commute: {
            daughter: { distance: distArianna },
            work: { distance: distWork }
          }
        });
      } else {
        console.warn("Geocoding returned no results for:", house.location);
        await updateHouse(house.id, { lat: null, lng: null, geocodingFailed: true });
      }
    } catch (error) {
      console.error("Geocoding failed for:", house.title, error);
      await updateHouse(house.id, { geocodingFailed: true });
    }
  };

  // Auto-geocode houses missing coordinates
  useEffect(() => {
    const geocodeMissing = async () => {
      const houseToGeocode = houses.find(h => 
        (h.lat === undefined || h.lat === null || 
        h.lng === undefined || h.lng === null) && 
        !h.geocodingFailed
      );
      
      if (houseToGeocode) {
        await performGeocoding(houseToGeocode);
      }
    };

    if (user && houses.length > 0) {
      geocodeMissing();
    }
  }, [houses, user]);

  // Sync Progress from Firestore
  useEffect(() => {
    if (!user) return;

    const syncProgress = async () => {
      const docRef = doc(db, 'userProgress', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentStep(data.currentStep as BuyingStep);
        setCompletedTasks(data.completedTasks || []);
        setTaskDocuments(data.taskDocuments || {});
      }

      // Sync Settings
      const settingsRef = doc(db, 'userSettings', user.uid);
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        // Migration: support old structure (destinations at top level)
        const oldDest = data.destinations;
        
        setUserSettings({
          ...DEFAULT_SETTINGS,
          ...data,
          buy: {
            destinations: { 
              daughter: { ...DEFAULT_SETTINGS.buy.destinations.daughter, ...(oldDest?.daughter || data.buy?.destinations?.daughter) },
              work: { ...DEFAULT_SETTINGS.buy.destinations.work, ...(oldDest?.work || data.buy?.destinations?.work) }
            }
          },
          rent: {
            destinations: { 
              daughter: { ...DEFAULT_SETTINGS.rent.destinations.daughter, ...(oldDest?.daughter || data.rent?.destinations?.daughter) },
              work: { ...DEFAULT_SETTINGS.rent.destinations.work, ...(oldDest?.work || data.rent?.destinations?.work) }
            }
          }
        } as UserSettings);
      }
    };

    syncProgress();
  }, [user]);

  const toggleTask = async (taskId: string) => {
    if (!user) return;
    
    const newCompleted = completedTasks.includes(taskId)
      ? completedTasks.filter(id => id !== taskId)
      : [...completedTasks, taskId];
    
    setCompletedTasks(newCompleted);
    
    await setDoc(doc(db, 'userProgress', user.uid), {
      currentStep,
      completedTasks: newCompleted,
      updatedAt: Date.now()
    }, { merge: true });
  };

  const handleStepChange = async (step: BuyingStep) => {
    setCurrentStep(step);
    if (user) {
      await setDoc(doc(db, 'userProgress', user.uid), {
        currentStep: step,
        updatedAt: Date.now()
      }, { merge: true });
    }
  };

  const uploadTaskDocument = async (taskId: string, file: File) => {
    if (!user) return;

    // Simulate upload - we store metadata in Firestore
    const docMeta = {
      name: file.name,
      url: URL.createObjectURL(file), // Local preview for demo
      uploadedAt: Date.now()
    };

    const newDocs = { ...taskDocuments, [taskId]: docMeta };
    setTaskDocuments(newDocs);

    await setDoc(doc(db, 'userProgress', user.uid), {
      taskDocuments: newDocs,
      updatedAt: Date.now()
    }, { merge: true });
  };

  const addHouse = async (houseData: Omit<House, 'id' | 'createdAt' | 'commute' | 'type'>) => {
    if (!user) return;

    await addDoc(collection(db, 'houses'), {
      ...houseData,
      type: userSettings.appMode,
      userId: user.uid,
     createdAt: serverTimestamp(),
    });

    setIsModalOpen(false);
  };

  const updateHouse = async (id: string, updates: Partial<House>) => {
    if (!user) return;
    const houseDoc = doc(db, 'houses', id);
    await updateDoc(houseDoc, updates);
  };

  const deleteHouse = async (id: string) => {
    if (!user) return;
    const houseDoc = doc(db, 'houses', id);
    await deleteDoc(houseDoc);
  };

  const updateSettings = async (newSettings: UserSettings) => {
    if (!user) return;
    
    // Check if addresses changed to trigger destination geocoding for the current mode
    const mode = newSettings.appMode;
    const oldDest = userSettings[mode].destinations;
    const currentDest = newSettings[mode].destinations;

    const daughterAddressChanged = currentDest.daughter.address !== oldDest.daughter.address || currentDest.daughter.houseNumber !== oldDest.daughter.houseNumber;
    const workAddressChanged = currentDest.work.address !== oldDest.work.address || currentDest.work.houseNumber !== oldDest.work.houseNumber;
    
    let updatedSettings = { ...newSettings };
    
    const geocodeDest = async (dest: any) => {
      try {
        let queryStr = dest.address.trim();
        if (dest.houseNumber) queryStr += ` ${dest.houseNumber.trim()}`;
        if (dest.zip) queryStr += `, ${dest.zip.trim()}`;
        if (dest.city) queryStr += `, ${dest.city.trim()}`;
        if (!queryStr.toLowerCase().includes('italy')) queryStr += ', Italy';

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(queryStr)}&key=${apiKey}&region=it&language=it`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          return { lat, lng };
        }
      } catch (e) {
        console.error("Failed to geocode destination:", dest.address, e);
      }
      return null;
    };

    if ((daughterAddressChanged || currentDest.daughter.zip !== oldDest.daughter.zip || currentDest.daughter.city !== oldDest.daughter.city) && currentDest.daughter.address) {
      const coords = await geocodeDest(currentDest.daughter);
      if (coords) {
        updatedSettings[mode].destinations.daughter.lat = coords.lat;
        updatedSettings[mode].destinations.daughter.lng = coords.lng;
      }
    }
    
    if ((workAddressChanged || currentDest.work.zip !== oldDest.work.zip || currentDest.work.city !== oldDest.work.city) && currentDest.work.address) {
      const coords = await geocodeDest(currentDest.work);
      if (coords) {
        updatedSettings[mode].destinations.work.lat = coords.lat;
        updatedSettings[mode].destinations.work.lng = coords.lng;
      }
    }

    setUserSettings(updatedSettings);
    await setDoc(doc(db, 'userSettings', user.uid), updatedSettings);
    
    // Trigger re-calculation of distances for all houses (of the current mode)
    const updatePromises = houses.map(h => {
      const houseMode = h.type || 'buy';
      if (houseMode !== mode) return Promise.resolve();

      if (h.lat && h.lng) {
        const dests = updatedSettings[mode].destinations;
        const distArianna = (dests.daughter.lat !== 0 && dests.daughter.lng !== 0)
          ? calculateDistance(h.lat, h.lng, dests.daughter.lat, dests.daughter.lng)
          : '';
          
        const distWork = (dests.work.lat !== 0 && dests.work.lng !== 0)
          ? calculateDistance(h.lat, h.lng, dests.work.lat, dests.work.lng)
          : '';

        return updateHouse(h.id, {
          commute: {
            daughter: { distance: distArianna },
            work: { distance: distWork }
          }
        });
      }
      return Promise.resolve();
    });
    await Promise.all(updatePromises);
  };

  const toggleVisited = async (id: string) => {
    const house = houses.find(h => h.id === id);
    if (house) {
      await updateHouse(id, { visited: !house.visited });
    }
  };

  const retryGeocoding = async (id: string) => {
    const house = houses.find(h => h.id === id);
    if (house) {
      await updateHouse(id, { geocodingFailed: false }); // Reset state to trigger effect or just call function
      await performGeocoding(house);
    }
  };

  const filteredHouses = useMemo(() => houses.filter(h => (h.type || 'buy') === userSettings.appMode), [houses, userSettings.appMode]);
  const averagePrice = filteredHouses.length > 0 ? filteredHouses.reduce((acc, h) => acc + h.price, 0) / filteredHouses.length : 0;
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/mappa" element={<MapPage houses={filteredHouses} settings={userSettings} onSelectHouse={setSelectedHouseId} />} />
      <Route path="/percorso" element={
        <div className="min-h-screen bg-slate-50 pt-32 pb-24 px-6 max-w-7xl mx-auto">
          <header className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/')}
                  className="p-2.5 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors flex items-center gap-2 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Torna alla Dashboard</span>
                </button>
                <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                <Link to="/percorso" className="flex items-center gap-3">
                  <Logo size={40} />
                  <div className="hidden sm:block">
                    <h1 className="text-xl font-bold tracking-tight">
                      {userSettings.appMode === 'buy' ? 'Il Tuo Percorso' : 'Il Tuo Contratto'}
                    </h1>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Step by Step</p>
                  </div>
                </Link>
              </div>
              <nav className="flex items-center gap-8">
                <Link to="/mappa" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">Mappa</Link>
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </nav>
            </div>
          </header>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed inset-x-0 top-20 bg-white border-b border-slate-200 z-[49] md:hidden shadow-xl"
              >
                <nav className="flex flex-col p-6 space-y-4">
                  {user && userSettings.appMode === 'buy' && (
                    <Link 
                      to="/percorso" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-sm font-bold uppercase tracking-widest text-slate-600 py-2 border-b border-slate-50 flex items-center gap-3"
                    >
                      <Layers size={18} className="text-blue-500" />
                      Percorso
                    </Link>
                  )}
                  <Link 
                    to="/mappa" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-bold uppercase tracking-widest text-slate-600 py-2 border-b border-slate-50 flex items-center gap-3"
                  >
                    <Map size={18} className="text-emerald-500" />
                    Mappa
                  </Link>
                  <a 
                    href={user ? "#houses" : "#welcome"} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-bold uppercase tracking-widest text-slate-600 py-2 border-b border-slate-50 flex items-center gap-3"
                  >
                    <LayoutGrid size={18} className="text-indigo-500" />
                    Radar
                  </a>
                  <a 
                    href="#simulator" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-bold uppercase tracking-widest text-slate-600 py-2 border-b border-slate-50 flex items-center gap-3"
                  >
                    <Calculator size={18} className="text-amber-500" />
                    Spese
                  </a>
                  {user && (
                    <button 
                      onClick={() => {
                        setIsSettingsOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-sm font-bold uppercase tracking-widest text-slate-600 py-2 border-b border-slate-50 flex items-center gap-3 text-left"
                    >
                      <Settings size={18} className="text-slate-500" />
                      Impostazioni
                    </button>
                  )}
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
          {user ? (
            <div className="space-y-16">
              <JourneyTracker 
                currentStep={currentStep} 
                completedTasks={completedTasks}
                taskDocuments={taskDocuments}
                onStepChange={handleStepChange} 
                onToggleTask={toggleTask}
                onUploadDocument={uploadTaskDocument}
              />
              <StepDetailContent step={currentStep} />
              <DocumentArchive taskDocuments={taskDocuments} />
            </div>
          ) : (
             <div className="text-center py-20 bg-white rounded-[48px] border border-slate-200">
               <p className="text-slate-500">Accedi per visualizzare il tuo percorso personalizzato.</p>
               <button onClick={signIn} className="mt-4 bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">Accedi</button>
             </div>
          )}
        </div>
      } />
      <Route path="/" element={
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
          {/* Header */}
          <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3">
                <Logo size={40} />
                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    {userSettings.appMode === 'buy' ? 'Radar Acquisti' : 'Radar Affitti'}
                  </h1>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                    Monitoraggio {userSettings.appMode === 'buy' ? 'Acquisto' : 'Locazione'}
                  </p>
                </div>
              </Link>
              
              <nav className="hidden md:flex items-center gap-8">
                {user && userSettings.appMode === 'buy' && (
                  <Link to="/percorso" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">Percorso</Link>
                )}
                <Link to="/mappa" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">Mappa</Link>
                <a href={user ? "#houses" : "#welcome"} className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">Radar</a>
                <a href="#simulator" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">Spese</a>
                {user && (
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Settings size={18} />
                  </button>
                )}
              </nav>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                {user ? (
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-900">{user.displayName}</span>
                      <button 
                        onClick={signOut}
                        className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                      >
                        Esci
                      </button>
                    </div>
                    <button 
                      id="btn-open-modal"
                      onClick={() => setIsModalOpen(true)}
                      className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Aggiungi al Radar</span>
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={signIn}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Accedi</span>
                  </button>
                )}
              </div>
            </div>
          </header>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed inset-x-0 top-20 bg-white border-b border-slate-200 z-[49] md:hidden shadow-xl"
              >
                <nav className="flex flex-col p-6 space-y-4">
                  {user && userSettings.appMode === 'buy' && (
                    <Link 
                      to="/percorso" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-sm font-bold uppercase tracking-widest text-slate-600 py-2 border-b border-slate-50 flex items-center gap-3"
                    >
                      <Layers size={18} className="text-blue-500" />
                      Percorso
                    </Link>
                  )}
                  <Link 
                    to="/mappa" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-bold uppercase tracking-widest text-slate-600 py-2 border-b border-slate-50 flex items-center gap-3"
                  >
                    <Map size={18} className="text-emerald-500" />
                    Mappa
                  </Link>
                  <a 
                    href={user ? "#houses" : "#welcome"} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-bold uppercase tracking-widest text-slate-600 py-2 border-b border-slate-50 flex items-center gap-3"
                  >
                    <LayoutGrid size={18} className="text-indigo-500" />
                    Radar
                  </a>
                  <a 
                    href="#simulator" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-bold uppercase tracking-widest text-slate-600 py-2 border-b border-slate-50 flex items-center gap-3"
                  >
                    <Calculator size={18} className="text-amber-500" />
                    Spese
                  </a>
                  {user && (
                    <button 
                      onClick={() => {
                        setIsSettingsOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-sm font-bold uppercase tracking-widest text-slate-600 py-2 border-b border-slate-50 flex items-center gap-3 text-left"
                    >
                      <Settings size={18} className="text-slate-500" />
                      Impostazioni
                    </button>
                  )}
                </nav>
              </motion.div>
            )}
          </AnimatePresence>

          <main className="pt-32 pb-24 max-w-7xl mx-auto px-6 space-y-16">
            {connectionError && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-3xl flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-100 rounded-xl">
                    <Info className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold tracking-tight">Problema di Connessione</h4>
                    <p className="text-xs text-red-600/80">Impossibile raggiungere Firestore. L'app continuerà in modalità offline.</p>
                  </div>
                </div>
                <button 
                  onClick={() => testConnection()}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Riprova
                </button>
              </motion.div>
            )}
            {!user ? (
              <section id="welcome" className="bg-white border-2 border-dashed border-slate-200 rounded-[48px] p-20 text-center flex flex-col items-center">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8">
                  <Home className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Il tuo spazio privato</h2>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-10 leading-relaxed">
                  Accedi per salvare i tuoi immobili in modo sicuro e sincronizzarli tra computer e telefono. I tuoi dati resteranno privati e sempre accessibili.
                </p>
                <button 
                  onClick={signIn}
                  className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl hover:shadow-blue-900/10 active:scale-95 flex items-center gap-3"
                >
                  <Plus className="w-5 h-5 text-blue-400" />
                  Inizia Ora (Accedi con Google)
                </button>
                <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Info className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Difficoltà su Mobile?</span>
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                    Se il login non si avvia, tocca l'icona <span className="text-blue-500 font-bold">"Apri in una nuova scheda"</span> (in alto a destra nel portale) per accedere senza restrizioni.
                  </p>
                </div>
              </section>
            ) : (
              <>
                {filteredHouses.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-50 rounded-lg"><LayoutGrid className="w-4 h-4 text-slate-400" /></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Case Salvate ({userSettings.appMode === 'buy' ? 'Acquisto' : 'Affitto'})</span>
                      </div>
                      <p className="text-3xl font-bold">{filteredHouses.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-50 rounded-lg"><Map className="w-4 h-4 text-slate-400" /></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Visitata</span>
                      </div>
                      <p className="text-3xl font-bold text-blue-600">{filteredHouses.filter(h => h.visited).length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-50 rounded-lg"><Calculator className="w-4 h-4 text-slate-400" /></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{userSettings.appMode === 'buy' ? 'Prezzo Medio' : 'Canone Medio'}</span>
                      </div>
                      <p className="text-3xl font-bold">{Math.round(averagePrice).toLocaleString('it-IT')} €</p>
                    </div>
                  </div>
                )}

                {/* Permanent Houses Section */}
                 <section id="houses" className="space-y-8 scroll-mt-32">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Logo size={48} className="p-1 bg-white rounded-2xl shadow-sm border border-slate-100" />
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                          {userSettings.appMode === 'buy' ? 'Radar Acquisti' : 'Radar Affitti'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          Immobili in modalità {userSettings.appMode === 'buy' ? 'acquisto' : 'affitto'}
                        </p>
                      </div>
                    </div>

                    {sortedHouses.length > 0 && (
                      <div className="flex overflow-x-auto no-scrollbar pb-2 md:pb-0 gap-2 -mx-2 px-2 md:mx-0 md:px-0 md:flex-wrap">
                        {[
                          { id: 'date', label: 'Recenti', icon: Clock },
                          { id: 'price', label: 'Prezzo', icon: Euro },
                          { id: 'sqm', label: 'Mq²', icon: LayoutGrid },
                          { id: 'score', label: 'Voto', icon: Star },
                          { id: 'distance_arianna', label: userSettings[userSettings.appMode].destinations.daughter.label || 'Dest. 1', icon: MapPin },
                          { id: 'distance_work', label: userSettings[userSettings.appMode].destinations.work.label || 'Dest. 2', icon: MapPin },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setSortBy(opt.id as SortOption)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                              sortBy === opt.id 
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
                                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                            }`}
                          >
                            <opt.icon className="w-3 h-3" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {sortedHouses.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[48px] p-20 text-center flex flex-col items-center">
                      <div className="w-24 h-24 mb-6 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                        <Logo size={96} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Il tuo Radar è vuoto</h3>
                      <p className="text-slate-400 text-sm max-w-sm mx-auto">
                        Inizia ad aggiungere gli immobili per la modalità {userSettings.appMode === 'buy' ? 'acquisto' : 'affitto'}.
                      </p>
                    </div>
                  ) : (
                    <div className="relative group">
                      <div 
                        {...dragScroll}
                        className={`flex overflow-x-auto pb-8 gap-6 snap-x snap-mandatory no-scrollbar -mx-6 px-6 scroll-smooth ${dragScroll.className}`}
                      >
                        {sortedHouses.map((house) => (
                          <div key={house.id} className="min-w-[280px] sm:min-w-[320px] md:min-w-[380px] snap-start pointer-events-none group-active:pointer-events-none [&>*]:pointer-events-auto">
                            <HouseCard 
                              house={house} 
                              settings={userSettings}
                              onDelete={deleteHouse} 
                              onToggleVisited={toggleVisited} 
                              onUpdate={updateHouse}
                              onRetryGeocoding={retryGeocoding}
                              isSelected={selectedHouseId === house.id}
                              onSelect={() => setSelectedHouseId(selectedHouseId === house.id ? null : house.id)}
                            />
                          </div>
                        ))}
                        
                        {hasMore && (
                          <div className="min-w-[200px] flex items-center justify-center snap-start">
                            <button
                              onClick={loadMoreHouses}
                              disabled={loadingMore}
                              className="px-6 py-4 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/30 transition-all flex flex-col items-center gap-2 group"
                            >
                              {loadingMore ? (
                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <>
                                  <Plus className="w-6 h-6 group-hover:scale-120 transition-transform" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Carica Altri</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Desktop Navigation Arrows */}
                      {houses.length > 3 && (
                        <>
                          <button 
                            onClick={() => {
                              if (dragScroll.ref.current) dragScroll.ref.current.scrollBy({ left: -400, behavior: 'smooth' });
                            }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-white rounded-full shadow-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-10 hidden lg:flex"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </button>
                          <button 
                            onClick={() => {
                              if (dragScroll.ref.current) dragScroll.ref.current.scrollBy({ left: 400, behavior: 'smooth' });
                            }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-white rounded-full shadow-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-10 hidden lg:flex"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </section>

                {/* Expense Simulator */}
                {userSettings.appMode === 'buy' ? (
                  sortedHouses.length > 0 && (
                    <ExpenseSimulator 
                      houses={sortedHouses} 
                      selectedHouseId={selectedHouseId} 
                      onHouseSelect={setSelectedHouseId}
                    />
                  )
                ) : (
                  sortedHouses.length > 0 && (
                    <RentExpenseSimulator 
                      houses={sortedHouses} 
                      selectedHouseId={selectedHouseId} 
                      onHouseSelect={setSelectedHouseId}
                    />
                  )
                )}
              </>
            )}

            {/* Info footer removed as requested */}
          </main>

          {/* Footer */}
          <footer className="mt-24 border-t border-slate-100 bg-slate-50/30">
            <div className="max-w-7xl mx-auto px-6 py-16">
              <div className="mb-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                      <Radar className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter text-slate-900">
                      Radar Case
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                    La tua centrale operativa per la ricerca della casa perfetta. 
                    Analisi delle distanze, simulazione spese e supporto IA in un'unica interfaccia pulita e scattante.
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm text-slate-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      Sistema Online
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm text-slate-400">
                      v2.4.0
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 text-center md:text-left">
                  Creato con <Heart className="w-3 h-3 text-red-400 fill-current" /> da <span className="font-bold text-slate-600">Matteo Pastore</span>
                </p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-slate-400 grayscale hover:grayscale-0 transition-all cursor-default">
                    <Database size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Firestore Protected</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 grayscale hover:grayscale-0 transition-all cursor-default">
                    <Shield size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Zero Tracking</span>
                  </div>
                </div>
              </div>
            </div>
          </footer>

          <AddHouseModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onAdd={addHouse} 
            appMode={userSettings.appMode}
          />

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={userSettings}
            onSave={updateSettings}
            onReset={async () => {
    setUserSettings(DEFAULT_SETTINGS);
    if (user) {
      await setDoc(doc(db, 'userSettings', user.uid), DEFAULT_SETTINGS);
    }
  }}
          />
        </div>
      } />
    </Routes>
  );
}
