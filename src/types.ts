
export enum TripType {
  ONE_WAY = 'ONE_WAY',
  ROUND_TRIP = 'ROUND_TRIP'
}

export enum PoolType {
  SOLO = 'SOLO',
  INTERCITY_POOL = 'INTERCITY_POOL',
  OFFICE_POOL = 'OFFICE_POOL',
  URBAN_POOL = 'URBAN_POOL'
}

export enum PoolStatus {
  IDLE = 'IDLE',
  WAITING = 'WAITING',
  FILLING = 'FILLING',
  LOCKED = 'LOCKED',
  DISPATCHED = 'DISPATCHED',
  CANCELLED = 'CANCELLED'
}

export enum UserRole {
  USER = 'USER',
  DRIVER = 'DRIVER'
}

export enum AppState {
  IDLE = 'IDLE',
  SELECTING_VEHICLE = 'SELECTING_VEHICLE',
  SEARCHING_DRIVER = 'SEARCHING_DRIVER',
  TRIP_ACTIVE = 'TRIP_ACTIVE',
  ARRIVED = 'ARRIVED',
  DRIVER_LISTING = 'DRIVER_LISTING',
  PAYMENT = 'PAYMENT',
  WALLET = 'WALLET',
  RATING = 'RATING'
}

export enum CarCategory {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  PREMIUM = 'PREMIUM',
  MINIBUS = 'MINIBUS'
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface StopLocation {
  id: string;
  name: string;
  coords?: LatLng;
}

export interface WalletTransaction {
  id: string;
  type: 'EARNING' | 'WITHDRAWAL' | 'COMMISSION';
  amount: number;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface AgentProfile {
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleModel: string;
  isVerified: boolean;
  balance: number;
  totalEarnings: number;
  commissionDue: number;
  commissionPaid: number;
  transactions: WalletTransaction[];
  isOnline?: boolean;
  lastOnlineAt?: string;
}

export interface BookingDetails {
  id?: string;
  from: string;
  fromCoords?: LatLng;
  to: string;
  toCoords?: LatLng;
  stops: StopLocation[];
  date: string;
  time: string;
  tripType: TripType;
  poolType: PoolType;
  poolStatus?: PoolStatus;
  poolCount?: number;
  isRecurring?: boolean;
  useVirtualStop?: boolean;
  phone?: string;
  recipientPhone?: string;
  isForSomeoneElse: boolean;
  carCategory: CarCategory;
  status?: 'pending' | 'accepted' | 'completed';
  fareAmount?: number;
  driverPhone?: string;
  // Enhanced Agent Fields
  pickupDistance?: number;
  estimatedPickupTime?: number;
  routePreview?: string;
  landmarks?: string[];
  distanceKm?: number;
  returnViability?: boolean;
  marketMinFare?: number;
  marketMaxFare?: number;
}

export interface RatingData {
  bookingId: string;
  ratedBy: UserRole;
  ratedUserId: string;
  stars: number;
  tags: string[];
  comment?: string;
}

export interface RouteInsight {
  distance: string;
  duration: string;
  highlights: string[];
  tips: string;
}

export interface FavoriteLocation {
  name: string;
  coords: LatLng;
}
