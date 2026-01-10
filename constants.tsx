
import React from 'react';

export const COLORS = {
  primary: '#facc15', // Yellow
  secondary: '#1e293b', // Slate-800
  accent: '#2563eb', // Blue-600
  tariffBg: '#f8fafc', // Clean light background
  success: '#22c55e', // Green-500
};

export const PHONE_NUMBER = '7200134807';
export const BRAND_NAME = 'Agent Taxi';
export const COMPANY_VPA = '7200134807@ybl'; 

// AGENT WALLET CONFIG
export const COMMISSION_RATE = 0.10; // 10% Platform Fee

export interface CarOption {
  id: string;
  name: string;
  subName: string;
  description: string;
  oneWayPrice: number;
  roundTripPrice: number;
  driverAllowance: number;
  oneWayMinKm: number;
  roundTripMinKm: number;
  image: string;
  specs: {
    seats: number;
    luggage: number;
    type: string;
    amenities: string[];
  };
}

export const CAR_OPTIONS: CarOption[] = [
  {
    id: 'SEDAN',
    name: 'SEDAN',
    subName: 'Rs.14',
    description: 'Swift Dzire, Toyota Etios or similar executive sedans',
    oneWayPrice: 14,
    roundTripPrice: 13,
    driverAllowance: 400,
    oneWayMinKm: 130,
    roundTripMinKm: 250,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600',
    specs: {
      seats: 4,
      luggage: 2,
      type: 'AC Sedan',
      amenities: ['Air Conditioning', 'Music System', 'Clean Interiors', 'Professional Driver']
    }
  },
  {
    id: 'SUV',
    name: 'SUV (6+1)',
    subName: 'Rs.19',
    description: 'Maruti Ertiga, Mahindra Marazzo or similar',
    oneWayPrice: 19,
    roundTripPrice: 18,
    driverAllowance: 500,
    oneWayMinKm: 130,
    roundTripMinKm: 250,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600',
    specs: {
      seats: 6,
      luggage: 4,
      type: 'Compact SUV',
      amenities: ['Spacious Seating', 'Dual AC', 'Carrier (on request)', 'Group Friendly']
    }
  },
  {
    id: 'INNOVA',
    name: 'INNOVA CRYSTA',
    subName: 'Rs.24',
    description: 'The Gold Standard of Travel Comfort',
    oneWayPrice: 24,
    roundTripPrice: 20,
    driverAllowance: 600,
    oneWayMinKm: 130,
    roundTripMinKm: 250,
    image: 'https://images.unsplash.com/photo-1621285853634-713b8dd6b5ee?auto=format&fit=crop&q=80&w=600',
    specs: {
      seats: 7,
      luggage: 5,
      type: 'Luxury MUV',
      amenities: ['Captain Seats', 'Premium AC', 'Reading Lights', 'Smooth Ride', 'Ample Luggage Space']
    }
  }
];
