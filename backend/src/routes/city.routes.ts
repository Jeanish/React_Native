import { Router } from 'express';
import City from '../models/City';
import { Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * Get all active cities
 * @route GET /api/v1/cities
 * @access Public
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { country, state } = req.query;

    const query: any = { isActive: true };

    if (country) {
      query.country = country;
    }

    if (state) {
      query.state = state;
    }

    const cities = await City.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: 'Cities retrieved successfully',
      data: cities,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get city by ID
 * @route GET /api/v1/cities/:id
 * @access Public
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const city = await City.findOne({ _id: id, isActive: true });

    if (!city) {
      res.status(404).json({ success: false, message: 'City not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'City retrieved successfully', data: city });
  } catch (error) {
    next(error);
  }
});

export default router;
