import mongoose, { Document, Schema } from 'mongoose';

/**
 * Salon Interface
 */
export interface ISalon extends Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId;
  phone: string;
  email?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  images: Array<{
    url: string;
    publicId: string;
    isPrimary: boolean;
  }>;
  workingHours: Array<{
    day: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    openTime: string; // Format: "HH:MM" (24-hour)
    closeTime: string; // Format: "HH:MM" (24-hour)
    isClosed: boolean;
  }>;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rating: {
    average: number;
    count: number;
  };
  isActive: boolean;
  rejectionReason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Salon Schema
 */
const salonSchema = new Schema<ISalon>(
  {
    name: {
      type: String,
      required: [true, 'Salon name is required'],
      trim: true,
      maxlength: [100, 'Salon name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
      },
      zipCode: {
        type: String,
        required: [true, 'Zip code is required'],
        trim: true,
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
        default: 'USA',
      },
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
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    workingHours: [
      {
        day: {
          type: Number,
          required: true,
          min: 0,
          max: 6,
        },
        openTime: {
          type: String,
          required: true,
          match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        },
        closeTime: {
          type: String,
          required: true,
          match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        },
        isClosed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
salonSchema.index({ location: '2dsphere' });
salonSchema.index({ ownerId: 1 });
salonSchema.index({ status: 1 });
salonSchema.index({ categoryId: 1 });
salonSchema.index({ 'address.city': 1, status: 1 });
salonSchema.index({ 'rating.average': -1 });
salonSchema.index({ isActive: 1, status: 1 });

// Virtual for full address
salonSchema.virtual('fullAddress').get(function () {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}, ${this.address.country}`;
});

// Ensure virtuals are included in JSON
salonSchema.set('toJSON', { virtuals: true });
salonSchema.set('toObject', { virtuals: true });

const Salon = mongoose.model<ISalon>('Salon', salonSchema);

export default Salon;
