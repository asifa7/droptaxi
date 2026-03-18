import React, { useState, useEffect, useRef } from 'react';

interface NominatimResult {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    address?: {
        city?: string;
        state?: string;
        road?: string;
        suburb?: string;
    };
}

interface LocationResult {
    address: string;
    lat: number;
    lng: number;
}

interface LocationAutocompleteProps {
    value?: string;
    placeholder?: string;
    onSelect: (result: LocationResult) => void;
    className?: string; // To match parent styling
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onChange?: (value: string) => void;
    error?: boolean;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
    value = '',
    placeholder = 'Search location...',
    onSelect,
    className,
    leftIcon,
    rightIcon,
    onChange,
    error
}) => {
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Use a ref for debounce timeout to clear it reliably
    const searchTimeout = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // Abort controller to cancel previous pending requests
    const abortController = useRef<AbortController | null>(null);

    // Sync internal state if parent changes value prop
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Click Outside Handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch Logic
    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);

        // Cancel previous request
        if (abortController.current) {
            abortController.current.abort();
        }
        abortController.current = new AbortController();

        try {
            // Nominatim Search API
            // q=query, format=json, addressdetails=1, limit=5
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;

            const res = await fetch(url, {
                signal: abortController.current.signal,
                headers: {
                    // IMPORTANT: Nominatim requires a User-Agent
                    "User-Agent": "DropTaxi_Web_App/1.0 (internal_dev_testing)"
                }
            });

            if (!res.ok) throw new Error('Nominatim API error');

            const data: NominatimResult[] = await res.json();
            setSuggestions(data);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.warn("Nominatim fetch error:", err);
                setSuggestions([]);
            }
        } finally {
            // Only turn off loading if this wasn't aborted
            if (abortController.current && !abortController.current.signal.aborted) {
                setIsLoading(false);
            }
        }
    };

    // Input Change Handler with Debounce
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        setIsOpen(true);
        onChange?.(val);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(() => {
            fetchSuggestions(val);
        }, 500); // 500ms debounce
    };

    const handleSelect = (item: NominatimResult) => {
        // Format a cleaner address if possible, else use display_name
        // display_name is often very long in Nominatim
        const parts = item.display_name.split(', ');
        const mainText = parts[0];
        const secondaryText = parts.slice(1, 4).join(', '); // Show next 3 parts
        const cleanAddress = `${mainText}, ${secondaryText}`;

        setInputValue(cleanAddress);
        setIsOpen(false);
        onChange?.(cleanAddress);

        onSelect({
            address: cleanAddress,
            lat: Number.parseFloat(item.lat),
            lng: Number.parseFloat(item.lon)
        });
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                {leftIcon}
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        setIsOpen(true);
                        if (inputValue.length >= 3 && suggestions.length === 0) fetchSuggestions(inputValue);
                    }}
                    placeholder={placeholder}
                    className={`${className} ${error ? '!border-[#FF4D4F] !ring-[#FF4D4F] shadow-[0_0_10px_rgba(255,77,79,0.1)] transition-all' : ''}`}
                    autoComplete="off"
                />
                {rightIcon}

                {isLoading && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin pointer-events-none"></div>
                )}
            </div>

            {isOpen && inputValue.length >= 3 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[5000] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {suggestions.length === 0 && !isLoading ? (
                        <div className="px-4 py-3 text-xs text-slate-400 font-bold text-center">No results found</div>
                    ) : (
                        suggestions.map((item) => {
                            const parts = item.display_name.split(', ');
                            const main = parts[0];
                            const secondary = parts.slice(1).join(', ');

                            return (
                                <button
                                    key={item.place_id}
                                    type="button"
                                    onClick={() => handleSelect(item)}
                                    className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center space-x-3 border-b border-slate-50 last:border-0 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 text-white text-xs shadow-sm">
                                        <svg fill="currentColor" viewBox="0 0 20 20" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs font-bold truncate text-slate-900">{main}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{secondary}</p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                    <div className="bg-slate-50 px-3 py-2 text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center space-x-1">
                        <span>Data © OpenStreetMap contributors</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationAutocomplete;
