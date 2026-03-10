
import React, { useState, useEffect, useCallback, useRef } from 'react';
import UberMap from './components/UberMap';
import RidePanel from './components/RidePanel';
import BookingForm from './components/BookingForm';
import ProfileDrawer from './components/ProfileDrawer';
import PaymentGateway from './components/PaymentGateway';
import AgentWallet from './components/AgentWallet';
import DriverTripCard from './components/DriverTripCard';
import RatingModal from './components/RatingModal';
import RiderHistory from './components/RiderHistory';
import DriverHistory from './components/DriverHistory';
import { AppState, BookingDetails, CarCategory, LatLng, UserRole, AgentProfile, PoolType, PoolStatus, TripType } from './types';
import { supabase, supabaseService, isSupabaseConfigured } from './supabaseClient';
import { PHONE_NUMBER, BRAND_NAME } from './constants';
import { poolMatcher } from './services/poolMatcher';
import { PricingEngine } from './services/pricingService';

const AppLogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M 32 17 h -1.051 a 12.929 12.929 0 0 0 -3.088 -7.447 l 1.159 -1.159 a 0.999 0.999 0 1 0 -1.414 -1.414 l -1.159 1.159 A 12.926 12.926 0 0 0 19 5.051 V 4 a 1 1 0 1 0 -2 0 v 1.051 a 12.932 12.932 0 0 0 -7.448 3.088 L 8.487 7.073 a 0.999 0.999 0 1 0 -1.414 1.414 l 1.066 1.066 A 12.922 12.922 0 0 0 5.051 17 H 4 a 1 1 0 1 0 0 2 h 1.051 a 12.926 12.926 0 0 0 3.088 7.447 L 6.98 27.606 a 0.999 0.999 0 1 0 1.414 1.414 l 1.159 -1.159 A 12.929 12.929 0 0 0 17 30.949 V 32 a 1 1 0 1 0 2 0 v -1.051 a 12.931 12.931 0 0 0 7.447 -3.088 l 1.066 1.066 a 0.997 0.997 0 0 0 1.414 0 a 0.999 0.999 0 0 0 0 -1.414 l -1.066 -1.066 a 12.932 12.932 0 0 0 3.088 -7.448 H 32 A 1 1 0 1 0 32 17 Z m -5.552 -6.033 A 10.943 10.943 0 0 1 28.949 17 h -6.04 a 4.96 4.96 0 0 0 -0.707 -1.788 l 4.246 -4.245 Z M 19 7.051 a 10.954 10.954 0 0 1 6.034 2.501 l -4.22 4.22 A 4.964 4.964 0 0 0 19 13.001 v -5.95 Z M 21 17.9 c 0 1.654 -1.346 3 -3 3 s -3 -1.346 -3 -3 s 1.346 -3 3 -3 s 3 1.346 3 3 Z M 17 7.051 v 5.95 a 4.964 4.964 0 0 0 -1.814 0.771 l -4.22 -4.22 A 10.95 10.95 0 0 1 17 7.051 Z m -7.448 3.916 l 4.246 4.246 a 4.96 4.96 0 0 0 -0.707 1.788 h -6.04 a 10.94 10.94 0 0 1 2.501 -6.034 Z m 0 14.067 A 10.946 10.946 0 0 1 7.051 19 h 6.08 a 4.99 4.99 0 0 0 0.741 1.714 l -4.32 4.32 Z M 17 28.949 a 10.954 10.954 0 0 1 -6.034 -2.501 l 4.345 -4.345 a 4.96 4.96 0 0 0 1.688 0.697 v 6.149 Z m 2 0 v -6.15 a 4.96 4.96 0 0 0 1.688 -0.697 l 4.345 4.346 A 10.94 10.94 0 0 1 19 28.949 Z m 7.447 -3.915 l -4.32 -4.32 a 4.95 4.95 0 0 0 0.741 -1.715 h 6.08 a 10.936 10.936 0 0 1 -2.501 6.035 Z" />
  </svg>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPhone, setUserPhone] = useState<string | undefined>();
  const [userId, setUserId] = useState<string | undefined>();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [driverLoc, setDriverLoc] = useState<LatLng | undefined>();
  const [ridePool, setRidePool] = useState<BookingDetails[]>([]);

  const [userLoc, setUserLoc] = useState<LatLng>({ lat: 12.9716, lng: 77.5946 });
  const [dropLoc, setDropLoc] = useState<LatLng | undefined>();

  const [extPickup, setExtPickup] = useState<{ name: string, coords: LatLng } | undefined>();
  const [extDrop, setExtDrop] = useState<{ name: string, coords: LatLng } | undefined>();

  const [pinningFor, setPinningFor] = useState<string | null>(null);
  const [currentPinAddress, setCurrentPinAddress] = useState<string>('Moving map...');
  const mapCenterRef = useRef<LatLng>({ lat: 12.9716, lng: 77.5946 });
  const reverseAbortControllerRef = useRef<AbortController | null>(null);

  // Load Wallet Data for Agent
  useEffect(() => {
    if (role === UserRole.DRIVER && (userPhone || agentProfile?.phone)) {
      const phone = agentProfile?.phone || userPhone!;
      const loadWallet = async () => {
        try {
          const wallet = await supabaseService.getWalletDetails(phone);
          const txs = await supabaseService.getTransactions(phone);
          setAgentProfile(prev => prev ? {
            ...prev,
            balance: wallet.balance,
            totalEarnings: wallet.total_earned,
            commissionDue: wallet.commission_due || 0,
            commissionPaid: wallet.commission_paid || 0,
            isOnline: wallet.is_online,
            lastOnlineAt: wallet.last_online_at,
            transactions: txs.map((t: any) => ({
              id: t.id,
              type: t.type,
              amount: t.amount,
              description: t.description,
              status: t.status,
              createdAt: t.created_at
            }))
          } : null);
        } catch (e) {
          console.warn("Wallet load failed:", e);
        }
      };
      loadWallet();
    }
  }, [role, userPhone, appState]);

  // AUTH STATE MANAGEMENT
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsLoggedIn(true);
          setUserPhone(session.user.phone);
          setUserId(session.user.id);
        }
      } catch (err) {
        console.error("Auth session fetch failed:", err);
      }
    };
    initAuth();
    PricingEngine.fetchAndSyncRules(); // Sync pricing rules on startup

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setUserPhone(session?.user?.phone);
      setUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const enhanceTripData = (rawTrip: any): BookingDetails => {
    const pickupCoords = rawTrip.from_lat ? { lat: rawTrip.from_lat, lng: rawTrip.from_lng } : undefined;
    let pickupDist = 0.5;
    if (pickupCoords && userLoc) {
      const dx = pickupCoords.lat - userLoc.lat;
      const dy = pickupCoords.lng - userLoc.lng;
      pickupDist = Math.hypot(dx, dy) * 111;
    }

    return {
      id: rawTrip.id,
      from: rawTrip.from_name,
      to: rawTrip.to_name,
      fromCoords: pickupCoords,
      toCoords: rawTrip.to_lat ? { lat: rawTrip.to_lat, lng: rawTrip.to_lng } : undefined,
      status: rawTrip.status,
      carCategory: rawTrip.car_category as CarCategory,
      tripType: rawTrip.trip_type as TripType,
      poolType: (rawTrip.pool_type as PoolType) || PoolType.SOLO,
      poolStatus: (rawTrip.pool_status as PoolStatus) || PoolStatus.IDLE,
      poolCount: rawTrip.pool_count || 1,
      date: rawTrip.trip_date,
      time: rawTrip.trip_time,
      phone: rawTrip.phone,
      stops: [],
      isForSomeoneElse: false,
      pickupDistance: pickupDist,
      estimatedPickupTime: Math.ceil(pickupDist * 3),
      routePreview: rawTrip.to_name.includes('Bangalore') ? "NH-44 → Hosur Road → Electronics City" : "State Highway → Outer Ring Road",
      landmarks: rawTrip.from_name.includes('Airport') ? ["Near Terminal 1", "Taxi Stand B"] : ["Near Main Circle", "Opposite Mall"],
      distanceKm: rawTrip.distance_km || 150,
      returnViability: Math.random() > 0.4,
      fareAmount: rawTrip.fare_amount || (rawTrip.pool_type === PoolType.SOLO ? 2400 : 850)
    };
  };

  const updateBookingStatus = useCallback((status: string, driverPhone?: string) => {
    setBooking(prev => {
      if (!prev) return null;
      return { ...prev, status, driverPhone: driverPhone || prev.driverPhone };
    });
  }, []);

  // Polling for Booking Status (Rider Side)
  useEffect(() => {
    let interval: any;
    if (role === UserRole.USER && appState === AppState.SEARCHING_DRIVER && booking?.id) {
      interval = setInterval(async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const statusData = await supabaseService.getBookingStatus(booking.id!);
          const status = statusData.status;
          if (status === 'COMPLETED' || status === 'completed') {
            updateBookingStatus('COMPLETED');
            setAppState(AppState.RATING);
          } else if (status === 'DRIVER_ACCEPTED' || status === 'accepted' || status === 'IN_PROGRESS') {
            updateBookingStatus(status, statusData.driver_phone);
            setAppState(AppState.TRIP_ACTIVE);
            if (booking.fromCoords) {
              setDriverLoc({ lat: booking.fromCoords.lat + 0.002, lng: booking.fromCoords.lng + 0.002 });
            }
          }
        } catch (err) {
          console.error("Status check failed:", err);
        }
      }, 4000);
    } else if (role === UserRole.USER && appState === AppState.TRIP_ACTIVE && booking?.id) {
      interval = setInterval(async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const statusData = await supabaseService.getBookingStatus(booking.id!);
          if (statusData.status === 'COMPLETED' || statusData.status === 'completed') {
            updateBookingStatus('COMPLETED');
            setAppState(AppState.RATING);
          }
        } catch (err) {
          console.error("Completion check failed:", err);
        }
      }, 4000);
    }

    return () => clearInterval(interval);
  }, [role, appState, booking?.id]); // Keeping deps minimal to avoid resets

  // ... (lines 165-608)



  const handleDriverBookingUpdate = useCallback((payload: any, newRide: any) => {
    const isPending = newRide.status === 'pending';

    if (payload.eventType === 'INSERT' && isPending) {
      setRidePool(prev => [enhanceTripData(newRide), ...prev]);
      return;
    }

    if (payload.eventType === 'UPDATE') {
      setRidePool(prev => isPending
        ? prev.map(r => r.id === newRide.id ? enhanceTripData(newRide) : r)
        : prev.filter(r => r.id !== newRide.id)
      );
    }
  }, [enhanceTripData]);

  const handleUserBookingUpdate = useCallback((newRide: any) => {
    if (newRide.status === 'completed') {
      setAppState(AppState.RATING);
      return;
    }

    if (newRide.status === 'accepted') {
      setAppState(AppState.TRIP_ACTIVE);
      if (newRide.from_lat && newRide.from_lng) {
        setDriverLoc({ lat: newRide.from_lat + 0.002, lng: newRide.from_lng + 0.002 });
      }
    }
  }, []);

  const handleBookingChange = useCallback((payload: any) => {
    const newRide: any = payload.new;
    if (!newRide) return;

    if (role === UserRole.DRIVER) {
      handleDriverBookingUpdate(payload, newRide);
    } else if (role === UserRole.USER && booking && newRide.id === booking.id) {
      handleUserBookingUpdate(newRide);
    }
  }, [role, booking, handleDriverBookingUpdate, handleUserBookingUpdate]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (role === UserRole.DRIVER && isSupabaseConfigured()) {
        try {
          const pending = await supabaseService.getPendingRides();
          const mapped = pending.map(enhanceTripData);
          setRidePool(mapped);
        } catch (err) {
          console.error("Error fetching pool:", err);
        }
      }
    };

    fetchInitialData();

    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        handleBookingChange
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [role, booking, userLoc, handleBookingChange]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(loc);
          mapCenterRef.current = loc;
        }
      );
    }
  }, []);

  const handleMapMove = useCallback(async (coords: LatLng) => {
    if (!pinningFor) return;
    mapCenterRef.current = coords;

    if (reverseAbortControllerRef.current) reverseAbortControllerRef.current.abort();
    const controller = new AbortController();
    reverseAbortControllerRef.current = controller;

    try {
      const res = await fetch(`https://photon.komoot.io/reverse?lon=${coords.lng}&lat=${coords.lat}`, {
        signal: controller.signal
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      const place = data.features[0]?.properties;
      setCurrentPinAddress(place?.name || place?.street || place?.city || "Selected Location");
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setCurrentPinAddress("Selected Location");
      }
    }
  }, [pinningFor]);

  const confirmPin = () => {
    if (!pinningFor) return;
    const coords = mapCenterRef.current;
    if (pinningFor === 'from') { setExtPickup({ name: currentPinAddress, coords }); setUserLoc(coords); }
    else { setExtDrop({ name: currentPinAddress, coords }); setDropLoc(coords); }
    setPinningFor(null);
  };

  const handleInitialSearch = (details: BookingDetails) => {
    setBooking(details);
    if (details.fromCoords) setUserLoc(details.fromCoords);
    if (details.toCoords) setDropLoc(details.toCoords);
    setAppState(AppState.SELECTING_VEHICLE);
  };

  const handleConfirmRide = async (category: CarCategory, metrics?: { distance: number, fare: number, min: number, max: number }) => {
    if (!booking) return;
    setAppState(AppState.SEARCHING_DRIVER);

    try {
      const enhancedBooking = {
        ...booking,
        carCategory: category,
        distanceKm: metrics?.distance || booking.distanceKm,
        fareAmount: metrics?.fare || booking.fareAmount,
        marketMinFare: metrics?.min,
        marketMaxFare: metrics?.max
      };

      if (!isSupabaseConfigured()) {
        const isPool = booking.poolType !== PoolType.SOLO;
        setBooking({ ...enhancedBooking, id: 'demo-' + Date.now(), poolStatus: isPool ? PoolStatus.WAITING : PoolStatus.IDLE });
        return;
      }

      const isPool = booking.poolType !== PoolType.SOLO;
      let savedRide;

      if (isPool && booking.fromCoords && booking.toCoords) {
        const matchId = await poolMatcher.findBestMatch({
          fromCoords: booking.fromCoords,
          toCoords: booking.toCoords,
          requestTime: new Date(),
          poolType: booking.poolType,
          maxDetour: 10
        });

        if (matchId) {
          savedRide = await supabaseService.joinPool(matchId);
        } else {
          savedRide = await supabaseService.createRideRequest(enhancedBooking);
        }
      } else {
        savedRide = await supabaseService.createRideRequest(enhancedBooking);
      }

      setBooking(prev => ({
        ...enhancedBooking,
        id: savedRide.id,
        poolStatus: savedRide.pool_status,
        poolCount: savedRide.pool_count,
        fareAmount: savedRide.fare_amount
      }));

    } catch (e: any) {
      alert(`Booking Error: ${e.message}`);
      setAppState(AppState.SELECTING_VEHICLE);
    }
  };

  const handleAcceptRide = async (ride: BookingDetails) => {
    try {
      const driverIdentifier = agentProfile?.phone || userPhone || 'anonymous-driver';
      const { data } = await supabase.auth.getSession();
      const driverId = data.session?.user?.id;

      if (isSupabaseConfigured() && ride.id) {
        await supabaseService.acceptRide(ride.id, driverIdentifier, driverId);
      }
      setBooking(ride);
      setAppState(AppState.TRIP_ACTIVE);
    } catch (err: any) {
      const msg = err.message || String(err);
      alert(msg === "RIDE_ALREADY_TAKEN" ? "This ride was already claimed." : `Error: ${msg}`);
      if (ride.id) {
        setRidePool(prev => prev.filter(r => r.id !== ride.id));
      }
    }
  };

  const handleRejectRide = (ride: BookingDetails) => {
    // Just remove from local view for now
    setRidePool(prev => prev.filter(r => r.id !== ride.id));
  };

  const cleanupRideFromPool = useCallback((rideId: string) => {
    setRidePool(prev => prev.filter(r => r.id !== rideId));
  }, []);

  const handleCompleteRide = async (ride: BookingDetails) => {
    if (!ride.id) return;
    try {
      if (isSupabaseConfigured()) {
        await supabaseService.completeRide(ride.id, ride.fareAmount || 0, ride.distanceKm || 0);
        setRidePool(prev => prev.map(r => r.id === ride.id ? { ...r, status: 'COMPLETED' } : r));

        const rideIdToCleanup = ride.id;
        setTimeout(() => cleanupRideFromPool(rideIdToCleanup), 5000);
      } else {
        setRidePool(prev => prev.map(r => r.id === ride.id ? { ...r, status: 'COMPLETED' } : r));
      }
    } catch (err: any) {
      console.error("Complete ride failed:", err);
      alert("Failed to complete ride: " + err.message);
    }
  };

  const handleStartRide = async (ride: BookingDetails) => {
    if (!ride.id) return;
    try {
      if (isSupabaseConfigured()) {
        const updated = await supabaseService.startRide(ride.id);
        setRidePool(prev => prev.map(r => r.id === ride.id ? { ...r, status: updated.status } : r));
        setBooking(prev => prev?.id === ride.id ? { ...prev, status: updated.status } : prev);
      } else {
        setRidePool(prev => prev.map(r => r.id === ride.id ? { ...r, status: 'IN_PROGRESS' } : r));
      }
    } catch (err: any) {
      console.error("Start ride failed:", err);
      alert("Failed to start ride: " + err.message);
    }
  };

  const handleInspectTrip = (ride: BookingDetails) => {
    if (ride.fromCoords) {
      setDropLoc(ride.toCoords);
      setUserLoc(ride.fromCoords);
    }
  };

  const toggleRole = () => {
    setRole(prev => prev === UserRole.USER ? UserRole.DRIVER : UserRole.USER);
    setAppState(AppState.IDLE);
    setIsProfileOpen(false);
  };

  const handlePaymentSuccess = () => {
    setAppState(AppState.RATING);
  };

  const handleRatingSubmit = async (stars: number, tags: string[], comment: string) => {
    if (!booking) return;
    try {
      await supabaseService.submitRating({
        bookingId: booking.id!,
        ratedBy: role,
        ratedUserId: role === UserRole.USER ? (booking.driverPhone || 'driver') : (booking.phone || 'user'),
        stars,
        tags,
        comment
      });
      alert("Feedback received! Thank you for using Agent Taxi.");
      setAppState(AppState.IDLE);
      setBooking(null);
    } catch (e) {
      console.warn("Rating error:", e);
      setAppState(AppState.IDLE);
      setBooking(null);
    }
  };

  const handleTriggerPayment = async () => {
    if (booking?.id) {
      await supabaseService.initiatePaymentVerification(booking.id, booking.fareAmount || 0);
      setAppState(AppState.PAYMENT);
    }
  };

  const handleWithdrawalRequest = async (amount: number, upiId: string) => {
    const phone = agentProfile?.phone || userPhone;
    if (!phone) return;
    try {
      await supabaseService.requestWithdrawal(phone, amount, upiId);
      alert("Withdrawal request submitted! Payout will reflect in 24-48 hours.");
      setAgentProfile(prev => prev ? { ...prev, balance: prev.balance - amount } : null);
    } catch (err) {
      console.error("Withdrawal failed:", err);
      alert("Withdrawal failed. Please check your connection.");
    }
  };

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-slate-100 select-none">
      <UberMap pickup={userLoc} destination={dropLoc} driverLoc={driverLoc} appState={appState} onMapMove={handleMapMove} center={pinningFor ? mapCenterRef.current : undefined} />

      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        isLoggedIn={isLoggedIn}
        userPhone={userPhone}
        onToggleLogin={() => setIsLoggedIn(true)}
        currentRole={role}
        onToggleRole={toggleRole}
        agentProfile={agentProfile}
        onUpdateAgent={(p) => setAgentProfile(p)}
        onOpenWallet={() => { setAppState(AppState.WALLET); setIsProfileOpen(false); }}
      />

      {pinningFor && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1100]">
          <div className="w-10 h-10 bg-slate-900 rounded-full border-4 border-white shadow-2xl animate-bounce mb-10 transform -translate-y-1/2"></div>
        </div>
      )}

      {appState === AppState.PAYMENT && booking && (
        <PaymentGateway
          amount={booking.fareAmount || 0}
          bookingId={booking.id || 'DEMO'}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setAppState(AppState.TRIP_ACTIVE)}
        />
      )}

      {appState === AppState.RATING && booking && (
        <RatingModal
          booking={booking}
          userRole={role}
          onSubmit={handleRatingSubmit}
          onClose={() => { setAppState(AppState.IDLE); setBooking(null); }}
        />
      )}

      {appState === AppState.WALLET && agentProfile && (
        <AgentWallet
          profile={agentProfile}
          onWithdraw={handleWithdrawalRequest}
          onClose={() => setAppState(AppState.IDLE)}
        />
      )}

      <header className="absolute top-0 left-0 right-0 z-[1000] p-4 flex justify-center pointer-events-none">
        <div className="w-full max-w-xl flex justify-between pointer-events-auto">
          <button onClick={() => setIsProfileOpen(true)} className="glass px-4 py-2 rounded-2xl flex items-center space-x-3 border border-white shadow-xl active:scale-95 transition-all">
            <div className="bg-slate-900 w-10 h-10 rounded-xl text-yellow-400 flex items-center justify-center shadow-inner">
              <AppLogoIcon className="w-6 h-6" />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="font-black text-slate-900 uppercase text-lg tracking-tighter">{BRAND_NAME}</span>
            </div>
          </button>
          <a href={`tel:${PHONE_NUMBER}`} className="glass w-12 h-12 rounded-2xl flex items-center justify-center text-slate-900 shadow-xl border border-white active:scale-90">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
          </a>
        </div>
      </header>

      {role === UserRole.USER && appState === AppState.IDLE && (
        <div id="booking-container" className="absolute inset-x-0 bottom-0 z-[1001] px-4 pb-4 flex justify-center items-end h-full pointer-events-none transition-all duration-300">
          <div className="w-full max-w-[450px] pointer-events-auto">
            {pinningFor ? (
              <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl space-y-4 animate-in slide-in-from-bottom-20">
                <h3 className="text-lg font-bold text-slate-900 truncate">{currentPinAddress}</h3>
                <button onClick={confirmPin} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest shadow-xl">Confirm Pin</button>
              </div>
            ) : (
              <BookingForm isLoggedIn={isLoggedIn} onComplete={handleInitialSearch} onEnterPinMode={(f) => setPinningFor(f)} externalPickup={extPickup} externalDrop={extDrop} />
            )}
          </div>
        </div>
      )}

      {role === UserRole.DRIVER && appState !== AppState.TRIP_ACTIVE && (
        <div className="absolute inset-x-0 bottom-0 z-[1001] p-4 flex justify-center items-end h-full pointer-events-none">
          <div className="w-full max-w-xl pointer-events-auto bg-slate-50/90 backdrop-blur-xl rounded-[3rem] p-8 shadow-2xl space-y-6 border border-white max-h-[70vh] flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <div className="space-y-1">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Highway Feed</h2>
                <div className="flex items-center space-x-2">
                  {agentProfile?.isOnline ? (
                    <span className="flex items-center text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-1 rounded-md border border-green-100">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      {" "}Online & Scanning
                    </span>
                  ) : (
                    <span className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                      <span className="w-2 h-2 bg-slate-400 rounded-full mr-2"></span>
                      {" "}Offline
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <span className="sr-only">Toggle Online Status</span>
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={agentProfile?.isOnline || false}
                    onChange={async (e) => {
                      const newState = e.target.checked;
                      if (!newState && appState === AppState.TRIP_ACTIVE) {
                        alert("Cannot go offline during an active trip!");
                        return;
                      }
                      try {
                        const phone = agentProfile?.phone || userPhone;
                        if (phone) {
                          const updated = await supabaseService.toggleDriverStatus(phone, newState);
                          setAgentProfile(prev => prev ? { ...prev, isOnline: updated.is_online } : null);
                        }
                      } catch (err: any) {
                        alert("Status update failed: " + err.message);
                      }
                    }}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-slate-400">Requests</p>
                  <p className={`text-lg font-black leading-none ${agentProfile?.isOnline ? 'text-slate-900' : 'text-slate-300'}`}>{ridePool.length}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 overflow-y-auto pr-2 hide-scrollbar flex-1 pb-4">
              {ridePool.length === 0 ? (
                <div className="py-20 text-center space-y-6 animate-in fade-in">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-yellow-400 rounded-full animate-spin"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-slate-300 uppercase tracking-widest text-xs">Waiting for passenger load...</p>
                    <p className="text-[10px] text-slate-400 font-bold max-w-[200px] mx-auto leading-relaxed">Ensure your location permissions are active to receive high-fare intercity requests.</p>
                  </div>
                </div>
              ) : (
                ridePool.map(ride => (
                  <DriverTripCard
                    key={ride.id}
                    trip={ride}
                    onAccept={handleAcceptRide}
                    onViewMap={handleInspectTrip}
                    onReject={handleRejectRide}
                    onStart={handleStartRide}
                    onComplete={handleCompleteRide}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rider History - Show when logged in as rider and in IDLE state */}
      {role === UserRole.USER && appState === AppState.IDLE && isLoggedIn && userId && (
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 pb-32 pointer-events-none">
          <div className="w-full max-w-xl mx-auto pointer-events-auto">
            <RiderHistory userId={userId} />
          </div>
        </div>
      )}

      {/* Driver History - Show when logged in as driver and in IDLE state */}
      {role === UserRole.DRIVER && appState === AppState.IDLE && isLoggedIn && userId && (
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 pb-32 pointer-events-none">
          <div className="w-full max-w-xl mx-auto pointer-events-auto">
            <DriverHistory driverId={userId} />
          </div>
        </div>
      )}

      <RidePanel
        appState={appState}
        onConfirm={handleConfirmRide}
        onCancel={() => { setAppState(AppState.IDLE); setBooking(null); }}
        bookingDetails={booking || undefined}
        onPay={handleTriggerPayment}
      />
    </div>
  );
};

export default App;