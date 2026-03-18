import React from 'react';

interface HistoryItemProps {
    id: string;
    pickup_address: string;
    dropoff_address: string;
    final_fare?: number;
    final_distance_km?: number;
    completed_at?: string;
}

const HistoryItem: React.FC<HistoryItemProps> = ({
    id,
    pickup_address,
    dropoff_address,
    final_fare,
    final_distance_km,
    completed_at
}) => {
    const formatDate = (dateString?: string) => {
        if (!dateString) return { date: '-', time: '-' };
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const displayDate = formatDate(completed_at);

    return (
        <div className="bg-slate-50 rounded-[2rem] p-5 mb-4 border border-slate-100 hover:shadow-xl transition-shadow relative overflow-hidden group">
            {/* Header / ID */}
            <div className="flex justify-between items-center mb-4 border-b border-slate-200/60 pb-4">
                <div className="flex items-center space-x-2">
                    <span className="bg-green-100 text-green-700 text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest">
                        Completed
                    </span>
                    <span className="text-[10px] font-black text-slate-400 font-mono tracking-wider">
                        #{id.slice(-6).toUpperCase()}
                    </span>
                </div>
                {completed_at && (
                    <div className="text-right">
                        <p className="text-xs font-black text-slate-800">{displayDate.date}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{displayDate.time}</p>
                    </div>
                )}
            </div>

            {/* Route Map (Textual) */}
            <div className="relative pl-6 space-y-5 pb-4">
                <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-slate-200 rounded-full"></div>

                <div className="relative">
                    <div className="absolute -left-[28px] top-1 w-3.5 h-3.5 rounded-full bg-white border-4 border-slate-900 shadow-sm"></div>
                    <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Pickup</p>
                        <p className="text-xs font-bold text-slate-800 leading-snug pr-4">{pickup_address || 'Origin'}</p>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute -left-[28px] top-1 w-3.5 h-3.5 rounded-full bg-white border-4 border-yellow-400 shadow-sm"></div>
                    <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Drop-off</p>
                        <p className="text-xs font-bold text-slate-800 leading-snug pr-4">{dropoff_address || 'Destination'}</p>
                    </div>
                </div>
            </div>

            {/* Fare Summary */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 flex justify-between items-center shadow-sm">
                <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 mt-1">Total Distance</p>
                    <p className="text-sm font-black text-slate-800 border-l-2 border-yellow-400 pl-2">
                        {final_distance_km ? `${final_distance_km.toFixed(1)} km` : '—'}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5 mt-1">Final Fare</p>
                    <p className="text-xl font-black text-slate-900 tracking-tighter">
                        ₹{final_fare?.toLocaleString() ?? '—'}
                    </p>
                </div>
            </div>

            {/* Design Element */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl group-hover:bg-yellow-400/20 transition-colors pointer-events-none"></div>
        </div>
    );
};

export default HistoryItem;
