import { convexService } from '../convexService';
import { CarCategory } from '../types';
import { CAR_OPTIONS, COMMISSION_RATE } from '../constants';

export interface PricingConfig {
    baseFare: number;
    minFare: number;
    ratePerKmCity: number;      // New: Higher rate for city
    ratePerKmIntercity: number; // New: Lower rate for long distance
    ratePerMin: number;
    nightMultiplier: number;
    surgeMultiplier: number;
    waitingRate: number; // per minute
    cityRadiusKm: number; // Threshold for intercity
}

export interface FareResult {
    totalFare: number;
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeAmount: number;
    nightAmount: number;
    waitingAmount: number;
    currency: string;
    isSurgeApplied: boolean;
    isNightApplied: boolean;
    distanceKm: number;
    durationMins: number;
    driverEarnings: number;
    rateUsed: number; // Debug info
    isIntercity: boolean;
}

export class PricingEngine {

    private static readonly NIGHT_START_HOUR = 22;
    private static readonly NIGHT_END_HOUR = 6;
    private static initialized = false;

    // Default configuration fallback
    // rates: City > Intercity as per request
    private static config: Record<CarCategory, PricingConfig> = {
        [CarCategory.SEDAN]: {
            baseFare: 50,
            minFare: 100,
            ratePerKmCity: 18,
            ratePerKmIntercity: 12,
            ratePerMin: 2,
            nightMultiplier: 1.2,
            surgeMultiplier: 1,
            waitingRate: 2,
            cityRadiusKm: 50
        },
        [CarCategory.SUV]: {
            baseFare: 80,
            minFare: 150,
            ratePerKmCity: 24,
            ratePerKmIntercity: 16,
            ratePerMin: 3,
            nightMultiplier: 1.2,
            surgeMultiplier: 1,
            waitingRate: 2,
            cityRadiusKm: 50
        },
        [CarCategory.PREMIUM]: {
            baseFare: 100,
            minFare: 250,
            ratePerKmCity: 35,
            ratePerKmIntercity: 25,
            ratePerMin: 5,
            nightMultiplier: 1.3,
            surgeMultiplier: 1,
            waitingRate: 5,
            cityRadiusKm: 50
        },
        [CarCategory.MINIBUS]: {
            baseFare: 200,
            minFare: 500,
            ratePerKmCity: 40,
            ratePerKmIntercity: 30,
            ratePerMin: 5,
            nightMultiplier: 1.2,
            surgeMultiplier: 1,
            waitingRate: 5,
            cityRadiusKm: 50
        }
    };

    /**
     * Fetch pricing rules from Supabase and update local config.
     * Also subscribes to realtime updates.
     */
    static async fetchAndSyncRules() {
        if (this.initialized) return;
        try {
            // Initial Fetch
            const rules = await convexService.fetchPricingRules();
            if (rules && rules.length > 0) {
                this.updateConfigFromRules(rules);
                console.log('Pricing rules synced from Convex');
            }

            // Realtime Subscription
            convexService.subscribeToPricingUpdates((payload) => {
                console.log("Realtime pricing update received:", payload);
                if (payload.new) {
                    this.updateConfigFromRules([payload.new]);
                }
            });

            this.initialized = true;
        } catch (err) {
            console.error('Failed to sync pricing rules:', err);
        }
    }

    private static updateConfigFromRules(rules: any[]) {
        rules.forEach((rule: any) => {
            const cat = rule.car_category as CarCategory;
            if (this.config[cat]) {
                this.config[cat] = {
                    baseFare: Number(rule.base_fare),
                    minFare: Number(rule.min_fare),
                    ratePerKmCity: Number(rule.rate_per_km_city),
                    ratePerKmIntercity: Number(rule.rate_per_km_intercity),
                    ratePerMin: Number(rule.rate_per_min),
                    nightMultiplier: Number(rule.night_multiplier),
                    surgeMultiplier: Number(rule.surge_multiplier),
                    waitingRate: Number(rule.waiting_rate),
                    cityRadiusKm: Number(rule.city_radius_km || 50)
                };
            }
        });
    }

    /**
     * Determine if the ride is Local or Intercity
     */
    static isIntercity(distanceKm: number, carType: CarCategory): boolean {
        const config = this.config[carType];
        return distanceKm >= (config?.cityRadiusKm ?? 50);
    }

    /**
     * Calculate Fare
     */
    static calculateFare(
        carType: CarCategory,
        distanceKm: number,
        durationMins: number,
        tripDate: Date,
        surgeMulti = 1,
        waitingMins = 0
    ): FareResult {
        // init if not done
        if (!this.initialized) {
            this.fetchAndSyncRules();
        }

        const config = { ...this.config[carType] };

        // Logic: Intercity vs City
        const isIntercityRide = distanceKm >= config.cityRadiusKm;
        const ratePerKm = isIntercityRide ? config.ratePerKmIntercity : config.ratePerKmCity;

        const isNight = this.checkNightTime(tripDate);
        const nightMulti = isNight ? config.nightMultiplier : 1;

        const base = config.baseFare;
        const distCost = distanceKm * ratePerKm;
        const timeCost = durationMins * config.ratePerMin;
        const waitCost = waitingMins * config.waitingRate;

        // Subtotal before multipliers
        let subtotal = base + distCost + timeCost + waitCost;

        // Apply Surge
        const surgeAmount = (subtotal * surgeMulti) - subtotal;
        subtotal *= surgeMulti;

        // Apply Night
        const nightAmount = (subtotal * nightMulti) - subtotal;
        subtotal *= nightMulti;

        // Minimum Fare Check
        const total = Math.max(subtotal, config.minFare);

        return {
            totalFare: Math.round(total),
            baseFare: base,
            distanceFare: Math.round(distCost),
            timeFare: Math.round(timeCost),
            surgeAmount: Math.round(surgeAmount),
            nightAmount: Math.round(nightAmount),
            waitingAmount: Math.round(waitCost),
            currency: 'INR',
            isSurgeApplied: surgeMulti > 1,
            isNightApplied: isNight,
            distanceKm,
            durationMins,
            driverEarnings: Math.round(total * (1 - COMMISSION_RATE)),
            rateUsed: ratePerKm,
            isIntercity: isIntercityRide
        };
    }

    private static checkNightTime(date: Date): boolean {
        const hours = date.getHours();
        return hours >= this.NIGHT_START_HOUR || hours < this.NIGHT_END_HOUR;
    }
}
