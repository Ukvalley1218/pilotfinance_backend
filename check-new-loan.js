/**
 * Check new loan LN588730
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Loan from './src/models/loan.js';
import EMISchedule from './src/models/emiSchedule.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://saishbafna2019:Minehealer2025@minehealer.mif1alv.mongodb.net/Piolet_finance?retryWrites=true&w=majority&appName=Minehealer';

async function checkLoan() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const loan = await Loan.findOne({ loanId: 'LN588730' });

    if (!loan) {
      console.log('Loan not found');
      return;
    }

    console.log('=== LOAN LN588730 ===');
    console.log('Status:', loan.status);
    console.log('Category:', loan.category);
    console.log('Principal:', loan.principalRequested);
    console.log('Interest Rate:', loan.interestRate + '%');
    console.log('Period:', loan.period);
    console.log('Monthly Payment:', loan.monthlyPayment);
    console.log('Total with Interest:', loan.totalWithInterest);
    console.log('Disbursement Date:', loan.disbursementDate);
    console.log('Next Payment Due:', loan.nextPaymentDueDate);

    // Get EMI schedules
    const emis = await EMISchedule.find({ loanId: loan._id }).sort({ installmentNumber: 1 });

    console.log('\n=== EMI SCHEDULE ===');
    console.log('Total EMIs:', emis.length);

    if (emis.length > 0) {
      console.log('\nFirst 5 EMIs:');
      emis.slice(0, 5).forEach(emi => {
        console.log(`  EMI ${emi.installmentNumber}: $${emi.amount} | ${emi.status} | Due: ${emi.dueDate.toISOString().split('T')[0]}`);
      });

      console.log('\n❓ MISMATCH CHECK:');
      console.log('  loan.monthlyPayment:', loan.monthlyPayment);
      console.log('  EMI schedule amount:', emis[0].amount);
      console.log('  Match:', emis[0].amount === loan.monthlyPayment ? '✅ YES' : '❌ NO');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

checkLoan();