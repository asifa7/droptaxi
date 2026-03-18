
import React, { useState, useEffect } from 'react';
import { BookingDetails, PoolType, LatLng } from '../types';
import { calculateDistance } from '../utils/geoUtils';

interface DriverTripCardProps {
  trip: BookingDetails;
  onAccept: (trip: BookingDetails) => void;
  onViewMap: (trip: BookingDetails) => void;
  onReject?: (trip: BookingDetails) => void;
  onStart?: (trip: BookingDetails) => void;
  onComplete?: (trip: BookingDetails) => void;
  onEnRoute?: (trip: BookingDetails) => void;
  onArrived?: (trip: BookingDetails) => void;
}

const END_RIDE_RADIUS_KM = 2; // Must be within 2km of drop location to end ride

const DriverTripCard: React.FC<DriverTripCardProps> = ({ trip, onAccept, onViewMap, onReject, onStart, onComplete, onEnRoute, onArrived }) => {
  const potentialEarnings = trip.fareAmount || 1250;
  const distance = trip.distanceKm || 120;
  const duration = `${Math.floor((distance / 50) * 60)}m`; // rough estimate at 50km/h

  const [driverCurrentLoc, setDriverCurrentLoc] = useState<LatLng | null>(null);
  const [distanceToDrop, setDistanceToDrop] = useState<number | null>(null);
  const [endRideBlocked, setEndRideBlocked] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Track driver location for geo-fence check on active trips
  useEffect(() => {
    let watchId: number | null = null;

    if ((trip.status === 'IN_PROGRESS' || trip.status === 'started') && trip.toCoords) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setDriverCurrentLoc(loc);
            setGeoError(null);

            if (trip.toCoords) {
              const dist = calculateDistance(loc, trip.toCoords);
              setDistanceToDrop(dist);
              setEndRideBlocked(dist > END_RIDE_RADIUS_KM);
            }
          },
          (err) => {
            console.warn("Geolocation error:", err.message);
            setGeoError("Location access needed to end ride.");
            // If geolocation fails, still allow end ride after 30s grace
            setTimeout(() => setEndRideBlocked(false), 30000);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
      } else {
        // No geolocation API available — allow end ride
        setEndRideBlocked(false);
      }
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [trip.status, trip.toCoords?.lat, trip.toCoords?.lng]);

  const getStatusConfig = () => {
    const s = trip.status;
    if (s === 'IN_PROGRESS' || s === 'started') {
      return { badge: 'TRIP IN PROGRESS', badgeBg: 'bg-green-500 text-white animate-pulse', stepIndex: 4 };
    }
    if (s === 'COMPLETED' || s === 'completed') {
      return { badge: 'COMPLETED', badgeBg: 'bg-slate-800 text-white', stepIndex: 5 };
    }
    if (s === 'DRIVER_ARRIVED') {
      return { badge: 'ARRIVED AT PICKUP', badgeBg: 'bg-blue-500 text-white', stepIndex: 3 };
    }
    if (s === 'DRIVER_EN_ROUTE') {
      return { badge: 'EN ROUTE TO PICKUP', badgeBg: 'bg-orange-500 text-white animate-pulse', stepIndex: 2 };
    }
    if (s === 'DRIVER_ACCEPTED') {
      return { badge: 'ACCEPTED — READY', badgeBg: 'bg-blue-100 text-blue-700', stepIndex: 1 };
    }
    // pending
    return { badge: `${(trip.pickupDistance || 0.5).toFixed(1)} KM AWAY`, badgeBg: 'bg-green-100 text-green-700 animate-pulse', stepIndex: 0 };
  };

  const statusConfig = getStatusConfig();

  const renderLifecycleProgress = () => {
    const steps = [
      { label: 'Accepted', icon: '✅' },
      { label: 'En Route', icon: '🛣️' },
      { label: 'Arrived', icon: '📍' },
      { label: 'Started', icon: '🚗' },
      { label: 'Done', icon: '🏁' }
    ];

    if (statusConfig.stepIndex === 0) return null; // Don't show for pending

    return (
      <div className="flex items-center justify-between mb-5 px-1">
        {steps.map((step, i) => {
          const isActive = i < statusConfig.stepIndex;
          const isCurrent = i === statusConfig.stepIndex - 1;
          return (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center space-y-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] border-2 transition-all duration-500 ${isActive
                  ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30'
                  : isCurrent
                    ? 'bg-yellow-400 border-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/30 animate-pulse'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}>
                  {isActive ? '✓' : step.icon}
                </div>
                <span className={`text-[7px] font-black uppercase tracking-wider ${isActive || isCurrent ? 'text-slate-700' : 'text-slate-300'}`}>{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded transition-all duration-500 ${i < statusConfig.stepIndex - 1 ? 'bg-green-400' : 'bg-slate-200'}`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 border-l-8 border-yellow-400 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all group border border-slate-100">
      {/* Header: status + fare */}
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest inline-block ${statusConfig.badgeBg}`}>
            {statusConfig.badge}
          </span>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            {trip.tripType} • {trip.carCategory}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-slate-900 leading-none">₹{potentialEarnings.toLocaleString()}</p>
          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Net Profit</p>
        </div>
      </div>

      {/* Lifecycle Progress Bar */}
      {renderLifecycleProgress()}

      {/* Route Info */}
      <div className="mb-5 space-y-1">
        <div className="flex items-start space-x-3">
          <div className="mt-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{trip.from}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">
              Landmark: {trip.landmarks?.[0] || 'Near Main Highway'}
            </p>
          </div>
        </div>

        <div className="border-l-2 border-dashed border-slate-200 ml-[5px] pl-6 py-3 my-1">
          <div className="bg-slate-50 p-2 rounded-xl inline-block">
            <p className="text-[10px] text-slate-500 font-bold flex items-center">
              <span className="mr-2" aria-hidden="true">🛣️</span> {trip.routePreview || 'NH-44 → Highway Route'}
            </p>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2">
            <span aria-hidden="true">🕐</span> ~{duration} • {distance} km Total
          </p>
        </div>

        <div className="flex items-start space-x-3">
          <div className="mt-1 w-2.5 h-2.5 bg-red-500 border-2 border-white shadow-sm flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{trip.to}</p>
          </div>
        </div>
      </div>

      {/* Rider Info (shown after accepting) */}
      {trip.status && trip.status !== 'pending' && trip.status !== 'REQUESTED' && trip.phone && (
        <div className="mb-5 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-lg text-yellow-400" aria-hidden="true">👤</div>
            <div>
              <p className="text-xs font-black text-slate-900">Rider</p>
              <p className="text-[10px] font-bold text-slate-400">{trip.phone}</p>
            </div>
          </div>
          <a
            href={`tel:${trip.phone}`}
            className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-md active:scale-90 transition-all"
            aria-label="Call rider"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
          </a>
        </div>
      )}

      {/* Pooling info removed */}

      {/* ===== ACTION BUTTONS based on Status ===== */}
      <div className="space-y-3">
        {/* PENDING: Accept / Reject */}
        {(!trip.status || trip.status === 'pending' || trip.status === 'REQUESTED') && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onAccept(trip)}
              className="bg-yellow-400 text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-yellow-400/20 hover:bg-yellow-500 active:scale-95 transition-all"
            >
              Accept Request
            </button>
            <button
              onClick={() => { if (onReject) onReject(trip); }}
              className="bg-red-50 text-red-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 border border-red-100 active:scale-95 transition-all"
            >
              Reject
            </button>
          </div>
        )}

        {/* ACCEPTED: En Route + View Map */}
        {trip.status === 'DRIVER_ACCEPTED' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { if (onEnRoute) onEnRoute(trip); }}
              className="bg-orange-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-95 transition-all"
            >
              🛣️ Start Heading
            </button>
            <button
              onClick={() => onViewMap(trip)}
              className="bg-slate-100 text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <svg fill="currentColor" viewBox="0 0 20 20" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
              <span>View Map</span>
            </button>
          </div>
        )}

        {/* EN ROUTE: Arrived at Pickup */}
        {trip.status === 'DRIVER_EN_ROUTE' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { if (onArrived) onArrived(trip); }}
              className="bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <svg fill="currentColor" viewBox="0 0 20 20" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
              <span>Arrived at Pickup</span>
            </button>
            <button
              onClick={() => onViewMap(trip)}
              className="bg-slate-100 text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <svg fill="currentColor" viewBox="0 0 20 20" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
              <span>View Map</span>
            </button>
          </div>
        )}

        {/* ARRIVED: Start Trip */}
        {trip.status === 'DRIVER_ARRIVED' && (
          <button
            onClick={() => { if (onStart) onStart(trip); }}
            className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20 hover:bg-green-600 active:scale-95 transition-all"
          >
            🚗 Start Trip — Passenger Onboard
          </button>
        )}

        {/* IN PROGRESS: End Ride (geo-fenced) */}
        {(trip.status === 'IN_PROGRESS' || trip.status === 'started') && (
          <div className="space-y-2">
            {/* Distance to drop indicator */}
            {distanceToDrop !== null && (
              <div className={`text-center text-[10px] font-black uppercase tracking-widest py-2 rounded-xl ${endRideBlocked
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-green-50 text-green-600 border border-green-200'
                }`}>
                {endRideBlocked
                  ? `📍 ${distanceToDrop.toFixed(1)} km from drop — Get closer to end ride`
                  : `✅ Within drop zone — You can end the ride`
                }
              </div>
            )}
            {geoError && (
              <p className="text-[10px] text-amber-500 font-bold text-center">{geoError}</p>
            )}

            {showEndConfirm ? (
              <div className="bg-red-50 p-4 rounded-2xl border border-red-200 space-y-3 animate-in zoom-in-95">
                <p className="text-sm font-black text-red-700 text-center">Confirm — End this ride?</p>
                <p className="text-[10px] text-red-500 text-center font-medium">Fare: ₹{potentialEarnings.toLocaleString()} will be finalized</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="py-3 rounded-xl font-black text-[10px] uppercase bg-white text-slate-600 border border-slate-200 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { if (onComplete) onComplete(trip); setShowEndConfirm(false); }}
                    className="py-3 rounded-xl font-black text-[10px] uppercase bg-red-500 text-white shadow-lg active:scale-95 transition-all"
                  >
                    🏁 End Ride
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {localError && (
                  <p className="text-[9px] font-black text-[#FF4D4F] uppercase text-center animate-bounce">{localError}</p>
                )}
                <button
                  onClick={() => {
                    if (endRideBlocked) {
                      setLocalError(`Not at destination! Still ${distanceToDrop?.toFixed(1) || '?'} km away.`);
                      setTimeout(() => setLocalError(null), 3000);
                      return;
                    }
                    setShowEndConfirm(true);
                  }}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all ${endRideBlocked
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-red-500 text-white shadow-red-500/20 hover:bg-red-600'
                    }`}
                >
                  🏁 End Ride{endRideBlocked ? ' (Reach Drop Location)' : ' (Complete)'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* COMPLETED */}
        {(trip.status === 'COMPLETED' || trip.status === 'completed') && (
          <div className="bg-slate-900 p-4 rounded-2xl text-center space-y-2">
            <p className="text-white font-black text-sm uppercase">✅ Ride Completed</p>
            <p className="text-yellow-400 font-black text-xl">₹{potentialEarnings.toLocaleString()}</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Earnings credited to wallet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverTripCard;
