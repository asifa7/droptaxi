
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, CarCategory, BookingDetails, TripType, PoolType } from '../types';
import { CAR_OPTIONS, CarOption, PHONE_NUMBER } from '../constants';
import { getTripInsights } from '../geminiService';

interface RidePanelProps {
  appState: AppState;
  onConfirm: (category: CarCategory) => void;
  onCancel: () => void;
  bookingDetails?: BookingDetails;
}

const RidePanel: React.FC<RidePanelProps> = ({ appState, onConfirm, onCancel, bookingDetails }) => {
  const [selected, setSelected] = useState<CarCategory>(CarCategory.SEDAN);
  const [showModal, setShowModal] = useState(false);
  const [modalCar, setModalCar] = useState<CarOption | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(250);

  useEffect(() => {
    const fetchDist = async () => {
      if (bookingDetails?.from && bookingDetails?.to) {
        // Passing current coords if available for better grounding
        const insights = await getTripInsights(bookingDetails.from, bookingDetails.to, bookingDetails.fromCoords);
        if (insights?.distance) {
          // Robust parsing of distance string like "350.5 km"
          const numeric = parseFloat(insights.distance.replace(/[^\d.]/g, ''));
          if (!isNaN(numeric)) setDistanceKm(numeric);
        }
      }
    };
    if (appState === AppState.SELECTING_VEHICLE) fetchDist();
  }, [bookingDetails, appState]);

  const calculateTotal = (car: CarOption) => {
    const isRound = bookingDetails?.tripType === TripType.ROUND_TRIP;
    const rate = isRound ? car.roundTripPrice : car.oneWayPrice;
    const minKm = isRound ? car.roundTripMinKm : car.oneWayMinKm;
    const effectiveKm = Math.max(distanceKm, minKm);
    const soloTotal = (effectiveKm * rate) + car.driverAllowance;
    
    // Apply Pool Logic: 40% Discount for riders
    if (bookingDetails?.poolType !== PoolType.SOLO) {
        return Math.round(soloTotal * 0.6);
    }
    return soloTotal;
  };

  const totals = useMemo(() => {
    const car = CAR_OPTIONS.find(c => c.id === selected) || CAR_OPTIONS[0];
    const riderTotal = calculateTotal(car);
    const soloBase = (Math.max(distanceKm, car.oneWayMinKm) * car.oneWayPrice) + car.driverAllowance;

    return {
      rider: riderTotal,
      driverEarnings: Math.round(soloBase * 1.4), // 1.4x Driver Rule if full pool
      uber: Math.round(soloBase * 1.35),
      local: Math.round(soloBase * 1.22),
      breakdown: {
        km: Math.max(distanceKm, (bookingDetails?.tripType === TripType.ROUND_TRIP ? car.roundTripMinKm : car.oneWayMinKm)),
        rate: bookingDetails?.tripType === TripType.ROUND_TRIP ? car.roundTripPrice : car.oneWayPrice,
        allowance: car.driverAllowance
      }
    };
  }, [selected, distanceKm, bookingDetails?.tripType, bookingDetails?.poolType]);

  const handleSelectCar = (car: CarOption) => {
    setSelected(car.id as unknown as CarCategory);
    setModalCar(car);
    setShowModal(true);
  };

  return (
    <>
      {showModal && modalCar && (
        <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            <div className="relative h-48 bg-slate-100">
              <img src={modalCar.image} className="w-full h-full object-cover" alt={modalCar.name} />
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-md">✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase">{modalCar.name}</h3>
                  <p className="text-sm font-bold text-slate-500">{bookingDetails?.poolType === PoolType.SOLO ? 'Solo Travel' : 'Shared Pool Travel'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900">₹{totals.rider.toLocaleString()}</p>
                  <p className="text-[10px] font-black uppercase text-slate-400">Fixed Fare</p>
                </div>
              </div>

              {/* Competitive Projections */}
              <div className="bg-slate-50 rounded-3xl p-5 space-y-4 border border-slate-100 shadow-inner">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Market Comparison</h4>
                  <span className="text-[9px] font-black text-green-500 uppercase">Saving ₹{(totals.uber - totals.rider).toLocaleString()}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white rounded-2xl border-2 border-yellow-400 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-yellow-400 text-xs">🛞</div>
                      <span className="font-black text-sm text-slate-900">Agent {bookingDetails?.poolType !== PoolType.SOLO ? 'Pool' : 'Taxi'}</span>
                    </div>
                    <span className="font-black text-slate-900">₹{totals.rider.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-100/50 rounded-2xl opacity-60">
                    <div className="flex items-center space-x-3"><span className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white text-[10px] font-black">U</span><span className="font-bold text-sm">Uber Intercity</span></div>
                    <span className="font-bold line-through">₹{totals.uber.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Pool Rule Info */}
              {bookingDetails?.poolType !== PoolType.SOLO && (
                <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 flex items-start space-x-3">
                    <span className="text-lg">📢</span>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-900">1.4x Driver Protection</p>
                        <p className="text-[10px] text-slate-500 font-bold leading-tight">Drivers earn ₹{totals.driverEarnings.toLocaleString()} (40% more) in pool, ensuring premium service and zero cancellations.</p>
                    </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight px-2">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Dist: {distanceKm.toFixed(1)} km</span>
                  <span>₹{totals.breakdown.rate}/km</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Allowance</span>
                  <span>₹{totals.breakdown.allowance}</span>
                </div>
              </div>

              <button onClick={() => { onConfirm(selected); setShowModal(false); }} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest flex items-center justify-center space-x-3 transition-transform active:scale-95">
                <span>Confirm {bookingDetails?.poolType !== PoolType.SOLO ? 'Pool' : 'Solo'} Ride</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-0 left-0 right-0 z-20 glass rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 bottom-sheet transform ${appState === AppState.IDLE || appState === AppState.DRIVER_LISTING ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
        
        {appState === AppState.SELECTING_VEHICLE && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Select Vehicle</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{distanceKm.toFixed(1)} KM • {bookingDetails?.poolType.replace('_', ' ')}</p>
              </div>
              <button onClick={onCancel} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 mb-1">Cancel</button>
            </div>
            
            <div className="flex space-x-4 overflow-x-auto hide-scrollbar pb-4 px-1">
              {CAR_OPTIONS.map((car) => {
                const isSelected = selected === car.id;
                const riderPrice = calculateTotal(car);
                const soloOriginal = (Math.max(distanceKm, car.oneWayMinKm) * car.oneWayPrice) + car.driverAllowance;

                return (
                  <button
                    key={car.id}
                    onClick={() => handleSelectCar(car)}
                    className={`flex-shrink-0 w-44 p-4 rounded-[2.2rem] border-4 transition-all relative overflow-hidden group ${isSelected ? 'border-yellow-400 bg-yellow-50 shadow-xl scale-105' : 'border-slate-50 bg-white opacity-90'}`}
                  >
                    <img src={car.image} className="w-full h-16 object-contain mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1 truncate">{car.name}</p>
                    <div className="flex flex-col items-start">
                        <p className="text-lg font-black text-slate-900 leading-none">₹{riderPrice.toLocaleString()}</p>
                        <div className="flex items-center space-x-1.5 mt-1">
                            <span className="text-[9px] font-bold text-slate-300 line-through">₹{soloOriginal.toLocaleString()}</span>
                            <span className="text-[9px] font-black text-green-500">{bookingDetails?.poolType !== PoolType.SOLO ? '40% OFF' : 'Best Rate'}</span>
                        </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <button onClick={() => handleSelectCar(CAR_OPTIONS.find(c => c.id === selected)!)} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest transition-all active:bg-slate-800">
                <span>Show Price Breakdown</span>
            </button>
          </div>
        )}

        {appState === AppState.SEARCHING_DRIVER && (
          <div className="py-10 text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-8 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-4 bg-slate-900 rounded-full flex items-center justify-center text-yellow-400">🛞</div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase">
                {bookingDetails?.poolType !== PoolType.SOLO ? 'Matching Pool...' : 'Finding Driver...'}
            </h2>
            <p className="text-slate-500 text-sm">
                {bookingDetails?.poolType !== PoolType.SOLO ? 'Applying Linear Overlap Logic to find partners.' : 'Securing your fixed outstation rate.'}
            </p>
            <button onClick={onCancel} className="w-full bg-red-50 text-red-600 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest border border-red-100">Cancel Request</button>
          </div>
        )}

        {appState === AppState.TRIP_ACTIVE && (
          <div className="space-y-6 pb-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-yellow-400 text-2xl shadow-lg">👨‍✈️</div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 uppercase">Driver Assigned</h4>
                    <p className="text-xs font-bold text-slate-400">Locked Price: ₹{totals.rider.toLocaleString()}</p>
                  </div>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <a href={`tel:${PHONE_NUMBER}`} className="bg-slate-100 py-4 rounded-2xl font-black text-xs uppercase text-slate-900 flex items-center justify-center">Contact Driver</a>
               <button className="bg-yellow-400 py-4 rounded-2xl font-black text-xs uppercase text-slate-900">Share Status</button>
             </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RidePanel;
