
// Minimal type definitions for Google Maps Autocomplete to satisfy TypeScript
declare namespace google.maps.places {
    class AutocompleteService {
        getPlacePredictions(
            request: any,
            callback: (results: AutocompletePrediction[] | null, status: string) => void
        ): void;
    }

    class PlacesService {
        constructor(attrContainer: HTMLDivElement | Map<any, any>);
        getDetails(
            request: any,
            callback: (result: any, status: string) => void
        ): void;
    }

    class PlacesServiceStatus {
        static OK: string;
    }

    interface AutocompletePrediction {
        place_id: string;
        description: string;
        structured_formatting: {
            main_text: string;
            secondary_text: string;
        };
    }
}

interface Window {
    google: any;
}
