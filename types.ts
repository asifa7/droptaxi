
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
  DRIVER_LISTING = 'DRIVER_LISTING'
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

export interface AgentProfile {
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleModel: string;
  isVerified: boolean;
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
  isRecurring?: boolean; // For Office Pool
  useVirtualStop?: boolean; // Walk to save time
  phone?: string;
  recipientPhone?: string;
  isForSomeoneElse: boolean;
  carCategory: CarCategory;
  status?: 'pending' | 'accepted' | 'completed';
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
