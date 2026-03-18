import React, { useState, useEffect } from 'react';
import { TripType, PoolType, BookingDetails, CarCategory, LatLng } from '../types';
import { getTripInsights } from '../geminiService';
import LocationAutocomplete from './LocationAutocomplete';
import PopularDestinations, { RouteData, CityData } from './PopularDestinations';

interface BookingFormProps {
  isLoggedIn?: boolean;
  onComplete: (details: BookingDetails) => void;
  onEnterPinMode: (field: 'from' | 'to') => void;
  externalPickup?: { name: string, coords: LatLng };
  externalDrop?: { name: string, coords: LatLng };
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

  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [errors, setErrors] = useState<{ from?: string, to?: string, phone?: string }>({});

  useEffect(() => {
    detectCurrentLocation();
  }, []);

  const fetchLocationName = async (lat: number, lon: number) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Network response was not ok');

      const data = await res.json();
      const place = data.features[0]?.properties;
      return place?.name || place?.street || place?.city || "Current Location";
    } catch (e: any) {
      console.warn("Location name lookup skipped:", e.message);
      return "Current Location";
    }
  };

  const detectCurrentLocation = (manual = false) => {
    if (!navigator.geolocation) return;

    if (manual) setIsLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;

      // Update coords immediately
      setDetails(prev => ({ ...prev, fromCoords: { lat, lng: lon } }));
      if (!manual) setIsLoadingGeo(false);

      // Then try name lookup in background
      const name = await fetchLocationName(lat, lon);
      setDetails(prev => {
        const isDefault = !prev.from || prev.from === 'Current Location' || prev.from === 'Detecting location...';
        if (isDefault) return { ...prev, from: name };
        return prev;
      });

      if (manual) setIsLoadingGeo(false);
    }, (err) => {
      console.warn("Geolocation denied or timed out:", err.message);
      setIsLoadingGeo(false);
    }, { enableHighAccuracy: true, timeout: 5000 });
  };

  useEffect(() => {
    if (externalPickup) setDetails(prev => ({ ...prev, from: externalPickup.name, fromCoords: externalPickup.coords }));
  }, [externalPickup]);

  useEffect(() => {
    if (externalDrop) setDetails(prev => ({ ...prev, to: externalDrop.name, toCoords: externalDrop.coords }));
  }, [externalDrop]);

  const handleInsightFetch = async () => {
    if (details.from && details.to) {
      try {
        await getTripInsights(details.from, details.to);
      } catch (e) {
        console.warn("AI insights failed:", e);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { from?: string; to?: string; phone?: string } = {};

    if (!details.from && !details.fromCoords) newErrors.from = "Please enter pickup location";
    if (!details.to && !details.toCoords) newErrors.to = "Please enter drop location";
    if (!isLoggedIn) {
      if (!details.phone) {
        newErrors.phone = "Phone number is required";
      } else {
        const cleanPhone = details.phone.replace(/\D/g, '');
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
          newErrors.phone = "Must be a valid 10-digit Indian number";
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onComplete(details);
  };

  const handleRouteClick = (route: RouteData) => {
    const updatedDetails = {
      ...details,
      from: route.from,
      to: route.to,
      fromCoords: route.fromCoords,
      toCoords: route.toCoords
    };
    setDetails(updatedDetails);

    setErrors(prev => ({ ...prev, from: undefined, to: undefined }));

    if (isLoggedIn) {
      onComplete(updatedDetails);
    } else if (details.phone) {
      const cleanPhone = details.phone.replace(/\D/g, '');
      if (/^[6-9]\d{9}$/.test(cleanPhone)) {
        onComplete(updatedDetails);
      } else {
        setErrors(prev => ({ ...prev, phone: "Must be a valid 10-digit Indian number" }));
        setTimeout(() => {
          document.getElementById('booking-phone')?.focus();
          const formContainer = document.querySelector('.booking-card form');
          if (formContainer) formContainer.scrollTo({ top: formContainer.scrollHeight, behavior: 'smooth' });
        }, 50);
      }
    } else {
      setErrors(prev => ({ ...prev, phone: "Phone number is required to proceed" }));
      setTimeout(() => {
        document.getElementById('booking-phone')?.focus();
        const formContainer = document.querySelector('.booking-card form');
        if (formContainer) formContainer.scrollTo({ top: formContainer.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  };

  const handleCityClick = (city: CityData) => {
    setDetails({
      ...details,
      to: city.name,
      toCoords: city.coords
    });
    if (errors.to) setErrors(prev => ({ ...prev, to: undefined }));
  };

  return (
    <div className="booking-card bg-white rounded-[2rem] shadow-2xl overflow-hidden w-full max-h-[55vh] sm:max-h-[60vh] border border-slate-100 relative flex flex-col animate-in slide-in-from-bottom-5">
      {/* Top Trip Type Selector - One Way vs Round Trip */}
      <div className="bg-[#0f172a] p-2 flex gap-2">
        {[
          { id: TripType.ONE_WAY, label: 'One Way', aria: 'One Way Trip' },
          { id: TripType.ROUND_TRIP, label: 'Round Trip', aria: 'Round Trip' }
        ].map(type => (
          <button
            key={type.id}
            type="button"
            onClick={() => setDetails({ ...details, tripType: type.id })}
            aria-label={type.aria}
            className={`flex-1 py-2.5 rounded-[1.2rem] flex items-center justify-center space-x-2 transition-all duration-300 ${details.tripType === type.id
              ? 'bg-yellow-400 text-slate-900 shadow-md'
              : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto hide-scrollbar flex-1 bg-white">
        <div className="space-y-3">
          {/* Pickup */}
          <div className="space-y-1">
            <LocationAutocomplete
              value={details.from}
              placeholder={isLoadingGeo ? "Detecting location..." : "Pick-up point"}
              onChange={(val) => {
                setDetails(prev => ({ ...prev, from: val }));
                if (errors.from) setErrors(prev => ({ ...prev, from: undefined }));
              }}
              onSelect={(res) => {
                setDetails(prev => ({ ...prev, from: res.address, fromCoords: { lat: res.lat, lng: res.lng } }));
                if (errors.from) setErrors(prev => ({ ...prev, from: undefined }));
              }}
              error={!!errors.from}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#f8fafc] focus:bg-white focus:ring-1 focus:ring-slate-900 transition-all outline-none font-bold text-slate-800 text-xs shadow-sm border border-slate-100 placeholder:font-normal"
              leftIcon={
                <button
                  type="button"
                  onClick={() => detectCurrentLocation(true)}
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center transition-all ${isLoadingGeo ? 'animate-pulse text-blue-500' : 'text-slate-900'}`}
                  title="Refresh Current Location"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" /></svg>
                </button>
              }
              rightIcon={
                <button type="button" onClick={() => onEnterPinMode('from')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 w-4 h-4 hover:scale-110 z-10 transition-transform" aria-label="Set from pin">
                  <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
                </button>
              }
            />
            {errors.from && <p className="text-[9px] font-bold text-[#FF4D4F] ml-2 animate-in fade-in slide-in-from-top-1">{errors.from}</p>}
          </div>

          {/* Drop-off */}
          <div className="space-y-1">
            <LocationAutocomplete
              value={details.to}
              placeholder="Drop-off point"
              onChange={(val) => {
                setDetails(prev => ({ ...prev, to: val }));
                if (errors.to) setErrors(prev => ({ ...prev, to: undefined }));
              }}
              onSelect={(res) => {
                setDetails(prev => ({ ...prev, to: res.address, toCoords: { lat: res.lat, lng: res.lng } }));
                if (errors.to) setErrors(prev => ({ ...prev, to: undefined }));
                setTimeout(handleInsightFetch, 500);
              }}
              error={!!errors.to}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#f8fafc] focus:bg-white focus:ring-1 focus:ring-slate-900 transition-all outline-none font-bold text-slate-800 text-xs shadow-sm border border-slate-100 placeholder:font-normal"
              leftIcon={<div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 z-10"></div>}
              rightIcon={
                <button type="button" onClick={() => onEnterPinMode('to')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 w-4 h-4 hover:scale-110 z-10 transition-transform" aria-label="Set to pin">
                  <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
                </button>
              }
            />
            {errors.to && <p className="text-[9px] font-bold text-[#FF4D4F] ml-2 animate-in fade-in slide-in-from-top-1">{errors.to}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <label htmlFor="booking-date" className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Date</label>
            <div className="relative">
              <input id="booking-date" type="date" value={details.date} onChange={(e) => setDetails({ ...details, date: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 font-bold text-slate-800 text-xs shadow-sm focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none appearance-none" />
            </div>
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <label htmlFor="booking-time" className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Time</label>
            <div className="relative">
              <input id="booking-time" type="time" value={details.time} onChange={(e) => setDetails({ ...details, time: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 font-bold text-slate-800 text-xs shadow-sm focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none appearance-none" />
            </div>
          </div>
        </div>

        {!isLoggedIn && (
          <div className="space-y-1">
            <label htmlFor="booking-phone" className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Mobile (For Tracking)</label>
            <input
              id="booking-phone"
              type="tel"
              placeholder="9876543210"
              value={details.phone}
              onChange={(e) => {
                setDetails({ ...details, phone: e.target.value });
                if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
              }}
              className={`w-full px-4 py-3 rounded-xl bg-[#f8fafc] border font-bold text-slate-800 text-xs shadow-sm focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all ${errors.phone ? 'border-[#FF4D4F] ring-[#FF4D4F] shadow-[0_0_10px_rgba(255,77,79,0.1)]' : 'border-slate-100'}`}
            />
            {errors.phone && <p className="text-[9px] font-bold text-[#FF4D4F] ml-2 animate-in fade-in slide-in-from-top-1">{errors.phone}</p>}
          </div>
        )}

        <button type="submit" className="w-full bg-[#0f172a] text-white font-black py-4 rounded-xl shadow-lg active:scale-[0.98] hover:bg-slate-800 transition-all text-xs tracking-widest uppercase mt-2">
          {details.tripType === TripType.ROUND_TRIP ? 'Find Round Trip' : 'Find Single Ride'}
        </button>

        <PopularDestinations
          onSelectRoute={handleRouteClick}
          onSelectCity={handleCityClick}
        />
      </form>
    </div>
  );
};

export default BookingForm;
