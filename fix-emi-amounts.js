/**
 * Fix EMI Schedule Amounts
 * Updates EMI amounts to match the loan's monthlyPayment field
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Loan from './src/models/loan.js';
import EMISchedule from './src/models/emiSchedule.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://saishbafna2019:Minehealer2025@minehealer.mif1alv.mongodb.net/Piolet_finance?retryWrites=true&w=majority&appName=Minehealer';

async function fixEMIAmounts() {
  console.log('\n========================================');
  console.log('   FIX EMI SCHEDULE AMOUNTS');
  console.log('========================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all disbursed/active loans
    const loans = await Loan.find({
      status: { $in: ['Disbursed', 'Active'] }
    });

    console.log(`📋 Found ${loans.length} disbursed/active loans\n`);

    for (const loan of loans) {
      // Get EMIs for this loan
      const emis = await EMISchedule.find({ loanId: loan._id });

      if (emis.length === 0) {
        console.log(`⚠️ Loan ${loan.loanId} has no EMIs - skipping`);
        continue;
      }

      // Check if EMI amounts match the loan's monthlyPayment
      const firstEMI = emis[0];
      const expectedAmount = loan.monthlyPayment;

      if (Math.abs(firstEMI.amount - expectedAmount) > 0.01) {
        console.log(`\n📦 Loan: ${loan.loanId}`);
        console.log(`   Monthly Payment: $${expectedAmount}`);
        console.log(`   EMI Amount: $${firstEMI.amount}`);
        console.log(`   Difference: $${Math.abs(expectedAmount - firstEMI.amount).toFixed(2)}`);
        console.log(`   ❌ MISMATCH - Fixing...`);

        // Update all pending EMIs to use the correct amount
        const result = await EMISchedule.updateMany(
          {
            loanId: loan._id,
            status: { $in: ['pending', 'overdue'] }
          },
          { $set: { amount: expectedAmount } }
        );

        console.log(`   ✅ Updated ${result.modifiedCount} EMIs to $${expectedAmount}`);
      } else {
        console.log(`✅ Loan ${loan.loanId}: EMI amounts correct ($${expectedAmount})`);
      }

      // Update loan's nextPaymentDueDate if needed
      const nextEMI = await EMISchedule.findOne({
        loanId: loan._id,
        status: { $in: ['pending', 'overdue'] }
      }).sort({ dueDate: 1 });

      if (nextEMI && (!loan.nextPaymentDueDate ||
          Math.abs(new Date(loan.nextPaymentDueDate) - new Date(nextEMI.dueDate)) > 86400000)) {
        loan.nextPaymentDueDate = nextEMI.dueDate;
        await loan.save();
        console.log(`   ✅ Updated nextPaymentDueDate to ${nextEMI.dueDate.toISOString().split('T')[0]}`);
      }
    }

    console.log('\n========================================');
    console.log('   DONE');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

fixEMIAmounts();