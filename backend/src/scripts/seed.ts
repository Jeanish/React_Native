/**
 * TrimCity — MongoDB Seed Script
 *
 * Seeds: 1 super-admin, 1 salon owner, 5 Pune salons, services, 3 customers, sample appointments.
 *
 * Usage:
 *   cd backend
 *   npx ts-node src/scripts/seed.ts              # seed everything
 *   npx ts-node src/scripts/seed.ts --clear       # drop all seeded data first
 *   npx ts-node src/scripts/seed.ts --admin <phone> # promote phone user to super_admin
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── Minimal env check ───────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI || MONGODB_URI.includes('username:password')) {
  console.error('\n❌  MONGODB_URI is not set or still has placeholder values.');
  console.error('    Update MONGODB_URI in backend/.env with your MongoDB Atlas connection string.\n');
  process.exit(1);
}

// ─── Inline schemas (avoid triggering full environment.ts validation) ─────────

const serviceSchema = new mongoose.Schema(
  {
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 15 },
    images: { type: Array, default: [] },
    isActive: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    maxAdvanceBookingDays: { type: Number, default: 30 },
    minAdvanceBookingHours: { type: Number, default: 2 },
    bufferTime: { type: Number, default: 15 },
  },
  { timestamps: true }
);

const salonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    phone: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    images: { type: Array, default: [] },
    workingHours: [
      {
        day: { type: Number, min: 0, max: 6 }, // 0=Sun
        openTime: { type: String },
        closeTime: { type: String },
        isClosed: { type: Boolean, default: false },
      },
    ],
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'approved' },
    rating: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
    isActive: { type: Boolean, default: true },
    totalSeats: { type: Number, default: 4 },
    seatedNow: { type: Number, default: 0 },
    waitingNow: { type: Number, default: 0 },
    isOpen: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
    category: { type: String, enum: ['men', 'women', 'unisex'], default: 'unisex' },
  },
  { timestamps: true }
);
salonSchema.index({ location: '2dsphere' });

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true, sparse: true },
    email: { type: String, lowercase: true, trim: true, sparse: true },
    password: { type: String, select: false },
    role: { type: String, enum: ['customer', 'salon_owner', 'salon_admin', 'super_admin'], default: 'customer' },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon' },
  },
  { timestamps: true }
);

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: { type: String, unique: true },
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    services: [
      {
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
        serviceName: { type: String, required: true },
        price: { type: Number, required: true },
        duration: { type: Number, required: true },
      },
    ],
    appointmentDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    totalDuration: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
      default: 'confirmed',
    },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Models ───────────────────────────────────────────────────────────────────
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Salon = mongoose.models.Salon || mongoose.model('Salon', salonSchema);
const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);
const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

// ─── Working hours helper ─────────────────────────────────────────────────────
function workingHours(closeSunday = true) {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    openTime: day === 0 && !closeSunday ? '10:00' : '09:00',
    closeTime: day === 6 ? '20:00' : day === 0 ? '18:00' : '21:00',
    isClosed: day === 0 && closeSunday,
  }));
}

// ─── Salon definitions ────────────────────────────────────────────────────────
const SALONS_DATA = [
  {
    name: 'Raj Hair Studio',
    description: 'Top-rated men\'s salon in Koregaon Park, Pune.',
    phone: '9876543210',
    email: 'raj@trimcity.in',
    address: { street: 'Shop 12, North Main Road', city: 'Pune', state: 'Maharashtra', zipCode: '411001', country: 'India' },
    location: { type: 'Point' as const, coordinates: [73.8938, 18.5362] as [number, number] },
    category: 'men' as const,
    totalSeats: 4,
    seatedNow: 2,
    waitingNow: 1,
    rating: { average: 4.8, count: 124 },
    isOpen: true,
    isVerified: true,
    workingHours: workingHours(true),
    services: [
      { name: 'Haircut', price: 200, duration: 30, description: 'Classic scissor cut' },
      { name: 'Beard Trim', price: 100, duration: 20, description: 'Shaping & grooming' },
      { name: 'Hair + Beard Combo', price: 280, duration: 45, description: 'Best value combo' },
      { name: 'Head Massage', price: 80, duration: 15, description: 'Relaxing oil massage' },
      { name: 'Hair Colour', price: 500, duration: 60, description: 'Global colour treatment' },
    ],
  },
  {
    name: 'Glamour Ladies Parlour',
    description: 'Premier ladies beauty parlour in Shivajinagar.',
    phone: '9823456789',
    email: 'glamour@trimcity.in',
    address: { street: '2nd Floor, Fergusson College Road', city: 'Pune', state: 'Maharashtra', zipCode: '411004', country: 'India' },
    location: { type: 'Point' as const, coordinates: [73.8452, 18.5155] as [number, number] },
    category: 'women' as const,
    totalSeats: 3,
    seatedNow: 3,
    waitingNow: 2,
    rating: { average: 4.5, count: 89 },
    isOpen: true,
    isVerified: true,
    workingHours: workingHours(false),
    services: [
      { name: 'Haircut & Styling', price: 350, duration: 45, description: 'Wash, cut & blow dry' },
      { name: 'Facial', price: 600, duration: 60, description: 'Deep cleansing facial' },
      { name: 'Threading (Full Face)', price: 80, duration: 20, description: 'Eyebrow + upper lip + forehead' },
      { name: 'Waxing (Arms)', price: 200, duration: 30, description: 'Full arm waxing' },
      { name: 'Manicure', price: 300, duration: 40, description: 'Classic manicure with nail paint' },
      { name: 'Pedicure', price: 350, duration: 50, description: 'Classic pedicure with massage' },
    ],
  },
  {
    name: 'Unicut Family Salon',
    description: 'Family salon serving men, women and kids in Kothrud.',
    phone: '9765432109',
    email: 'unicut@trimcity.in',
    address: { street: 'Ground Floor, Paud Road', city: 'Pune', state: 'Maharashtra', zipCode: '411038', country: 'India' },
    location: { type: 'Point' as const, coordinates: [73.8072, 18.5074] as [number, number] },
    category: 'unisex' as const,
    totalSeats: 6,
    seatedNow: 1,
    waitingNow: 0,
    rating: { average: 4.2, count: 67 },
    isOpen: true,
    isVerified: true,
    workingHours: workingHours(true),
    services: [
      { name: "Men's Haircut", price: 180, duration: 30, description: 'Standard men\'s cut' },
      { name: "Women's Haircut", price: 300, duration: 40, description: 'Women\'s cut & styling' },
      { name: 'Kids Haircut', price: 120, duration: 20, description: 'Under 12 years' },
      { name: 'Beard Shaping', price: 100, duration: 20, description: 'Precise beard shaping' },
      { name: 'Hair Spa', price: 700, duration: 60, description: 'Nourishing hair spa treatment' },
    ],
  },
  {
    name: "The Barber's Den",
    description: 'Premium grooming studio for men in Viman Nagar.',
    phone: '9834567890',
    email: 'barbers@trimcity.in',
    address: { street: 'Shop 4, Sakore Nagar', city: 'Pune', state: 'Maharashtra', zipCode: '411014', country: 'India' },
    location: { type: 'Point' as const, coordinates: [73.9143, 18.5679] as [number, number] },
    category: 'men' as const,
    totalSeats: 4,
    seatedNow: 0,
    waitingNow: 0,
    rating: { average: 4.6, count: 203 },
    isOpen: false,
    isVerified: true,
    workingHours: workingHours(true),
    services: [
      { name: 'Classic Haircut', price: 220, duration: 30, description: 'Clean classic cut' },
      { name: 'Hot Towel Shave', price: 180, duration: 30, description: 'Traditional hot towel shave' },
      { name: 'Premium Grooming', price: 500, duration: 60, description: 'Cut + shave + styling combo' },
      { name: 'Hair Wash', price: 100, duration: 20, description: 'Shampoo + conditioning wash' },
    ],
  },
  {
    name: 'Silk Touch Beauty Studio',
    description: 'Modern beauty studio for women near Balewadi.',
    phone: '9712345678',
    email: 'silktouch@trimcity.in',
    address: { street: 'D-Wing, Baner Road, Near Balewadi', city: 'Pune', state: 'Maharashtra', zipCode: '411045', country: 'India' },
    location: { type: 'Point' as const, coordinates: [73.7878, 18.5599] as [number, number] },
    category: 'women' as const,
    totalSeats: 5,
    seatedNow: 2,
    waitingNow: 0,
    rating: { average: 3.9, count: 41 },
    isOpen: true,
    isVerified: true,
    workingHours: workingHours(false),
    services: [
      { name: 'Hair Trim', price: 280, duration: 30, description: 'Trim & blow dry' },
      { name: 'Blow Dry & Styling', price: 400, duration: 40, description: 'Professional blow dry' },
      { name: 'Basic Facial', price: 500, duration: 45, description: 'Cleansing facial with massage' },
      { name: 'Eyebrow Threading', price: 40, duration: 15, description: 'Eyebrow shaping' },
      { name: 'Full Body Waxing', price: 1200, duration: 90, description: 'Full body Rica waxing' },
    ],
  },
];

// ─── Clear seeded data ────────────────────────────────────────────────────────
async function clearSeedData(): Promise<void> {
  console.log('\n🗑  Clearing existing seed data…');
  const [s, sv, a, u] = await Promise.all([
    Salon.deleteMany({ isVerified: true }),
    Service.deleteMany({}),
    Appointment.deleteMany({}),
    User.deleteMany({ phone: { $in: ['0000000001', '9810001111', '9810002222', '9810003333', '9876543210', '9823456789', '9765432109', '9834567890', '9712345678'] } }),
  ]);
  console.log(`   Deleted ${s.deletedCount} salons, ${sv.deletedCount} services, ${a.deletedCount} appointments, ${u.deletedCount} seed users`);
}

function apptNumber(): string {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `APT-${d}-${Math.floor(10000 + Math.random() * 90000)}`;
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ─── Main seed ────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  const adminIndex = args.indexOf('--admin');
  const adminPhone = adminIndex !== -1 ? args[adminIndex + 1] : null;

  console.log('\n🚀  TrimCity MongoDB Seed Script');
  console.log(`    DB: ${MONGODB_URI!.replace(/\/\/.*@/, '//<credentials>@')}\n`);

  await mongoose.connect(MONGODB_URI!, { maxPoolSize: 5 });
  console.log('✅  Connected to MongoDB');

  if (shouldClear) {
    await clearSeedData();
  }

  // 1. Seed admin user
  console.log('\n👤  Seeding users…');
  const ADMIN_EMAIL = 'admin@trimcity.in';
  const ADMIN_PASSWORD = 'Admin@1234';
  let adminUser = await User.findOne({ email: ADMIN_EMAIL });
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    adminUser = await User.create({
      phone: '0000000001',
      email: ADMIN_EMAIL,
      password: hashedPassword,
      firstName: 'TrimCity',
      lastName: 'Admin',
      role: 'super_admin',
      isPhoneVerified: true,
      isEmailVerified: true,
    });
    console.log('   ✓ super_admin  email: admin@trimcity.in  password: Admin@1234');
  } else {
    console.log('   – super_admin already exists (admin@trimcity.in)');
  }

  // 2. Seed one salon owner per salon — each owner's phone matches the salon's contact phone.
  // This lets a tester log in as any salon's owner just by entering that salon's phone.
  const ownersBySalonPhone = new Map<string, mongoose.Types.ObjectId>();
  const ownerPasswordHash = await bcrypt.hash('DevPassword@1234', 12);
  for (const def of SALONS_DATA) {
    let owner = await User.findOne({ phone: def.phone });
    if (!owner) {
      owner = await User.create({
        phone: def.phone,
        email: `owner-${def.phone}@trimcity.local`,
        password: ownerPasswordHash,
        firstName: def.name.split(' ')[0],
        lastName: 'Owner',
        role: 'salon_admin',
        isPhoneVerified: true,
      });
      console.log(`   ✓ owner for ${def.name}  (phone: ${def.phone})`);
    } else if (owner.role !== 'salon_admin') {
      owner.role = 'salon_admin';
      if (!owner.email) owner.email = `owner-${def.phone}@trimcity.local`;
      if (!owner.password) owner.password = ownerPasswordHash;
      await owner.save();
      console.log(`   ↻ promoted existing user to owner for ${def.name}`);
    }
    ownersBySalonPhone.set(def.phone, owner._id as mongoose.Types.ObjectId);
  }

  // 3. Seed customer users
  const customerPhones = ['9810001111', '9810002222', '9810003333'];
  const customerNames = [
    { firstName: 'Arjun', lastName: 'Sharma' },
    { firstName: 'Priya', lastName: 'Mehta' },
    { firstName: 'Sneha', lastName: 'Joshi' },
  ];
  const customerIds: mongoose.Types.ObjectId[] = [];
  for (let i = 0; i < customerPhones.length; i++) {
    let c = await User.findOne({ phone: customerPhones[i] });
    if (!c) {
      c = await User.create({
        phone: customerPhones[i],
        role: 'customer',
        isPhoneVerified: true,
        ...customerNames[i],
      });
      console.log(`   ✓ customer     (phone: ${customerPhones[i]}) — ${customerNames[i].firstName}`);
    } else {
      console.log(`   – customer ${customerPhones[i]} already exists, skipping`);
    }
    customerIds.push(c._id as mongoose.Types.ObjectId);
  }

  // 4. Seed salons + services
  console.log('\n🏪  Seeding salons & services…');
  const salonIds: mongoose.Types.ObjectId[] = [];
  const serviceIdsBySalon: mongoose.Types.ObjectId[][] = [];

  for (const def of SALONS_DATA) {
    const { services: serviceDefs, ...salonData } = def;

    let salon = await Salon.findOne({ name: def.name });
    const ownerId = ownersBySalonPhone.get(def.phone)!;
    if (!salon) {
      salon = await Salon.create({ ...salonData, ownerId, status: 'approved' });
      console.log(`   ✓ ${def.name}`);
    } else if (salon.ownerId.toString() !== ownerId.toString()) {
      salon.ownerId = ownerId;
      await salon.save();
      console.log(`   ↻ reassigned owner for ${def.name}`);
    } else {
      console.log(`   – ${def.name} already exists, skipping`);
    }
    salonIds.push(salon._id as mongoose.Types.ObjectId);

    // Services
    const svcIds: mongoose.Types.ObjectId[] = [];
    for (const svcDef of serviceDefs) {
      let svc = await Service.findOne({ salonId: salon._id, name: svcDef.name });
      if (!svc) {
        svc = await Service.create({ ...svcDef, salonId: salon._id });
      }
      svcIds.push(svc._id as mongoose.Types.ObjectId);
    }
    serviceIdsBySalon.push(svcIds);
  }

  // 5. Seed sample appointments
  console.log('\n📋  Seeding appointments…');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const apptDefs = [
    { salonIdx: 0, svcIdx: 0, customerIdx: 0, startTime: '10:00', status: 'confirmed' },
    { salonIdx: 0, svcIdx: 2, customerIdx: 1, startTime: '11:00', status: 'confirmed' },
    { salonIdx: 1, svcIdx: 1, customerIdx: 2, startTime: '09:30', status: 'confirmed' },
    { salonIdx: 2, svcIdx: 0, customerIdx: 0, startTime: '12:00', status: 'pending' },
    { salonIdx: 1, svcIdx: 0, customerIdx: 1, startTime: '14:00', status: 'pending' },
  ];

  for (const a of apptDefs) {
    const salon = await Salon.findById(salonIds[a.salonIdx]);
    const svc = await Service.findById(serviceIdsBySalon[a.salonIdx][a.svcIdx]);
    if (!salon || !svc) continue;

    const existing = await Appointment.findOne({
      salonId: salonIds[a.salonIdx],
      customerId: customerIds[a.customerIdx],
      startTime: a.startTime,
      appointmentDate: today,
    });
    if (existing) {
      console.log(`   – appointment ${a.startTime} already exists, skipping`);
      continue;
    }

    await Appointment.create({
      appointmentNumber: apptNumber(),
      salonId: salonIds[a.salonIdx],
      customerId: customerIds[a.customerIdx],
      services: [{ serviceId: svc._id, serviceName: svc.name, price: svc.price, duration: svc.duration }],
      appointmentDate: today,
      startTime: a.startTime,
      endTime: addMinutes(a.startTime, svc.duration),
      totalDuration: svc.duration,
      totalPrice: svc.price,
      status: a.status,
    });
    console.log(`   ✓ ${salon.name} — ${svc.name} @ ${a.startTime} (${a.status})`);
  }

  // 6. Promote to admin if requested
  if (adminPhone) {
    const target = await User.findOne({ phone: adminPhone });
    if (!target) {
      console.error(`\n❌  No user found with phone: ${adminPhone}`);
      console.error('    The user must log in at least once before being promoted.\n');
    } else {
      await User.updateOne({ _id: target._id }, { role: 'super_admin' });
      console.log(`\n🛡  Promoted ${adminPhone} to super_admin`);
    }
  }

  console.log('\n✅  Seed complete!\n');
  console.log('   Super Admin  phone: 0000000001');
  console.log('   Salon Owners (one per salon):');
  SALONS_DATA.forEach(s => console.log(`     • ${s.phone} → ${s.name}`));
  console.log('   Customer 1   phone: 9810001111 (Arjun Sharma)');
  console.log('   Customer 2   phone: 9810002222 (Priya Mehta)');
  console.log('   Customer 3   phone: 9810003333 (Sneha Joshi)\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
