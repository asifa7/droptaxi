
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, CarCategory, BookingDetails, TripType, PoolType, PoolStatus } from '../types';
import { CAR_OPTIONS, CarOption, PHONE_NUMBER } from '../constants';
import { getTripInsights } from '../geminiService';
import { PricingEngine } from '../services/pricingService';
import { calculateDistance } from '../utils/geoUtils';

interface RidePanelProps {
  appState: AppState;
  onConfirm: (category: CarCategory, metrics?: { distance: number, fare: number, min: number, max: number }) => void;
  onCancel: () => void;
  bookingDetails?: BookingDetails;
  onPay?: () => void;
  onCancelRide?: () => void;
}

const RidePanel: React.FC<RidePanelProps> = ({ appState, onConfirm, onCancel, bookingDetails, onPay, onCancelRide }) => {
  const [selected, setSelected] = useState<CarCategory>(CarCategory.SEDAN);
  const [showModal, setShowModal] = useState(false);
  const [modalCar, setModalCar] = useState<CarOption | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Pooling UI State
  const [poolStatus, setPoolStatus] = useState<PoolStatus>(PoolStatus.IDLE);
  const [poolTimer, setPoolTimer] = useState(90);
  const [passengerCount, setPassengerCount] = useState(1);

  const isPool = bookingDetails?.poolType !== PoolType.SOLO;

  useEffect(() => {
    const fetchDist = async () => {
      if (bookingDetails?.fromCoords && bookingDetails?.toCoords) {
        const geoDist = calculateDistance(bookingDetails.fromCoords, bookingDetails.toCoords);
        if (geoDist > 0) setDistanceKm(Math.ceil(geoDist * 1.2));

        try {
          const insights = await getTripInsights(bookingDetails.from, bookingDetails.to, bookingDetails.fromCoords);
          if (insights?.distance) {
            const numeric = Number.parseFloat(insights.distance.replaceAll(/[^\d.]/g, ''));
            if (!Number.isNaN(numeric)) setDistanceKm(numeric);
          }
        } catch (err) {
          console.log("Using geo distance fallback", err);
        }
      }
    };
    if (appState === AppState.SELECTING_VEHICLE) fetchDist();
  }, [bookingDetails, appState]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (appState === AppState.SEARCHING_DRIVER && isPool) {
      setPoolStatus(PoolStatus.WAITING);
      interval = setInterval(() => {
        setPoolTimer((prev) => {
          if (prev <= 0) {
            setPoolStatus(PoolStatus.LOCKED);
            clearInterval(interval);
            return 0;
          }
          if (prev === 75) {
            setPassengerCount(2);
            setPoolStatus(PoolStatus.FILLING);
          }
          if (prev === 40 && Math.random() > 0.5) {
            setPassengerCount(3);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setPoolTimer(90);
      setPassengerCount(1);
      setPoolStatus(PoolStatus.IDLE);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [appState, isPool]);

  const calculateTotal = (car: CarOption) => {
    if (!bookingDetails) return 0;

    const durationMins = Math.ceil(distanceKm * 1.5);
    const tripDate = new Date(`${bookingDetails.date}T${bookingDetails.time}`);

    const fareResult = PricingEngine.calculateFare(
      car.id as CarCategory,
      distanceKm,
      durationMins,
      tripDate
    );

    let finalFare = fareResult.totalFare;

    if (isPool) {
      finalFare = Math.round(finalFare * 0.6);
    }
    return finalFare;
  };

  const totals = useMemo(() => {
    const car = CAR_OPTIONS.find(c => c.id === selected) || CAR_OPTIONS[0];
    const riderTotal = calculateTotal(car);
    const driverEarnings = Math.round(riderTotal * 0.8);

    return {
      rider: riderTotal,
      driverEarnings: driverEarnings,
      uber: Math.round(riderTotal * 1.35),
      local: Math.round(riderTotal * 1.22),
      breakdown: {
        km: distanceKm,
        rate: bookingDetails?.tripType === TripType.ROUND_TRIP ? car.roundTripPrice : car.oneWayPrice,
        allowance: car.driverAllowance
      }
    };
  }, [selected, distanceKm, bookingDetails?.tripType, isPool, bookingDetails?.date, bookingDetails?.time]);

  const handleSelectCar = (car: CarOption) => {
    setSelected(car.id as unknown as CarCategory);
    setModalCar(car);
    setShowModal(true);
  };

  const poolTitle = isPool ? 'Shared Pool Travel' : 'Solo Travel';
  const confirmText = `Confirm ${isPool ? 'Pool' : 'Solo'} Ride`;
  const bookingModeLabel = bookingDetails?.poolType.replaceAll('_', ' ');

  const getPoolingStatusText = () => {
    switch (poolStatus) {
      case PoolStatus.WAITING: return 'Scanning for Riders...';
      case PoolStatus.FILLING: return 'Co-passenger Found!';
      default: return 'Dispatching Pool...';
    }
  };

  // Determine the rider's trip phase
  const getTripPhaseInfo = () => {
    const status = bookingDetails?.status;
    if (status === 'IN_PROGRESS' || status === 'started') {
      return { label: 'Trip In Progress', sublabel: 'Enjoy your ride', icon: '🚗', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    }
    if (status === 'DRIVER_ARRIVED') {
      return { label: 'Driver Has Arrived', sublabel: 'Your driver is waiting at pickup', icon: '📍', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    }
    if (status === 'DRIVER_EN_ROUTE') {
      return { label: 'Driver On The Way', sublabel: `Arriving in ~${bookingDetails?.driverEta || '?'} min`, icon: '🛣️', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
    }
    // DRIVER_ACCEPTED
    return { label: 'Driver Assigned', sublabel: 'Driver will start heading to you shortly', icon: '✅', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
  };

  const canCancelRide = () => {
    const status = bookingDetails?.status;
    return status !== 'IN_PROGRESS' && status !== 'started' && status !== 'COMPLETED' && status !== 'completed';
  };

  const fareDisplay = bookingDetails?.fareAmount || totals.rider;
  const carInfo = CAR_OPTIONS.find(c => c.id === (bookingDetails?.carCategory || selected));

  // Is the panel visible?
  const isPanelVisible = appState !== AppState.IDLE &&
    appState !== AppState.DRIVER_LISTING &&
    appState !== AppState.PAYMENT &&
    appState !== AppState.WALLET &&
    appState !== AppState.RATING;

  return (
    <>
      {showModal && modalCar && (
        <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in w-full h-full cursor-default"
            onClick={() => setShowModal(false)}
            aria-label="Close vehicle details"
          />
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            <div className="relative h-48 bg-slate-100">
              <img src={modalCar.image} className="w-full h-full object-cover" alt={modalCar.name} />
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-md" aria-label="Close">✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase">{modalCar.name}</h3>
                  <p className="text-sm font-bold text-slate-500">{poolTitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900">₹{totals.rider.toLocaleString()}</p>
                  <p className="text-[10px] font-black uppercase text-slate-400">Fixed Fare</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-3xl p-5 space-y-4 border border-slate-100 shadow-inner">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Market Comparison</h4>
                  <span className="text-[9px] font-black text-green-500 uppercase">Saving ₹{(totals.uber - totals.rider).toLocaleString()}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white rounded-2xl border-2 border-yellow-400 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-yellow-400 text-xs" aria-hidden="true">🛞</div>
                      <span className="font-black text-sm text-slate-900">Agent {isPool ? 'Pool' : 'Taxi'}</span>
                    </div>
                    <span className="font-black text-slate-900">₹{totals.rider.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button onClick={() => {
                onConfirm(selected, {
                  distance: distanceKm,
                  fare: totals.rider,
                  min: totals.rider,
                  max: totals.uber
                });
                setShowModal(false);
              }} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest flex items-center justify-center space-x-3 transition-transform active:scale-95">
                <span>{confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in w-full h-full cursor-default"
            onClick={() => setShowCancelConfirm(false)}
            aria-label="Close cancel dialog"
          />
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-3xl">⚠️</div>
              <h3 className="text-xl font-black text-slate-900 uppercase">Cancel Ride?</h3>
              <p className="text-sm text-slate-500 font-medium">
                {bookingDetails?.status === 'DRIVER_ACCEPTED' || bookingDetails?.status === 'DRIVER_EN_ROUTE' || bookingDetails?.status === 'DRIVER_ARRIVED'
                  ? 'A driver has already been assigned. Cancellation charges of ₹50 may apply.'
                  : 'Are you sure you want to cancel this ride request?'
                }
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-100 text-slate-600 active:scale-95 transition-all"
              >
                Keep Ride
              </button>
              <button
                onClick={() => {
                  setShowCancelConfirm(false);
                  if (onCancelRide) onCancelRide();
                }}
                className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-red-500 text-white shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-0 left-0 right-0 z-20 glass shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 bottom-sheet transform transition-all duration-500 flex flex-col ${!isPanelVisible ? 'translate-y-full' : 'translate-y-0'} ${(appState === AppState.DRIVER_EN_ROUTE || appState === AppState.DRIVER_ARRIVED || appState === AppState.TRIP_ACTIVE || appState === AppState.SEARCHING_DRIVER)
          ? 'top-20 md:top-24 rounded-t-[3rem] bg-slate-100/95 backdrop-blur-3xl overflow-y-auto'
          : 'rounded-t-[2.5rem]'
        }`}>
        {appState === AppState.SELECTING_VEHICLE && (
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 flex-shrink-0"></div>
        )}

        {appState === AppState.SELECTING_VEHICLE && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Select Vehicle</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{distanceKm.toFixed(1)} KM • {bookingModeLabel}</p>
              </div>
              <button onClick={onCancel} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 mb-1">Cancel</button>
            </div>

            <div className="flex space-x-4 overflow-x-auto hide-scrollbar pb-4 px-1">
              {CAR_OPTIONS.map((car) => {
                const isSelected = selected === car.id;
                const riderPrice = calculateTotal(car);
                const soloOriginal = (Math.max(distanceKm, car.oneWayMinKm) * car.oneWayPrice) + car.driverAllowance;
                const isSolo = bookingDetails?.poolType === PoolType.SOLO;
                const discountText = isSolo ? 'Best Rate' : '40% OFF';

                return (
                  <button
                    key={car.id}
                    onClick={() => handleSelectCar(car)}
                    className={`flex-shrink-0 w-44 p-4 rounded-[2.2rem] border-4 transition-all relative overflow-hidden group ${isSelected ? 'border-yellow-400 bg-yellow-50 shadow-xl scale-105' : 'border-slate-50 bg-white opacity-90'}`}
                    aria-label={`Select ${car.name}, price ${riderPrice}`}
                  >
                    <img src={car.image} className="w-full h-16 object-contain mb-3 group-hover:scale-110 transition-transform" alt={car.name} />
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1 truncate">{car.name}</p>
                    <div className="flex flex-col items-start">
                      <p className="text-lg font-black text-slate-900 leading-none">₹{riderPrice.toLocaleString()}</p>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span className="text-[9px] font-bold text-slate-300 line-through">₹{soloOriginal.toLocaleString()}</span>
                        <span className="text-[9px] font-black text-green-500">{discountText}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button onClick={() => {
              const car = CAR_OPTIONS.find(c => c.id === selected);
              if (car) handleSelectCar(car);
            }} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest transition-all active:bg-slate-800">
              <span>Show Price Breakdown</span>
            </button>
          </div>
        )}

        {appState === AppState.SEARCHING_DRIVER && (
          <div className="py-10 text-center space-y-8 animate-in fade-in">
            {isPool ? (
              <div className="animate-in fade-in duration-500">
                <div className="relative w-32 h-32 mx-auto mb-8" role="timer" aria-label={`${poolTimer} seconds left`}>
                  <div className="absolute inset-0 border-[6px] border-slate-100 rounded-full"></div>
                  <div
                    className="absolute inset-0 border-[6px] border-yellow-400 rounded-full transition-all duration-1000"
                    style={{ clipPath: `inset(0 0 0 ${100 - (poolTimer / 90 * 100)}%)` }}
                  ></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900 leading-none">{poolTimer}</span>
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">sec left</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-center -space-x-3 mb-4">
                    {[1, 2, 3].slice(0, passengerCount).map(idx => (
                      <div key={`rider-slot-${idx}`} className="w-12 h-12 rounded-full border-4 border-white bg-slate-900 flex items-center justify-center text-lg animate-in zoom-in" aria-hidden="true">👤</div>
                    ))}
                    {[1, 2, 3].slice(0, Math.max(0, 3 - passengerCount)).map(idx => (
                      <div key={`empty-slot-${idx}`} className="w-12 h-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-lg text-slate-300 border-dashed" aria-hidden="true">?</div>
                    ))}
                  </div>

                  <h2 className="text-2xl font-black text-slate-900 uppercase">
                    {getPoolingStatusText()}
                  </h2>
                  <p className="text-slate-500 text-sm font-medium">
                    {passengerCount} of 3 passengers matched. <br />
                    Linear Overlap logic active for route efficiency.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8 py-4">
                <div className="relative w-32 h-32 mx-auto">
                  <div className="absolute inset-0 bg-yellow-100/40 rounded-full animate-pulse"></div>
                  <div className="absolute inset-4 bg-yellow-100/60 rounded-full animate-pulse delay-150"></div>
                  <div className="absolute inset-8 bg-white border border-yellow-200 shadow-xl rounded-full flex items-center justify-center text-3xl font-black text-slate-900">
                    ⏱️
                  </div>
                </div>
                <div className="space-y-3 px-4">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Connecting to Driver</h2>
                  <p className="text-slate-500 text-sm font-bold leading-relaxed">
                    Finding the best agent for your outstation route. This usually takes a few minutes. Please wait.
                  </p>
                </div>
              </div>
            )}
            <button onClick={() => setShowCancelConfirm(true)} className="w-full bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-colors">
              Cancel Request
            </button>
          </div>
        )}

        {/* ========= DRIVER EN ROUTE / ARRIVED / TRIP ACTIVE ========= */}
        {(appState === AppState.DRIVER_EN_ROUTE || appState === AppState.DRIVER_ARRIVED || appState === AppState.TRIP_ACTIVE) && (
          <div className="space-y-5 pb-4 animate-in fade-in duration-500">
            {/* Trip Phase Indicator */}
            {(() => {
              const phase = getTripPhaseInfo();
              return (
                <div className={`${phase.bgColor} p-4 rounded-3xl border ${phase.borderColor} flex items-center justify-between`}>
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl flex-shrink-0 bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm">{phase.icon}</div>
                    <div>
                      <h4 className={`text-base font-black uppercase ${phase.color} tracking-tight`}>{phase.label}</h4>
                      <p className="text-xs text-slate-600 font-bold">{phase.sublabel}</p>
                    </div>
                  </div>
                  {bookingDetails?.driverEta && (appState === AppState.DRIVER_EN_ROUTE) && (
                    <div className="text-right flex-shrink-0 bg-white px-3 py-2 rounded-xl shadow-sm">
                      <p className={`text-xl font-black ${phase.color} leading-none`}>{bookingDetails.driverEta}</p>
                      <p className="text-[9px] font-black uppercase text-slate-400">min</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Comprehensive Trip Itinerary Card */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-1">Booking Ref</p>
                  <p className="font-mono text-sm font-bold opacity-90">{bookingDetails?.id?.slice(0, 8).toUpperCase() || 'TRP-1234'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
                  <p className="font-black text-sm uppercase tracking-wider text-green-400">Confirmed</p>
                </div>
              </div>

              {/* Itinerary Body */}
              <div className="p-5 space-y-6">

                {/* Driver Details */}
                {(bookingDetails?.driverName || bookingDetails?.driverPhone) && (
                  <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl shadow-sm border border-slate-200">
                        👨‍✈️
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">{bookingDetails.driverName || 'Verified Agent'}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 inline-block"></span>
                          {bookingDetails.driverVehicleModel || carInfo?.description || 'Premium Vehicle'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      {bookingDetails.driverVehicleNumber && (
                        <span className="bg-yellow-100 text-yellow-800 text-[10px] font-black px-2 py-1 rounded-md border border-yellow-200 uppercase tracking-widest">
                          {bookingDetails.driverVehicleNumber}
                        </span>
                      )}
                      <a
                        href={`tel:${bookingDetails?.driverPhone || PHONE_NUMBER}`}
                        className="bg-slate-900 text-white text-[10px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest active:scale-95 transition-all"
                        aria-label="Call driver"
                      >
                        Call
                      </a>
                    </div>
                  </div>
                )}

                {/* Route Map (Textual) */}
                <div className="relative pl-6 space-y-6 pb-2">
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200 rounded-full"></div>

                  <div className="relative">
                    <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-white border-4 border-slate-900 shadow-sm"></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Pickup Location</p>
                      <p className="text-sm font-bold text-slate-900 leading-snug">{bookingDetails?.from || 'Pickup Point'}</p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-white border-4 border-yellow-400 shadow-sm"></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Drop-off Destination</p>
                      <p className="text-sm font-bold text-slate-900 leading-snug">{bookingDetails?.to || 'Drop Point'}</p>
                    </div>
                  </div>
                </div>

                {/* Fare Summary */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Trip Summary</span>
                    <span className="text-xs font-black text-slate-900 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                      {(bookingDetails?.distanceKm || distanceKm || 0).toFixed(1)} KM
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                      <span>Vehicle Rate ({carInfo?.name || 'Sedan'})</span>
                      <span>₹{totals.breakdown.rate}/km</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                      <span>Driver Allowance</span>
                      <span>₹{totals.breakdown.allowance}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Total Amount</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">₹{fareDisplay.toLocaleString()}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              {(bookingDetails?.status === 'IN_PROGRESS' || bookingDetails?.status === 'started') ? (
                /* During trip: Pay */
                <button
                  onClick={onPay}
                  className="w-full bg-yellow-400 py-5 rounded-[1.5rem] font-black text-sm uppercase text-slate-900 shadow-xl shadow-yellow-400/20 active:scale-95 transition-all tracking-widest flex items-center justify-center space-x-2"
                >
                  <span className="text-lg">💳</span>
                  <span>Settle Payment via UPI</span>
                </button>
              ) : (
                /* Before trip starts: Cancel is available */
                canCancelRide() && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full bg-white text-red-500 font-black py-4 rounded-[1.5rem] uppercase text-[10px] tracking-widest border border-slate-200 shadow-sm active:scale-95 transition-all"
                  >
                    Cancel This Ride
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RidePanel;
