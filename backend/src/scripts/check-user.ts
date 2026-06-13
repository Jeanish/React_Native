import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { User } from '../models/User';
import Salon from '../models/Salon';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  const phone = process.argv[2] ?? '8529637418';
  const users = await User.find({ phone }).lean();
  console.log(`\nUsers with phone ${phone}:`, JSON.stringify(users.map(u => ({ _id: u._id, phone: u.phone, role: u.role, email: u.email })), null, 2));
  for (const u of users) {
    const salons = await Salon.find({ ownerId: u._id }).lean();
    console.log(`Salons owned by ${u._id}:`, salons.map((s: any) => ({ _id: s._id, name: s.name, status: s.status })));
  }
  console.log('\nAll salons:');
  const all = await Salon.find({}).select('name status ownerId').lean();
  all.forEach((s: any) => console.log(`  ${s.name.padEnd(30)} status=${s.status} ownerId=${String(s.ownerId)}`));
  process.exit(0);
})();
