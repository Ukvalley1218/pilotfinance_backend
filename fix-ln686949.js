/**
 * Fix specific loan LN686949
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Loan from './src/models/loan.js';
import EMISchedule from './src/models/emiSchedule.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://saishbafna2019:Minehealer2025@minehealer.mif1alv.mongodb.net/Piolet_finance?retryWrites=true&w=majority&appName=Minehealer';

async function fixLoan() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const loan = await Loan.findOne({ loanId: 'LN686949' });

    if (!loan) {
      console.log('Loan not found');
      return;
    }

    console.log('LOAN BEFORE:');
    console.log('  loanId:', loan.loanId);
    console.log('  monthlyPayment:', loan.monthlyPayment);
    console.log('  principalRequested:', loan.principalRequested);
    console.log('  interestRate:', loan.interestRate);
    console.log('  period:', loan.period);

    // Get EMI schedules
    const emis = await EMISchedule.find({ loanId: loan._id }).sort({ installmentNumber: 1 });

    console.log('\nEMI SCHEDULES BEFORE:');
    emis.slice(0, 3).forEach(e => {
      console.log(`  EMI ${e.installmentNumber}: $${e.amount}`);
    });

    // Fix EMI schedules to match monthlyPayment
    const result = await EMISchedule.updateMany(
      { loanId: loan._id, status: { $in: ['pending', 'overdue'] } },
      { $set: { amount: loan.monthlyPayment } }
    );

    console.log('\n✅ Updated', result.modifiedCount, 'EMI schedules to $' + loan.monthlyPayment);

    // Verify
    const emis2 = await EMISchedule.find({ loanId: loan._id }).sort({ installmentNumber: 1 });
    console.log('\nEMI SCHEDULES AFTER:');
    emis2.slice(0, 3).forEach(e => {
      console.log(`  EMI ${e.installmentNumber}: $${e.amount}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixLoan();