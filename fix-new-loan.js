/**
 * Fix EMI amounts to match monthlyPayment for all active loans
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Loan from './src/models/loan.js';
import EMISchedule from './src/models/emiSchedule.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://saishbafna2019:Minehealer2025@minehealer.mif1alv.mongodb.net/Piolet_finance?retryWrites=true&w=majority&appName=Minehealer';

async function fixEMI() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all disbursed/active loans
    const loans = await Loan.find({ status: { $in: ['Disbursed', 'Active'] } });

    let fixedCount = 0;

    for (const loan of loans) {
      const emis = await EMISchedule.find({ loanId: loan._id }).sort({ installmentNumber: 1 });

      if (emis.length === 0) continue;

      const firstEMI = emis[0];

      // Check if EMI amount matches monthlyPayment
      if (Math.abs(firstEMI.amount - loan.monthlyPayment) > 0.01) {
        console.log(`\n📦 ${loan.loanId}`);
        console.log(`   monthlyPayment: $${loan.monthlyPayment}`);
        console.log(`   EMI amount: $${firstEMI.amount}`);
        console.log(`   ❌ MISMATCH - Fixing...`);

        // Update all pending/overdue EMIs to match monthlyPayment
        const result = await EMISchedule.updateMany(
          { loanId: loan._id, status: { $in: ['pending', 'overdue'] } },
          { $set: { amount: loan.monthlyPayment } }
        );

        console.log(`   ✅ Updated ${result.modifiedCount} EMIs to $${loan.monthlyPayment}`);
        fixedCount++;
      }
    }

    console.log(`\n${fixedCount} loans fixed`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixEMI();