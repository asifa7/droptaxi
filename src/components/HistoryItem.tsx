import React from 'react';

interface HistoryItemProps {
    pickup_address: string;
    dropoff_address: string;
    final_fare?: number;
    final_distance_km?: number;
    completed_at?: string;
}

const HistoryItem: React.FC<HistoryItemProps> = ({
    pickup_address,
    dropoff_address,
    final_fare,
    final_distance_km,
    completed_at
}) => {
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="border-b border-slate-100 py-4 last:border-0">
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        {pickup_address} → {dropoff_address}
                    </p>
                </div>
                <span className="text-xs font-bold text-slate-400 ml-4">
                    {formatDate(completed_at)}
                </span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-lg font-black text-slate-900">
                    ₹{final_fare?.toLocaleString() ?? '-'}
                </span>
                <span className="text-xs font-bold text-slate-500">
                    {final_distance_km?.toFixed(1) ?? '-'} km
                </span>
            </div>
        </div>
    );
};

export default HistoryItem;
