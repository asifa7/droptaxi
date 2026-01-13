
import React from 'react';
import { BookingDetails, PoolType } from '../types';

interface DriverTripCardProps {
  trip: BookingDetails;
  onAccept: (trip: BookingDetails) => void;
  onViewMap: (trip: BookingDetails) => void;
}

const DriverTripCard: React.FC<DriverTripCardProps> = ({ trip, onAccept, onViewMap }) => {
  const potentialEarnings = trip.fareAmount || 1250; // Fallback for UI
  const distance = trip.distanceKm || 120;
  const duration = "2h 15m"; // This could be calculated from distance

  return (
    <div className="bg-white rounded-[2rem] p-6 border-l-8 border-yellow-400 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all group border border-slate-100">
      {/* Priority Badge & Fare */}
      <div className="flex justify-between items-start mb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-black rounded-full uppercase tracking-widest animate-pulse">
              {(trip.pickupDistance || 0.5).toFixed(1)} KM AWAY
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[9px] font-black rounded-full uppercase tracking-widest">
              {(trip.estimatedPickupTime || 5)} MIN PICKUP
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
             {trip.tripType} • {trip.carCategory}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-slate-900 leading-none">₹{potentialEarnings.toLocaleString()}</p>
          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Net Profit</p>
        </div>
      </div>

      {/* Route Overview */}
      <div className="mb-6 space-y-1">
        <div className="flex items-start space-x-3">
          <div className="mt-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{trip.from}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">
              Landmark: {trip.landmarks?.[0] || 'Near Main Highway'}
            </p>
          </div>
        </div>
        
        <div className="border-l-2 border-dashed border-slate-200 ml-[5px] pl-6 py-4 my-1">
          <div className="bg-slate-50 p-2 rounded-xl inline-block">
             <p className="text-[10px] text-slate-500 font-bold flex items-center">
               <span className="mr-2">🛣️</span> {trip.routePreview || 'NH-44 → Highway Route'}
             </p>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2">
            🕐 {duration} • {distance} km Total
          </p>
        </div>

        <div className="flex items-start space-x-3">
          <div className="mt-1 w-2.5 h-2.5 bg-red-500 border-2 border-white shadow-sm flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{trip.to}</p>
          </div>
        </div>
      </div>

      {/* Pool Info */}
      {trip.poolType !== PoolType.SOLO && (
        <div className="flex items-center justify-between mb-5 bg-yellow-50/50 p-3 rounded-2xl border border-yellow-100">
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {[...Array(trip.poolCount || 1)].map((_, i) => (
                <div key={i} className="w-8 h-8 bg-slate-900 rounded-full border-2 border-white flex items-center justify-center text-xs shadow-sm">
                  👤
                </div>
              ))}
              {[...Array(3 - (trip.poolCount || 1))].map((_, i) => (
                <div key={i} className="w-8 h-8 bg-slate-200 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-slate-400 font-black">
                  ?
                </div>
              ))}
            </div>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {trip.poolCount || 1}/3 RIDERS MATCHED
            </span>
          </div>
          <span className="text-[9px] font-black text-yellow-600 uppercase">Pool Filling</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => onViewMap(trip)}
          className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all"
        >
          Inspect Route
        </button>
        <button 
          onClick={() => onAccept(trip)}
          className="bg-yellow-400 text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-yellow-400/20 hover:bg-yellow-500 active:scale-95 transition-all"
        >
          Claim Trip
        </button>
      </div>

      {/* Return Trip Indicator */}
      {trip.returnViability && (
        <div className="mt-4 bg-blue-50 p-3 rounded-2xl text-center border border-blue-100 animate-in slide-in-from-top-1">
          <p className="text-[9px] font-black text-blue-700 uppercase tracking-tighter">
            🔄 High probability of return trip from this location
          </p>
        </div>
      )}
    </div>
  );
};

export default DriverTripCard;
