
import { LatLng, PoolType } from '../types';
import { supabase } from '../supabaseClient';

export interface PoolRequest {
  id?: string;
  fromCoords: LatLng;
  toCoords: LatLng;
  requestTime: Date;
  poolType: PoolType;
  maxDetour: number; // km
}

export class PoolMatchingEngine {
  /**
   * Calculates distance between two points using Haversine formula (km)
   */
  private haversineDistance(coords1: LatLng, coords2: LatLng): number {
    const R = 6371; // Earth radius in km
    const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
    const dLon = (coords2.lng - coords1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Fetches road route distance from OSRM API
   */
  private async getRouteDistance(waypoints: LatLng[]): Promise<number> {
    const coordsString = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=false`);
      const data = await res.json();
      if (data?.routes?.[0]) {
        return data.routes[0].distance / 1000; // Convert meters to km
      }
    } catch (e) {
      console.warn("OSRM Route check failed, falling back to Haversine", e);
    }
    // Fallback: simple sum of haversine distances
    let dist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      dist += this.haversineDistance(waypoints[i], waypoints[i + 1]);
    }
    return dist;
  }

  /**
   * STEP 1: Find candidates within geographic proximity
   */
  async findCandidates(request: PoolRequest): Promise<any[]> {
    const PROXIMITY_RADIUS = 5; // km

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('pool_type', request.poolType)
      .in('pool_status', ['WAITING', 'FILLING'])
      .lt('pool_count', 3)
      .gte('created_at', new Date(Date.now() - 10 * 60000).toISOString()); // Last 10 mins

    if (error || !data) return [];

    return data.filter(candidate => {
      const candidateFrom = { lat: candidate.from_lat, lng: candidate.from_lng };
      return this.haversineDistance(request.fromCoords, candidateFrom) <= PROXIMITY_RADIUS;
    });
  }

  /**
   * STEP 2: Calculate overlap and detours
   */
  async evaluateMatch(req1: PoolRequest, candidate: any): Promise<{ overlap: number, detour: number }> {
    const candFrom = { lat: candidate.from_lat, lng: candidate.from_lng };
    const candTo = { lat: candidate.to_lat, lng: candidate.to_lng };

    // 1. Original distances
    const dist1 = await this.getRouteDistance([req1.fromCoords, req1.toCoords]);
    const dist2 = await this.getRouteDistance([candFrom, candTo]);

    // 2. Shared Route (A picks up B, then drops A, then drops B - order varies in real logic)
    // We test the most common pick-up order
    const combinedDist = await this.getRouteDistance([
      req1.fromCoords,
      candFrom,
      req1.toCoords,
      candTo
    ]);

    const totalIndividual = dist1 + dist2;
    const detourKm = combinedDist - Math.max(dist1, dist2);
    const overlapPercent = ((totalIndividual - combinedDist) / totalIndividual) * 100;

    return {
      overlap: overlapPercent,
      detour: detourKm
    };
  }

  private getTimingScore(request: PoolRequest, candidate: any): number {
    const candTime = new Date(candidate.created_at).getTime();
    const reqTime = request.requestTime.getTime();
    const diffMins = Math.abs(reqTime - candTime) / 60000;
    return Math.max(0, 100 - (diffMins * 10)); // Higher score for closer request times
  }

  /**
   * MAIN MATCHING LOGIC
   */
  async findBestMatch(request: PoolRequest): Promise<string | null> {
    const candidates = await this.findCandidates(request);

    let bestMatchId = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const { overlap, detour } = await this.evaluateMatch(request, candidate);

      const timeScore = this.getTimingScore(request, candidate);
      const finalScore = (overlap * 0.7) + (timeScore * 0.3);

      // Thresholds: Min 50% overlap and max defined detour
      if (
        overlap >= 50 &&
        detour <= request.maxDetour &&
        finalScore > bestScore
      ) {
        bestScore = finalScore;
        bestMatchId = candidate.id;
      }
    }

    return bestMatchId;
  }

  getPoolTimeout(poolType: PoolType): number {
    switch (poolType) {
      case PoolType.INTERCITY_POOL: return 180; // 3 mins
      case PoolType.OFFICE_POOL: return 300; // 5 mins
      case PoolType.URBAN_POOL: return 60; // 1 min
      default: return 90;
    }
  }
}

export const poolMatcher = new PoolMatchingEngine();
