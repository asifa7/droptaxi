
import React, { useState, useEffect, useRef } from 'react';
import { TripType, PoolType, BookingDetails, CarCategory, RouteInsight, LatLng, StopLocation, FavoriteLocation } from '../types';
import { getTripInsights } from '../geminiService';

interface BookingFormProps {
  isLoggedIn?: boolean;
  onComplete: (details: BookingDetails) => void;
  onEnterPinMode: (field: 'from' | 'to' | string) => void;
  externalPickup?: { name: string, coords: LatLng };
  externalDrop?: { name: string, coords: LatLng };
}

interface Suggestion {
  name: string;
  city?: string;
  state?: string;
  lat: number;
  lng: number;
  isMapPin?: boolean;
}

const BookingForm: React.FC<BookingFormProps> = ({ isLoggedIn, onComplete, onEnterPinMode, externalPickup, externalDrop }) => {
  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString('en-CA'); 
    const time = now.toTimeString().slice(0, 5); 
    return { date, time };
  };

  const initial = getCurrentDateTime();

  const [details, setDetails] = useState<BookingDetails>({
    from: '',
    to: '',
    stops: [],
    date: initial.date,
    time: initial.time,
    tripType: TripType.ONE_WAY,
    poolType: PoolType.SOLO,
    isRecurring: false,
    useVirtualStop: true,
    phone: '',
    recipientPhone: '',
    isForSomeoneElse: false,
    carCategory: CarCategory.SEDAN
  });

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [insight, setInsight] = useState<RouteInsight | null>(null);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  
  const searchTimeout = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('taxi_favorites');
    if (saved) setFavorites(JSON.parse(saved));
    detectCurrentLocation();
  }, []);

  const detectCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoadingGeo(true);
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const res = await fetch(`https://photon.komoot.io/reverse?lon=${pos.coords.longitude}&lat=${pos.coords.latitude}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (!res.ok) throw new Error('Network response was not ok');
          
          const data = await res.json();
          const place = data.features[0]?.properties;
          const name = place?.name || place?.street || place?.city || "Current Location";
          setDetails(prev => ({ 
            ...prev, 
            from: name, 
            fromCoords: { lat: pos.coords.latitude, lng: pos.coords.longitude } 
          }));
        } catch (e: any) {
          console.warn("Location name lookup skipped:", e.message);
          setDetails(prev => ({ 
            ...prev, 
            from: "Current Location", 
            fromCoords: { lat: pos.coords.latitude, lng: pos.coords.longitude } 
          }));
        } finally {
          setIsLoadingGeo(false);
        }
      }, (err) => {
        console.warn("Geolocation permission denied or timed out:", err.message);
        setIsLoadingGeo(false);
      }, { timeout: 10000 });
    }
  };

  useEffect(() => {
    if (externalPickup) setDetails(prev => ({ ...prev, from: externalPickup.name, fromCoords: externalPickup.coords }));
  }, [externalPickup]);

  useEffect(() => {
    if (externalDrop) setDetails(prev => ({ ...prev, to: externalDrop.name, toCoords: externalDrop.coords }));
  }, [externalDrop]);

  const fetchSuggestions = (query: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=12.97&lon=77.59`, { 
          signal: controller.signal 
        });
        if (!res.ok) throw new Error('API down');
        const data = await res.json();
        const results = data.features.map((f: any) => ({
          name: f.properties.name || f.properties.street || f.properties.city,
          city: f.properties.city || f.properties.district,
          state: f.properties.state,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0]
        })).filter((s: any) => s.name);
        setSuggestions([{ name: 'Set location on map', isMapPin: true, lat: 0, lng: 0 }, ...results]);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setSuggestions([{ name: 'Set location on map', isMapPin: true, lat: 0, lng: 0 }]);
        }
      }
    }, 300);
  };

  const handleSelectSuggestion = (s: Suggestion, field: string) => {
    if (s.isMapPin) {
      onEnterPinMode(field);
      setActiveField(null);
      return;
    }
    const fullName = `${s.name}${s.city ? ', ' + s.city : ''}`;
    const coords = { lat: s.lat, lng: s.lng };
    if (field === 'from') setDetails(prev => ({ ...prev, from: fullName, fromCoords: coords }));
    else if (field === 'to') setDetails(prev => ({ ...prev, to: fullName, toCoords: coords }));
    setSuggestions([]);
    setActiveField(null);
  };

  const handleInsightFetch = async () => {
    if (details.from && details.to) {
      try {
        const res = await getTripInsights(details.from, details.to);
        setInsight(res);
      } catch (e) {
        console.warn("AI insights failed:", e);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (details.from && details.to && (isLoggedIn || details.phone)) onComplete(details);
    else alert("Please enter pickup and drop locations.");
  };

  return (
    <div className="booking-card bg-white rounded-[2rem] shadow-2xl overflow-hidden w-full border border-slate-100 relative flex flex-col animate-in slide-in-from-bottom-5">
      {/* Top Pool/Solo Selector - More compact */}
      <div className="bg-[#0f172a] p-1 flex space-x-1">
        {[
          { id: PoolType.SOLO, label: 'Solo', icon: '👤' },
          { id: PoolType.INTERCITY_POOL, label: 'Pool', icon: '👥' }
        ].map(mode => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setDetails({ ...details, poolType: mode.id === PoolType.SOLO ? PoolType.SOLO : PoolType.INTERCITY_POOL })}
            className={`flex-1 py-2.5 rounded-[1.2rem] flex items-center justify-center space-x-2 transition-all duration-300 ${
              (details.poolType === PoolType.SOLO && mode.id === PoolType.SOLO) || (details.poolType !== PoolType.SOLO && mode.id === PoolType.INTERCITY_POOL)
              ? 'bg-yellow-400 text-slate-900 shadow-md' 
              : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="text-xs">{mode.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto hide-scrollbar flex-1 bg-white">
        <div className="space-y-3">
          {/* Pickup */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 font-bold text-sm">○</div>
            <input
              type="text"
              required
              placeholder={isLoadingGeo ? "Detecting..." : "Pick-up point"}
              value={details.from}
              autoComplete="off"
              onFocus={() => setActiveField('from')}
              onChange={(e) => { setDetails({ ...details, from: e.target.value }); fetchSuggestions(e.target.value); }}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#f8fafc] focus:bg-white focus:ring-1 focus:ring-slate-900 transition-all outline-none font-bold text-slate-800 text-xs shadow-sm border border-slate-100"
            />
            <button type="button" onClick={() => onEnterPinMode('from')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#ec4899] text-xs hover:scale-110">📍</button>
          </div>

          {/* Drop-off */}
          <div className="relative">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900"></div>
             <input
              type="text"
              required
              placeholder="Drop-off point"
              value={details.to}
              autoComplete="off"
              onFocus={() => setActiveField('to')}
              onChange={(e) => { setDetails({ ...details, to: e.target.value }); fetchSuggestions(e.target.value); }}
              onBlur={() => setTimeout(handleInsightFetch, 300)}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#f8fafc] focus:bg-white focus:ring-1 focus:ring-slate-900 transition-all outline-none font-bold text-slate-800 text-xs shadow-sm border border-slate-100"
            />
            <button type="button" onClick={() => onEnterPinMode('to')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#ec4899] text-xs hover:scale-110">📍</button>
          </div>

          {activeField && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[5000] overflow-hidden">
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => handleSelectSuggestion(s, activeField)} className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center space-x-3 border-b border-slate-50 last:border-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${s.isMapPin ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 text-[10px]'}`}>{s.isMapPin ? '🗺️' : '○'}</div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold truncate text-slate-900">{s.name}</p>
                    <p className="text-[9px] text-slate-400 truncate">{s.city}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 flex-1 min-w-0">
               <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Date</label>
               <div className="relative">
                  <input type="date" value={details.date} onChange={(e) => setDetails({ ...details, date: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 font-bold text-slate-800 text-xs shadow-sm focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none appearance-none" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[10px]">📅</div>
               </div>
            </div>
            <div className="space-y-1 flex-1 min-w-0">
               <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Time</label>
               <div className="relative">
                  <input type="time" value={details.time} onChange={(e) => setDetails({ ...details, time: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 font-bold text-slate-800 text-xs shadow-sm focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none appearance-none" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[10px]">🕒</div>
               </div>
            </div>
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Mobile (For Tracking)</label>
          <input
            type="tel"
            required
            placeholder="9876543210"
            value={details.phone}
            onChange={(e) => setDetails({ ...details, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-[#f8fafc] border border-slate-100 font-bold text-slate-800 text-xs shadow-sm focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
          />
        </div>

        <button type="submit" className="w-full bg-[#0f172a] text-white font-black py-4 rounded-xl shadow-lg active:scale-[0.98] hover:bg-slate-800 transition-all text-xs tracking-widest uppercase mt-2">
           {details.poolType === PoolType.SOLO ? 'Find Solo Ride' : 'Search Pool'}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;