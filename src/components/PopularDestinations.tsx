import React from 'react';
import { LatLng } from '../types';

export interface RouteData {
    id: string;
    from: string;
    to: string;
    fromCoords: LatLng;
    toCoords: LatLng;
    distance: string;
    desc: string;
    img1: string;
    img2: string;
    spots: string[];
}

export interface CityData {
    name: string;
    desc: string;
    img: string;
    spots: string[];
    coords: LatLng;
}

const POPULAR_CITIES: CityData[] = [
    {
        name: 'Pondicherry',
        desc: 'French colonial town known for its beaches, culture, and spirituality.',
        img: 'https://images.unsplash.com/photo-1617424566736-2399997576d1?w=400&q=80',
        spots: ['Auroville', 'Promenade Beach'],
        coords: { lat: 11.9416, lng: 79.8083 }
    },
    {
        name: 'Bangalore',
        desc: 'The Silicon Valley of India, known for its tech industry and vibrant culture.',
        img: 'https://images.unsplash.com/photo-1596176530529-78163f4b4ce6?w=400&q=80',
        spots: ['Nandi Hills', 'Cubbon Park'],
        coords: { lat: 12.9716, lng: 77.5946 }
    },
    {
        name: 'Chennai',
        desc: 'Capital city of Tamil Nadu known for its beaches, temples, and culture.',
        img: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&q=80',
        spots: ['Marina Beach', 'Mahabalipuram'],
        coords: { lat: 13.0827, lng: 80.2707 }
    },
    {
        name: 'Trichy',
        desc: 'A major heritage and educational city in Tamil Nadu.',
        img: 'https://images.unsplash.com/photo-1623126908029-58cb08a2b272?w=400&q=80',
        spots: ['Rockfort Temple', 'Kallanai Dam'],
        coords: { lat: 10.7905, lng: 78.7047 }
    }
];

const POPULAR_ROUTES: RouteData[] = [
    {
        id: 'chennai-pondy',
        from: 'Chennai',
        to: 'Pondicherry',
        fromCoords: { lat: 13.0827, lng: 80.2707 },
        toCoords: { lat: 11.9416, lng: 79.8083 },
        distance: '150 km',
        desc: 'Scenic coastal route with beautiful beach views and French colonial architecture.',
        img1: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=200&q=80',
        img2: 'https://images.unsplash.com/photo-1617424566736-2399997576d1?w=200&q=80',
        spots: ['Promenade', 'Auroville']
    },
    {
        id: 'chennai-vellore',
        from: 'Chennai',
        to: 'Vellore',
        fromCoords: { lat: 13.0827, lng: 80.2707 },
        toCoords: { lat: 12.9165, lng: 79.1325 },
        distance: '130 km',
        desc: 'A scenic route through the heart of Tamil Nadu.',
        img1: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=200&q=80',
        img2: 'https://images.unsplash.com/photo-1621213306869-232cc2d619a8?w=200&q=80',
        spots: ['Vellore Fort', 'Golden Temple']
    },
    {
        id: 'coimbatore-trichy',
        from: 'Coimbatore',
        to: 'Trichy',
        fromCoords: { lat: 11.0168, lng: 76.9558 },
        toCoords: { lat: 10.7905, lng: 78.7047 },
        distance: '220 km',
        desc: 'Stunning views and serene landscapes through the Western Ghats.',
        img1: 'https://images.unsplash.com/photo-1621539139178-500b4119e5c4?w=200&q=80',
        img2: 'https://images.unsplash.com/photo-1623126908029-58cb08a2b272?w=200&q=80',
        spots: ['Srirangam Temple', 'Kallanai Dam']
    }
];

interface Props {
    onSelectRoute: (route: RouteData) => void;
    onSelectCity: (city: CityData) => void;
}

const PopularDestinations: React.FC<Props> = ({ onSelectRoute, onSelectCity }) => {
    return (
        <div className="mt-8 space-y-8 pb-6 animate-in fade-in duration-500">

            {/* Popular Routes Section */}
            <div className="space-y-4">
                <div className="flex items-center space-x-2 px-1">
                    <span className="w-1.5 h-5 bg-yellow-400 rounded-full inline-block"></span>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Popular Routes</h3>
                </div>

                <div className="flex space-x-4 overflow-x-auto hide-scrollbar pb-4 px-1 snap-x snap-mandatory">
                    {POPULAR_ROUTES.map((route) => (
                        <button
                            key={route.id}
                            onClick={() => onSelectRoute(route)}
                            className="flex-shrink-0 w-72 text-left bg-white border border-slate-100 rounded-3xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group snap-start block"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-black text-slate-900 leading-none">{route.from}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">→</span>
                                <span className="text-xs font-black text-slate-900 leading-none">{route.to}</span>
                            </div>

                            <div className="flex space-x-2 mb-4 h-24">
                                <div className="flex-1 rounded-xl overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent z-10 transition-opacity group-hover:opacity-40"></div>
                                    <img src={route.img1} alt={route.from} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                </div>
                                <div className="flex-1 rounded-xl overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent z-10 transition-opacity group-hover:opacity-40"></div>
                                    <img src={route.img2} alt={route.to} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 delay-75" />
                                </div>
                            </div>

                            <div className="flex justify-between items-end mb-3">
                                <span className="text-[10px] font-black uppercase text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                                    {route.distance}
                                </span>
                            </div>

                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed line-clamp-2 mb-3">
                                {route.desc}
                            </p>

                            <div className="flex flex-wrap gap-1">
                                {route.spots.map((spot, idx) => (
                                    <span key={idx} className="text-[9px] bg-slate-50 text-slate-600 px-2 py-1 rounded-md font-bold border border-slate-100">
                                        {spot}
                                    </span>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Popular Cities Section */}
            <div className="space-y-4">
                <div className="flex items-center space-x-2 px-1">
                    <span className="w-1.5 h-5 bg-yellow-400 rounded-full inline-block"></span>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Popular Cities</h3>
                </div>

                <div className="flex space-x-4 overflow-x-auto hide-scrollbar pb-4 px-1 snap-x snap-mandatory">
                    {POPULAR_CITIES.map((city, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSelectCity(city)}
                            className="flex-shrink-0 w-48 text-left bg-white border border-slate-100 rounded-3xl p-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group snap-start block relative overflow-hidden"
                        >
                            <div className="h-28 rounded-2xl overflow-hidden mb-3 relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10"></div>
                                <img src={city.img} alt={city.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute bottom-3 left-3 z-20">
                                    <h4 className="text-sm font-black text-white">{city.name}</h4>
                                </div>
                            </div>

                            <p className="text-[9px] text-slate-500 font-bold leading-relaxed line-clamp-2 px-1 mb-2">
                                {city.desc}
                            </p>

                            <div className="flex flex-wrap gap-1 px-1">
                                {city.spots.map((spot, i) => (
                                    <span key={i} className="text-[8px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap border border-slate-100">
                                        {spot}
                                    </span>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default PopularDestinations;
