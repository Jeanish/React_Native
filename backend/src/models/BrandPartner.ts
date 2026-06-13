import mongoose, { Document, Schema } from 'mongoose';

export interface IBrandProduct {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  imageUrl?: string;
  mrp: number;
  partnerPrice: number;
  customerDiscountPercent: number;
  isActive: boolean;
}

export interface IBrandPartner extends Document {
  name: string;
  logo?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  products: IBrandProduct[];
  eligibleCategories: ('men' | 'women' | 'unisex')[];
  eligibleSalonIds: mongoose.Types.ObjectId[];
  isAllSalonsEligible: boolean;
  commissionPercent: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const brandProductSchema = new Schema<IBrandProduct>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  imageUrl: { type: String },
  mrp: { type: Number, required: true, min: 0 },
  partnerPrice: { type: Number, required: true, min: 0 },
  customerDiscountPercent: { type: Number, required: true, min: 0, max: 100 },
  isActive: { type: Boolean, default: true },
});

const brandPartnerSchema = new Schema<IBrandPartner>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    logo: { type: String },
    description: { type: String, trim: true, maxlength: 500 },
    website: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    products: [brandProductSchema],
    eligibleCategories: {
      type: [String],
      enum: ['men', 'women', 'unisex'],
      default: ['men', 'women', 'unisex'],
    },
    eligibleSalonIds: [{ type: Schema.Types.ObjectId, ref: 'Salon' }],
    isAllSalonsEligible: { type: Boolean, default: true },
    commissionPercent: { type: Number, default: 10, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

brandPartnerSchema.index({ isActive: 1 });
brandPartnerSchema.index({ name: 1 });

const BrandPartner = mongoose.model<IBrandPartner>('BrandPartner', brandPartnerSchema);
export default BrandPartner;
