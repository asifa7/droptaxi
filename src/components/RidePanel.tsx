
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
}

const RidePanel: React.FC<RidePanelProps> = ({ appState, onConfirm, onCancel, bookingDetails, onPay }) => {
  const [selected, setSelected] = useState<CarCategory>(CarCategory.SEDAN);
  const [showModal, setShowModal] = useState(false);
  const [modalCar, setModalCar] = useState<CarOption | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(0);

  // Pooling UI State
  const [poolStatus, setPoolStatus] = useState<PoolStatus>(PoolStatus.IDLE);
  const [poolTimer, setPoolTimer] = useState(90);
  const [passengerCount, setPassengerCount] = useState(1);

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
    if (appState === AppState.SEARCHING_DRIVER && bookingDetails?.poolType !== PoolType.SOLO) {
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
  }, [appState, bookingDetails?.poolType]);

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

    if (bookingDetails.poolType !== PoolType.SOLO) {
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
  }, [selected, distanceKm, bookingDetails?.tripType, bookingDetails?.poolType, bookingDetails?.date, bookingDetails?.time]);

  const handleSelectCar = (car: CarOption) => {
    setSelected(car.id as unknown as CarCategory);
    setModalCar(car);
    setShowModal(true);
  };

  const poolTitle = bookingDetails?.poolType === PoolType.SOLO ? 'Solo Travel' : 'Shared Pool Travel';
  const confirmText = `Confirm ${bookingDetails?.poolType !== PoolType.SOLO ? 'Pool' : 'Solo'} Ride`;
  const bookingModeLabel = bookingDetails?.poolType.replaceAll('_', ' ');

  const getPoolingStatusText = () => {
    switch (poolStatus) {
      case PoolStatus.WAITING: return 'Scanning for Riders...';
      case PoolStatus.FILLING: return 'Co-passenger Found!';
      default: return 'Dispatching Pool...';
    }
  };

  const activeTripStatus = (bookingDetails?.status === 'IN_PROGRESS' || bookingDetails?.status === 'started') ? 'Trip Started' : 'Driver Assigned';

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
                      <span className="font-black text-sm text-slate-900">Agent {bookingDetails?.poolType !== PoolType.SOLO ? 'Pool' : 'Taxi'}</span>
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

      <div className={`fixed bottom-0 left-0 right-0 z-20 glass rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 bottom-sheet transform ${appState === AppState.IDLE || appState === AppState.DRIVER_LISTING || appState === AppState.PAYMENT ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>

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
                const discountText = bookingDetails?.poolType !== PoolType.SOLO ? '40% OFF' : 'Best Rate';

                return (
                  <button
                    key={car.id}
                    onClick={() => handleSelectCar(car)}
                    className={`flex-shrink-0 w-44 p-4 rounded-[2.2rem] border-4 transition-all relative overflow-hidden group ${isSelected ? 'border-yellow-400 bg-yellow-50 shadow-xl scale-105' : 'border-slate-50 bg-white opacity-90'}`}
                    aria-label={`Select ${car.name}, price ${riderPrice}`}
                  >
                    <img src={car.image} className="w-full h-16 object-contain mb-3 group-hover:scale-110 transition-transform" alt="" />
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
          <div className="py-10 text-center space-y-6">
            {bookingDetails?.poolType !== PoolType.SOLO ? (
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
                    {new Array(passengerCount).fill(0).map((_, i) => (
                      <div key={`rider-${i}`} className="w-12 h-12 rounded-full border-4 border-white bg-slate-900 flex items-center justify-center text-lg animate-in zoom-in" aria-hidden="true">👤</div>
                    ))}
                    {new Array(Math.max(0, 3 - passengerCount)).fill(0).map((_, i) => (
                      <div key={`empty-${i}`} className="w-12 h-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-lg text-slate-300 border-dashed" aria-hidden="true">?</div>
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
              <div className="space-y-6">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 border-8 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-4 bg-slate-900 rounded-full flex items-center justify-center text-yellow-400" aria-hidden="true">🛞</div>
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase">Finding Driver...</h2>
                <p className="text-slate-500 text-sm">Securing your fixed outstation rate.</p>
              </div>
            )}
            <button onClick={onCancel} className="w-full bg-red-50 text-red-600 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest border border-red-100">Cancel Request</button>
          </div>
        )}

        {appState === AppState.TRIP_ACTIVE && (
          <div className="space-y-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-yellow-400 text-2xl shadow-lg" aria-hidden="true">👨‍✈️</div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 uppercase">
                    {activeTripStatus}
                  </h4>
                  <p className="text-xs font-bold text-slate-400">Locked Price: ₹{totals.rider.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-slate-900">₹{totals.rider.toLocaleString()}</p>
                <p className="text-[10px] font-black uppercase text-slate-400">Fixed Fare</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={onPay}
                className="bg-yellow-400 py-4 rounded-2xl font-black text-xs uppercase text-slate-900 shadow-xl shadow-yellow-400/20 active:scale-95 transition-all"
              >
                Pay Now via UPI
              </button>
              <a
                href={`tel:${PHONE_NUMBER}`}
                className="bg-slate-100 py-4 rounded-2xl font-black text-xs uppercase text-slate-900 flex items-center justify-center active:scale-95 transition-all"
                aria-label="Call driver"
              >
                Contact Driver
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RidePanel;
