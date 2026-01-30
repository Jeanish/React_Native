import Salon, { ISalon } from '../models/Salon';
import { FilterQuery } from 'mongoose';

/**
 * Search Options Interface
 */
export interface SearchOptions {
  search?: string;
  city?: string;
  categoryId?: string;
  status?: string;
  minRating?: number;
  latitude?: number;
  longitude?: number;
  maxDistance?: number; // in meters
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search salons with filters
 */
export const searchSalons = async (options: SearchOptions) => {
  const {
    search,
    city,
    categoryId,
    status = 'approved',
    minRating,
    latitude,
    longitude,
    maxDistance = 10000, // 10km default
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Build query
  const query: FilterQuery<ISalon> = {
    isActive: true,
    status,
  };

  // Text search
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'address.street': { $regex: search, $options: 'i' } },
    ];
  }

  // City filter
  if (city) {
    query['address.city'] = { $regex: city, $options: 'i' };
  }

  // Category filter
  if (categoryId) {
    query.categoryId = categoryId;
  }

  // Rating filter
  if (minRating) {
    query['rating.average'] = { $gte: minRating };
  }

  // Geospatial search
  if (latitude && longitude) {
    query.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    };
  }

  // Pagination
  const skip = (page - 1) * limit;

  // Sort
  const sort: any = {};
  if (sortBy === 'distance' && latitude && longitude) {
    // Distance sorting is handled by $near
  } else if (sortBy === 'rating') {
    sort['rating.average'] = sortOrder === 'asc' ? 1 : -1;
  } else {
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  }

  // Execute query
  const salons = await Salon.find(query)
    .populate('ownerId', 'firstName lastName email phone')
    .populate('categoryId', 'name slug icon')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  // Get total count
  const total = await Salon.countDocuments(query);

  return {
    salons,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get nearby salons
 */
export const getNearbySalons = async (
  latitude: number,
  longitude: number,
  maxDistance: number = 5000, // 5km default
  limit: number = 10
) => {
  const salons = await Salon.find({
    isActive: true,
    status: 'approved',
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
  })
    .populate('ownerId', 'firstName lastName')
    .populate('categoryId', 'name slug icon')
    .limit(limit)
    .lean();

  return salons;
};

/**
 * Get popular salons (by rating)
 */
export const getPopularSalons = async (limit: number = 10) => {
  const salons = await Salon.find({
    isActive: true,
    status: 'approved',
    'rating.count': { $gte: 5 }, // At least 5 ratings
  })
    .populate('ownerId', 'firstName lastName')
    .populate('categoryId', 'name slug icon')
    .sort({ 'rating.average': -1, 'rating.count': -1 })
    .limit(limit)
    .lean();

  return salons;
};

export default {
  searchSalons,
  getNearbySalons,
  getPopularSalons,
};
