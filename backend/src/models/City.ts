import mongoose, { Document, Schema } from 'mongoose';

/**
 * City Interface
 */
export interface ICity extends Document {
  name: string;
  state: string;
  country: string;
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * City Schema
 */
const citySchema = new Schema<ICity>(
  {
    name: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
      maxlength: [100, 'City name cannot exceed 100 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [100, 'State name cannot exceed 100 characters'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      default: 'India',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates are required'],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
citySchema.index({ name: 1, state: 1, country: 1 }, { unique: true });
citySchema.index({ location: '2dsphere' });
citySchema.index({ isActive: 1 });

const City = mongoose.model<ICity>('City', citySchema);

export default City;
