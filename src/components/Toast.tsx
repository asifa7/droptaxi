import React, { useEffect, useState } from 'react';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for fade-out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgStyles = {
        error: 'bg-red-500 text-white',
        success: 'bg-green-500 text-white',
        info: 'bg-slate-900 text-white',
        warning: 'bg-yellow-400 text-slate-900',
    };

    const iconStyles = {
        error: '🚫',
        success: '✅',
        info: 'ℹ️',
        warning: '⚠️',
    };

    return (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
            <div className={`${bgStyles[type]} px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 min-w-[300px] max-w-md`}>
                <span className="text-lg">{iconStyles[type]}</span>
                <p className="text-xs font-black uppercase tracking-widest flex-1">{message}</p>
                <button onClick={() => setIsVisible(false)} className="opacity-50 hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
};

export default Toast;
