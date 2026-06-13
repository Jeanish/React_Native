/**
 * Cities API — list of cities where TrimCity is currently active.
 * The admin manages this list from the web panel; the mobile app uses it to:
 *  - Show users a city dropdown / "where we serve" list
 *  - Filter salons to only ones inside an active service area
 */
import apiClient from './client';
import type { ServiceResult } from '../../types';

export interface ApiCity {
  _id: string;
  name: string;
  state: string;
  country?: string;
  isActive: boolean;
}

export async function fetchActiveCities(): Promise<ServiceResult<ApiCity[]>> {
  try {
    const res = await apiClient.get('/cities');
    return { data: res.data.data ?? [] };
  } catch (err: any) {
    console.error('[CityAPI] fetchActiveCities error:', err?.response?.data ?? err?.message);
    return { error: err?.response?.data?.message ?? 'Failed to load cities.' };
  }
}
