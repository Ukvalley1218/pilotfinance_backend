/**
 * Restore EMI Amounts to Match Business Formula
 *
 * The business uses a simplified EMI formula that shows higher EMI to users.
 * This script ensures loan.monthlyPayment and EMI schedules match this formula.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Loan from './src/models/loan.js';
import EMISchedule from './src/models/emiSchedule.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://saishbafna2019:Minehealer2025@minehealer.mif1alv.mongodb.net/Piolet_finance?retryWrites=true&w=majority&appName=Minehealer';

/**
 * Calculate EMI using the business formula
 * This formula treats interestRate as a PERIODIC rate (not annual)
 * Result is higher than standard EMI formula, which is what business wants
 */
function calculateBusinessEMI(principal, ratePercent, tenureMonths) {
  const r = ratePercent / 100;  // Periodic rate as decimal
  if (r === 0) return Math.round(principal / tenureMonths);

  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) /
               (Math.pow(1 + r, tenureMonths) - 1);
  return Math.round(emi);
}

async function restoreEMIValues() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    console.log('='.repeat(80));
    console.log('RESTORING EMI VALUES TO BUSINESS FORMULA');
    console.log('='.repeat(80) + '\n');

    const loans = await Loan.find({}).sort({ createdAt: -1 });

    let fixedCount = 0;

    for (const loan of loans) {
      // Get tenure from period
      const tenureMatch = loan.period.match(/(\d+)/);
      const tenure = tenureMatch ? parseInt(tenureMatch[1]) : 12;

      // Calculate EMI using business formula
      const correctEMI = calculateBusinessEMI(
        loan.principalRequested,
        loan.interestRate,
        tenure
      );

      const correctTotal = correctEMI * tenure;

      console.log(`📦 ${loan.loanId} (${loan.status})`);
      console.log(`   Principal: $${loan.principalRequested}`);
      console.log(`   Interest Rate: ${loan.interestRate}%`);
      console.log(`   Period: ${tenure} months`);
      console.log(`   Business EMI Formula: $${correctEMI}/month`);
      console.log(`   Total with Interest: $${correctTotal}`);

      // Check if values need updating
      const needsUpdate = (
        Math.abs(loan.monthlyPayment - correctEMI) > 1 ||
        Math.abs(loan.totalWithInterest - correctTotal) > 1
      );

      if (needsUpdate) {
        console.log(`   ❌ Current values incorrect:`);
        console.log(`      monthlyPayment: $${loan.monthlyPayment} (should be $${correctEMI})`);
        console.log(`      totalWithInterest: $${loan.totalWithInterest} (should be $${correctTotal})`);

        // Update loan
        loan.monthlyPayment = correctEMI;
        loan.totalWithInterest = correctTotal;
        loan.totalAmount = correctTotal;
        await loan.save();

        console.log(`   ✅ Loan values updated`);

        // Update EMI schedules for pending/overdue EMIs
        const emiResult = await EMISchedule.updateMany(
          { loanId: loan._id, status: { $in: ['pending', 'overdue'] } },
          { $set: { amount: correctEMI } }
        );

        console.log(`   ✅ ${emiResult.modifiedCount} EMI schedules updated to $${correctEMI}`);
        fixedCount++;
      } else {
        console.log(`   ✅ Values are correct`);
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log(`SUMMARY:`);
    console.log(`  Total loans checked: ${loans.length}`);
    console.log(`  Loans fixed: ${fixedCount}`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

restoreEMIValues();