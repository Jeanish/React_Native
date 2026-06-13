/**
 * Repair salons whose ownerId points to a deleted user.
 * Strategy: if salon.phone matches an existing user's phone, reassign to that user.
 * Otherwise, list the orphan for manual action.
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { User } from '../models/User';
import Salon from '../models/Salon';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  const salons = await Salon.find({}).lean();
  let repaired = 0;
  let orphaned = 0;

  for (const s of salons as any[]) {
    const owner = await User.findById(s.ownerId);
    if (owner) continue;
    // Owner missing — try to find a user with matching salon.phone
    const match = await User.findOne({ phone: s.phone });
    if (match) {
      await Salon.updateOne({ _id: s._id }, { ownerId: match._id });
      // Ensure user is promoted to salon_admin
      if (match.role !== 'salon_admin' && match.role !== 'super_admin') {
        match.role = 'salon_admin' as any;
        if (!match.email) match.email = `dev-${match.phone}@trimcity.local`;
        await match.save();
      }
      console.log(`✔ reassigned "${s.name}" to user ${match._id} (phone ${match.phone})`);
      repaired++;
    } else {
      console.log(`✗ orphan "${s.name}" — no user with phone ${s.phone}`);
      orphaned++;
    }
  }

  console.log(`\nRepaired: ${repaired}, still orphaned: ${orphaned}`);
  process.exit(0);
})();
