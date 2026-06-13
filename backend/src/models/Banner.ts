import mongoose, { Document, Schema } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaText?: string;
  ctaLink?: string;
  targetType: 'all' | 'category' | 'city' | 'salon';
  targetId?: mongoose.Types.ObjectId;
  discountPercent?: number;
  discountCode?: string;
  brandId?: mongoose.Types.ObjectId;
  priority: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  impressions: number;
  clicks: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    subtitle: { type: String, trim: true, maxlength: 200 },
    imageUrl: { type: String, required: true },
    ctaText: { type: String, trim: true, maxlength: 50 },
    ctaLink: { type: String, trim: true },
    targetType: {
      type: String,
      enum: ['all', 'category', 'city', 'salon'],
      default: 'all',
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId },
    discountPercent: { type: Number, min: 0, max: 100 },
    discountCode: { type: String, trim: true, uppercase: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'BrandPartner' },
    priority: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

bannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
bannerSchema.index({ targetType: 1, targetId: 1 });
bannerSchema.index({ priority: -1 });

bannerSchema.virtual('isLive').get(function () {
  const now = new Date();
  return this.isActive && this.startDate <= now && this.endDate >= now;
});

bannerSchema.virtual('ctr').get(function () {
  return this.impressions > 0 ? ((this.clicks / this.impressions) * 100).toFixed(2) : '0.00';
});

bannerSchema.set('toJSON', { virtuals: true });

const Banner = mongoose.model<IBanner>('Banner', bannerSchema);
export default Banner;
