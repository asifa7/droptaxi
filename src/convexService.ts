import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// @ts-ignore
const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://unique-marten-871.convex.cloud";
export const convexClient = new ConvexClient(convexUrl);

const stringifyError = (err: any): string => {
    if (!err) return "Unknown database error";
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    return String(err);
};

export const convexService = {
    async fetchPricingRules() {
        try {
            const data = await convexClient.query(api.pricing.fetchPricingRules, {});
            return data.length > 0 ? data : null;
        } catch (e) {
            console.warn("Could not fetch pricing rules", e);
            return null;
        }
    },

    subscribeToPricingUpdates(callback: (payload: any) => void) {
        return convexClient.onUpdate(api.pricing.fetchPricingRules, {}, (newData) => {
            if (newData && newData.length > 0) {
                newData.forEach(rule => {
                    callback({ new: rule });
                });
            }
        });
    },

    async getPendingRides() {
        return await convexClient.query(api.bookings.getPendingRides, {});
    },

    async findMatchingPool(fromLat: number, fromLng: number, poolType: string) {
        return await convexClient.query(api.bookings.findMatchingPool, { poolType });
    },

    async joinPool(id: any) {
        return await convexClient.mutation(api.bookings.joinPool, { id });
    },

    async createRideRequest(booking: any) {
        const isPool = booking.poolType !== 'SOLO';
        const payload: any = {
            from_name: booking.from,
            to_name: booking.to,
            from_lat: booking.fromCoords?.lat ?? null,
            from_lng: booking.fromCoords?.lng ?? null,
            to_lat: booking.toCoords?.lat ?? null,
            to_lng: booking.toCoords?.lng ?? null,
            distance_km: booking.distanceKm ?? 0,
            trip_type: booking.tripType || 'ONE_WAY',
            fare_amount: booking.fareAmount ?? 0,
            market_min_fare: booking.marketMinFare ?? 0,
            market_max_fare: booking.marketMaxFare ?? 0,
            car_category: String(booking.carCategory || 'SEDAN'),
            phone: booking.phone || '',
            trip_date: booking.date || '',
            trip_time: booking.time || '',
            pool_type: booking.poolType,
        };

        // returns ID instead of row in convex
        const newId = await convexClient.mutation(api.bookings.createRideRequest, payload);
        // Let's fetch the new ride
        return await convexClient.query(api.bookings.getBookingStatus, { id: newId });
    },

    async acceptRide(id: any, driverPhone: string, driverId?: string, driverName?: string, vehicleNumber?: string, vehicleModel?: string) {
        return await convexClient.mutation(api.bookings.acceptRide, {
            id,
            driver_phone: driverPhone,
            driver_id: driverId,
            driver_name: driverName,
            vehicle_number: vehicleNumber,
            vehicle_model: vehicleModel,
        });
    },

    async markDriverEnRoute(id: any) {
        return await convexClient.mutation(api.bookings.updateStatus, { id, status: 'DRIVER_EN_ROUTE' });
    },

    async markDriverArrived(id: any) {
        return await convexClient.mutation(api.bookings.updateStatus, { id, status: 'DRIVER_ARRIVED' });
    },

    async cancelBooking(id: any, _reason?: string) {
        return await convexClient.mutation(api.bookings.deleteBooking, { id });
    },

    async deleteBooking(id: any) {
        return await convexClient.mutation(api.bookings.deleteBooking, { id });
    },

    async startRide(id: any) {
        return await convexClient.mutation(api.bookings.updateStatus, { id, status: 'IN_PROGRESS' });
    },

    async completeRide(id: any, finalFare: number, distanceKm: number) {
        return await convexClient.mutation(api.bookings.completeRide, { id, final_fare: finalFare, final_distance_km: distanceKm });
    },

    async getRiderHistory(userId: string, limit = 20) {
        return await convexClient.query(api.bookings.getRiderHistory, { userId, limit });
    },

    async getDriverHistory(driverId: string, limit = 20) {
        return await convexClient.query(api.bookings.getDriverHistory, { driverId, limit });
    },

    async initiatePaymentVerification(bookingId: any, amount: number) {
        return await convexClient.mutation(api.payments.initiatePaymentVerification, { bookingId: bookingId, amount });
    },

    async confirmPayment(bookingId: any, role: 'USER' | 'DRIVER', txRef?: string) {
        return await convexClient.mutation(api.payments.confirmPayment, { bookingId: bookingId, role, txRef });
    },

    async submitRating(rating: any) {
        return await convexClient.mutation(api.payments.submitRating, {
            bookingId: rating.bookingId,
            ratedBy: rating.ratedBy,
            ratedUserId: rating.ratedUserId,
            stars: rating.stars,
            tags: rating.tags || [],
            comment: rating.comment,
        });
    },

    async getWalletDetails(phone: string) {
        return await convexClient.query(api.wallets.getWalletDetails, { phone });
    },

    async toggleDriverStatus(phone: string, isOnline: boolean) {
        return await convexClient.mutation(api.wallets.toggleDriverStatus, { phone, is_online: isOnline });
    },

    async getTransactions(phone: string) {
        return await convexClient.query(api.wallets.getTransactions, { phone });
    },

    async getBookingStatus(id: any) {
        return await convexClient.query(api.bookings.getBookingStatus, { id });
    },

    async getActiveBooking(userId?: string, phone?: string) {
        return await convexClient.query(api.bookings.getActiveBooking, { userId, phone });
    },

    async requestWithdrawal(phone: string, amount: number, upiId: string) {
        return await convexClient.mutation(api.wallets.requestWithdrawal, { phone, amount, upi_id: upiId });
    },

    async sendOTP(phone: string) {
        console.log(`Sending demo OTP to ${phone}. Any 6 digits will work!`);
        return true;
    },

    async verifyOTP(phone: string, otp: string) {
        console.log(`Verifying demo OTP ${otp} for ${phone}`);
        const session = { user: { phone, id: `user_${phone}` } };
        localStorage.setItem('demo_user_session', JSON.stringify(session));
        return session;
    },

    async signOut() {
        localStorage.removeItem('demo_user_session');
        window.location.reload();
    },

    async getSession() {
        const stored = localStorage.getItem('demo_user_session');
        if (stored) {
            return { data: { session: JSON.parse(stored) } };
        }
        return { data: { session: null } };
    }
};
