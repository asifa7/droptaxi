
import { LatLng } from '../types';

export const calculateDistance = (from: LatLng, to: LatLng): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(to.lat - from.lat);
    const dLon = deg2rad(to.lng - from.lng);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(from.lat)) * Math.cos(deg2rad(to.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return Number(d.toFixed(1));
};

const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
};
