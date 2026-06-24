import mongoose, { Document, Schema } from 'mongoose';

/**
 * Appointment Status Enum
 */
export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no-show',
}

/**
 * Appointment Service Interface
 */
export interface IAppointmentService {
  serviceId: mongoose.Types.ObjectId;
  serviceName: string;
  price: number;
  duration: number;
}

/**
 * Appointment Interface
 */
export interface IAppointment extends Document {
  appointmentNumber: string;
  salonId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  services: IAppointmentService[];
  appointmentDate: Date;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  totalDuration: number; // in minutes
  totalPrice: number;
  status: AppointmentStatus;
  cancellationReason?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  notes?: string; // Customer notes
  salonNotes?: string; // Internal salon notes
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Appointment Schema
 */
const appointmentSchema = new Schema<IAppointment>(
  {
    appointmentNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    salonId: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      required: [true, 'Salon ID is required'],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    services: [
      {
        serviceId: {
          type: Schema.Types.ObjectId,
          ref: 'Service',
          required: true,
        },
        serviceName: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        duration: {
          type: Number,
          required: true,
          min: 15,
        },
      },
    ],
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    totalDuration: {
      type: Number,
      required: true,
      min: 15,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.PENDING,
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    salonNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Salon notes cannot exceed 1000 characters'],
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
appointmentSchema.index({ salonId: 1, appointmentDate: 1, status: 1 });
appointmentSchema.index({ customerId: 1, status: 1 });
appointmentSchema.index({ customerId: 1, appointmentDate: 1 });
appointmentSchema.index({ salonId: 1, status: 1, appointmentDate: 1 });

// Pre-save hook to generate appointment number
appointmentSchema.pre('save', async function (next) {
  if (this.isNew && !this.appointmentNumber) {
    // Generate unique appointment number: APT-YYYYMMDD-XXXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(10000 + Math.random() * 90000);
    this.appointmentNumber = `APT-${dateStr}-${random}`;
    
    // Check if appointment number already exists (very rare)
    const exists = await mongoose.model('Appointment').findOne({
      appointmentNumber: this.appointmentNumber,
    });
    
    if (exists) {
      // Generate a new one with timestamp
      this.appointmentNumber = `APT-${dateStr}-${Date.now().toString().slice(-5)}`;
    }
  }
  next();
});

// Helper to calculate exact UTC Date from stored IST appointment date & start/end time
function getApptDateTime(appointmentDate: Date, timeStr: string): Date {
  const d = new Date(appointmentDate);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const dateVal = d.getUTCDate();
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Construct UTC time for the IST hour/min, then subtract 5.5 hours to get the absolute UTC time
  const utcMillis = Date.UTC(year, month, dateVal, hours, minutes, 0, 0);
  return new Date(utcMillis - 330 * 60 * 1000); // 330 mins = 5.5 hours
}

// Virtual for appointment date-time
appointmentSchema.virtual('appointmentDateTime').get(function () {
  return getApptDateTime(this.appointmentDate, this.startTime);
});

// Virtual for end date-time
appointmentSchema.virtual('endDateTime').get(function () {
  return getApptDateTime(this.appointmentDate, this.endTime);
});

// Virtual for is past
appointmentSchema.virtual('isPast').get(function () {
  return getApptDateTime(this.appointmentDate, this.startTime) < new Date();
});

// Virtual for is upcoming (within next 24 hours)
appointmentSchema.virtual('isUpcoming').get(function () {
  const now = new Date();
  const apptTime = getApptDateTime(this.appointmentDate, this.startTime);
  return apptTime > now && apptTime < new Date(now.getTime() + 24 * 60 * 60 * 1000);
});

// Virtual for can cancel (at least 24 hours before appointment)
appointmentSchema.virtual('canCancel').get(function () {
  if (this.status !== AppointmentStatus.PENDING && this.status !== AppointmentStatus.CONFIRMED) {
    return false;
  }
  const apptTime = getApptDateTime(this.appointmentDate, this.startTime);
  const hoursDifference = (apptTime.getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursDifference >= 24;
});

// Ensure virtuals are included in JSON
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);

export default Appointment;
