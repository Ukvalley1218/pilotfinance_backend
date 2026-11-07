/**
 * Fix Loan Monthly Payment Values
 * Updates loans to use correct EMI calculation
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Loan from './src/models/loan.js';
import EMISchedule from './src/models/emiSchedule.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://saishbafna2019:Minehealer2025@minehealer.mif1alv.mongodb.net/Piolet_finance?retryWrites=true&w=majority&appName=Minehealer';

/**
 * Calculate correct EMI using monthly rate formula
 */
function calculateCorrectEMI(principal, annualRate, tenureMonths) {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return principal / tenureMonths;

  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
               (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
}

async function fixLoanPayments() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all loans
    const loans = await Loan.find({}).sort({ createdAt: -1 });

    console.log(`📋 Found ${loans.length} loans\n`);
    console.log('='.repeat(80));

    let fixedCount = 0;

    for (const loan of loans) {
      // Get tenure
      const tenureMatch = loan.period.match(/(\d+)/);
      const tenure = tenureMatch ? parseInt(tenureMatch[1]) : 12;

      // Calculate correct EMI
      const correctEMI = calculateCorrectEMI(
        loan.principalRequested,
        loan.interestRate,
        tenure
      );

      // Calculate correct total
      const correctTotal = correctEMI * tenure;

      // Check if loan values are incorrect
      const needsFix = (
        Math.abs(loan.monthlyPayment - correctEMI) > 1 ||
        Math.abs(loan.totalWithInterest - correctTotal) > 1
      );

      console.log(`\n📦 ${loan.loanId} (${loan.status})`);
      console.log(`   Principal: $${loan.principalRequested}`);
      console.log(`   Interest: ${loan.interestRate}% annual`);
      console.log(`   Period: ${tenure} months`);
      console.log(``);
      console.log(`   Current monthlyPayment: $${loan.monthlyPayment}`);
      console.log(`   Correct EMI calculation: $${correctEMI.toFixed(2)}`);
      console.log(``);
      console.log(`   Current totalWithInterest: $${loan.totalWithInterest}`);
      console.log(`   Correct total (${correctEMI.toFixed(2)} × ${tenure}): $${correctTotal.toFixed(2)}`);

      if (needsFix) {
        console.log(`   ❌ MISMATCH - Fixing...`);

        // Update loan
        loan.monthlyPayment = Math.round(correctEMI);
        loan.totalWithInterest = Math.round(correctTotal);
        loan.totalAmount = Math.round(correctTotal);
        await loan.save();

        console.log(`   ✅ Updated: monthlyPayment=$${loan.monthlyPayment}, total=$${loan.totalWithInterest}`);
        fixedCount++;

        // Update EMI schedules to match
        const emiResult = await EMISchedule.updateMany(
          { loanId: loan._id, status: { $in: ['pending', 'overdue'] } },
          { $set: { amount: Math.round(correctEMI) } }
        );

        console.log(`   ✅ Updated ${emiResult.modifiedCount} EMI schedules`);
      } else {
        console.log(`   ✅ Values are correct`);
      }

      console.log('-'.repeat(80));
    }

    console.log(`\n${'='.repeat(80)}`);
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

fixLoanPayments();