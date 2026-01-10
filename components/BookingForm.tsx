
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
          const res = await fetch(`https://photon.komoot.io/reverse?lon=${pos.coords.longitude}&lat=${pos.coords.latitude}`);
          const data = await res.json();
          const place = data.features[0]?.properties;
          const name = place?.name || place?.street || place?.city || "Current Location";
          setDetails(prev => ({ 
            ...prev, 
            from: name, 
            fromCoords: { lat: pos.coords.latitude, lng: pos.coords.longitude } 
          }));
        } catch (e) {
          console.error("Reverse geocode failed", e);
        } finally {
          setIsLoadingGeo(false);
        }
      }, () => setIsLoadingGeo(false));
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
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=12.97&lon=77.59`, { signal: controller.signal });
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
        if (e.name !== 'AbortError') setSuggestions([]);
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
    else {
      const stopId = field.split('-')[1];
      setDetails(prev => ({
        ...prev,
        stops: prev.stops.map(st => st.id === stopId ? { ...st, name: fullName, coords } : st)
      }));
    }
    setSuggestions([]);
    setActiveField(null);
  };

  const handleInsightFetch = async () => {
    if (details.from && details.to) {
      const res = await getTripInsights(details.from, details.to);
      setInsight(res);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (details.from && details.to && (isLoggedIn || details.phone)) onComplete(details);
    else alert("Please enter pickup and drop locations.");
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden w-full border border-slate-100 relative max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-5">
      {/* Top Pool/Solo Selector */}
      <div className="bg-slate-900 p-2 flex space-x-1">
        {[
          { id: PoolType.SOLO, label: 'Solo', icon: '👤' },
          { id: PoolType.INTERCITY_POOL, label: 'Pool', icon: '👥' }
        ].map(mode => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setDetails({ ...details, poolType: mode.id === PoolType.SOLO ? PoolType.SOLO : PoolType.INTERCITY_POOL })}
            className={`flex-1 py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all ${
              (details.poolType === PoolType.SOLO && mode.id === PoolType.SOLO) || (details.poolType !== PoolType.SOLO && mode.id === PoolType.INTERCITY_POOL)
              ? 'bg-yellow-400 text-slate-900 shadow-lg scale-[1.02]' 
              : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="text-sm">{mode.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-Pool Type Selector (Only if Pool selected) */}
      {details.poolType !== PoolType.SOLO && (
        <div className="bg-slate-100 p-1.5 flex space-x-1.5 border-b border-slate-200">
          {[
            { id: PoolType.INTERCITY_POOL, label: 'Intercity', desc: 'Save 40%' },
            { id: PoolType.OFFICE_POOL, label: 'Office', desc: 'Daily' },
            { id: PoolType.URBAN_POOL, label: 'Instant', desc: 'Local' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDetails({ ...details, poolType: p.id })}
              className={`flex-1 py-2 rounded-xl text-center transition-all ${details.poolType === p.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 opacity-70'}`}
            >
              <div className="text-[8px] font-black uppercase tracking-tight leading-none">{p.label}</div>
              <div className="text-[6px] font-bold opacity-60">{p.desc}</div>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto hide-scrollbar flex-1 bg-white">
        {/* Office Commute Special Controls */}
        {details.poolType === PoolType.OFFICE_POOL && (
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3 animate-in zoom-in-95">
             <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Office Commute Logic</span>
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[7px] font-black rounded-full uppercase">Subscription Mode</span>
             </div>
             <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-600">Walk to Virtual Stop (Save 15m)</label>
                <button type="button" onClick={() => setDetails({...details, useVirtualStop: !details.useVirtualStop})} className={`w-10 h-5 rounded-full relative transition-colors ${details.useVirtualStop ? 'bg-blue-600' : 'bg-slate-300'}`}>
                   <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${details.useVirtualStop ? 'right-1' : 'left-1'}`}></div>
                </button>
             </div>
          </div>
        )}

        <div className="space-y-3 relative">
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full border-2 border-slate-900 bg-white z-10 ${isLoadingGeo ? 'animate-pulse bg-blue-400' : ''}`}></div>
                <div className="w-0.5 h-full bg-slate-100 absolute top-2.5"></div>
            </div>
            <input
              type="text"
              required
              placeholder={isLoadingGeo ? "Detecting location..." : "Pick-up point"}
              value={details.from}
              autoComplete="off"
              onFocus={() => setActiveField('from')}
              onChange={(e) => { setDetails({ ...details, from: e.target.value }); fetchSuggestions(e.target.value); }}
              className="w-full pl-11 pr-12 py-4 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-800 text-sm shadow-inner"
            />
            <button type="button" onClick={() => onEnterPinMode('from')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-2">📍</button>
          </div>

          <div className="relative">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-slate-900 z-10"></div>
             <input
              type="text"
              required
              placeholder="Drop-off point"
              value={details.to}
              autoComplete="off"
              onFocus={() => setActiveField('to')}
              onChange={(e) => { setDetails({ ...details, to: e.target.value }); fetchSuggestions(e.target.value); }}
              onBlur={() => setTimeout(handleInsightFetch, 300)}
              className="w-full pl-11 pr-12 py-4 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-800 text-sm shadow-inner"
            />
            <button type="button" onClick={() => onEnterPinMode('to')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-2">📍</button>
          </div>

          {activeField && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[5000] overflow-hidden animate-in slide-in-from-top-2">
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => handleSelectSuggestion(s, activeField)} className="w-full px-5 py-4 text-left hover:bg-slate-50 flex items-center space-x-4 border-b last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${s.isMapPin ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>{s.isMapPin ? '🗺️' : '○'}</div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{s.city}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
               <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Date</label>
               <input type="date" value={details.date} onChange={(e) => setDetails({ ...details, date: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-xs shadow-inner" />
            </div>
            <div className="space-y-1">
               <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Time</label>
               <input type="time" value={details.time} onChange={(e) => setDetails({ ...details, time: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-xs shadow-inner" />
            </div>
        </div>

        {!isLoggedIn && (
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Mobile (for tracking)</label>
            <input
              type="tel"
              required
              placeholder="9876543210"
              value={details.phone}
              onChange={(e) => setDetails({ ...details, phone: e.target.value })}
              className="w-full px-5 py-4 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner"
            />
          </div>
        )}

        {insight && (
          <div className="bg-slate-900 p-4 rounded-2xl animate-in fade-in zoom-in">
            <div className="flex justify-between text-[10px] font-black uppercase text-yellow-400 tracking-widest">
              <span>{insight.distance} • {insight.duration}</span>
              <span className="text-white">Live Insights</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">{insight.tips}</p>
          </div>
        )}

        <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-[0.98] transition-all text-sm tracking-widest uppercase mt-2">
           {details.poolType === PoolType.SOLO ? 'Book Solo Ride' : `Book ${details.poolType.replace('_', ' ')}`}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;
