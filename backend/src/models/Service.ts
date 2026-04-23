import mongoose, { Document, Schema } from 'mongoose';

/**
 * Service Interface
 */
export interface IService extends Document {
  salonId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  categoryId?: mongoose.Types.ObjectId;
  price: number;
  discountedPrice?: number;
  duration: number; // in minutes
  images: Array<{
    url: string;
    publicId: string;
  }>;
  isActive: boolean;
  isAvailable: boolean;
  requirements?: string;
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
  bufferTime: number; // minutes between appointments
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service Schema
 */
const serviceSchema = new Schema<IService>(
  {
    salonId: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      required: [true, 'Salon ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      minlength: [3, 'Service name must be at least 3 characters'],
      maxlength: [100, 'Service name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountedPrice: {
      type: Number,
      min: [0, 'Discounted price cannot be negative'],
      validate: {
        validator: function (this: IService, value: number) {
          return !value || value < this.price;
        },
        message: 'Discounted price must be less than regular price',
      },
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [15, 'Duration must be at least 15 minutes'],
      max: [480, 'Duration cannot exceed 8 hours (480 minutes)'],
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    requirements: {
      type: String,
      trim: true,
      maxlength: [500, 'Requirements cannot exceed 500 characters'],
    },
    maxAdvanceBookingDays: {
      type: Number,
      default: 30,
      min: [1, 'Max advance booking must be at least 1 day'],
      max: [90, 'Max advance booking cannot exceed 90 days'],
    },
    minAdvanceBookingHours: {
      type: Number,
      default: 2,
      min: [0, 'Min advance booking cannot be negative'],
      max: [72, 'Min advance booking cannot exceed 72 hours'],
    },
    bufferTime: {
      type: Number,
      default: 15,
      min: [0, 'Buffer time cannot be negative'],
      max: [60, 'Buffer time cannot exceed 60 minutes'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
serviceSchema.index({ salonId: 1, isActive: 1 });
serviceSchema.index({ salonId: 1, name: 1 }, { unique: true });
serviceSchema.index({ categoryId: 1, isActive: 1 });

// Virtual for effective price
serviceSchema.virtual('effectivePrice').get(function () {
  return this.discountedPrice || this.price;
});

// Virtual for discount percentage
serviceSchema.virtual('discountPercentage').get(function () {
  if (this.discountedPrice && this.price > 0) {
    return Math.round(((this.price - this.discountedPrice) / this.price) * 100);
  }
  return 0;
});

// Ensure virtuals are included in JSON
serviceSchema.set('toJSON', { virtuals: true });
serviceSchema.set('toObject', { virtuals: true });

const Service = mongoose.model<IService>('Service', serviceSchema);

export default Service;
