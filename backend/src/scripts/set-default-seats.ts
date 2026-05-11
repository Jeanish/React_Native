/**
 * One-off: set totalSeats=4 on any salon missing it. Run after adding the field to the schema.
 *   npx ts-node src/scripts/set-default-seats.ts
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import Salon from '../models/Salon';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  const result = await Salon.updateMany(
    { $or: [{ totalSeats: { $exists: false } }, { totalSeats: null }, { totalSeats: { $lt: 1 } }] },
    { $set: { totalSeats: 4 } },
  );
  console.log(`Updated ${result.modifiedCount} salons to totalSeats=4`);
  process.exit(0);
})();
