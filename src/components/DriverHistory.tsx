import React, { useEffect, useState } from 'react';
import { supabaseService } from '../supabaseClient';
import HistoryItem from './HistoryItem';

interface RideHistoryRecord {
    id: string;
    pickup_address: string;
    dropoff_address: string;
    final_fare?: number;
    final_distance_km?: number;
    completed_at?: string;
}

interface DriverHistoryProps {
    driverId: string;
}

const DriverHistory: React.FC<DriverHistoryProps> = ({ driverId }) => {
    const [rides, setRides] = useState<RideHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await supabaseService.getDriverHistory(driverId);
                setRides(data as RideHistoryRecord[]);
            } catch (e: any) {
                setError(e.message || 'Failed to load completed rides');
            } finally {
                setLoading(false);
            }
        };

        if (driverId) {
            fetchHistory();
        }
    }, [driverId]);

    if (loading) {
        return (
            <section className="mt-8">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">
                    Completed Rides
                </h2>
                <div className="bg-white rounded-3xl shadow-sm p-6 text-center">
                    <p className="text-sm font-bold text-slate-400">Loading completed rides...</p>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="mt-8">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">
                    Completed Rides
                </h2>
                <div className="bg-red-50 rounded-3xl border border-red-100 p-6 text-center">
                    <p className="text-sm font-bold text-red-600">{error}</p>
                </div>
            </section>
        );
    }

    if (rides.length === 0) {
        return (
            <section className="mt-8">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">
                    Completed Rides
                </h2>
                <div className="bg-slate-50 rounded-3xl p-6 text-center">
                    <p className="text-sm font-bold text-slate-400">No rides yet</p>
                </div>
            </section>
        );
    }

    return (
        <section className="mt-8">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">
                Completed Rides
            </h2>
            <div className="bg-white rounded-3xl shadow-sm p-6">
                {rides.map((ride) => (
                    <HistoryItem key={ride.id} {...ride} />
                ))}
            </div>
        </section>
    );
};

export default DriverHistory;
