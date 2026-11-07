/**
 * Check EMI details for loan LN701741
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Loan from './src/models/loan.js';
import EMISchedule from './src/models/emiSchedule.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://saishbafna2019:Minehealer2025@minehealer.mif1alv.mongodb.net/Piolet_finance?retryWrites=true&w=majority&appName=Minehealer';

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find loan LN701741
    const loan = await Loan.findOne({ loanId: 'LN701741' });

    if (!loan) {
      console.log('❌ Loan LN701741 not found');
      return;
    }

    console.log('=== LOAN LN701741 ===');
    console.log('Status:', loan.status);
    console.log('Principal:', loan.principalRequested);
    console.log('Interest Rate:', loan.interestRate + '%');
    console.log('Period:', loan.period);
    console.log('Monthly Payment: $' + loan.monthlyPayment);
    console.log('Total Amount: $' + loan.totalWithInterest);
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

      // Calculate total from EMI schedule
      const totalFromEMIs = emis.reduce((sum, e) => sum + e.amount, 0);
      console.log('\nTotal from EMI schedule: $' + totalFromEMIs.toFixed(2));
      console.log('Loan totalWithInterest: $' + loan.totalWithInterest);
      console.log('Difference: $' + Math.abs(totalFromEMIs - loan.totalWithInterest).toFixed(2));

      // Check calculation
      console.log('\n=== EMI CALCULATION CHECK ===');
      const n = parseInt(loan.period) || 12;
      const P = loan.principalRequested;
      const r = loan.interestRate / 12 / 100;  // Monthly rate
      const monthlyRate = r;

      const correctEMI = monthlyRate === 0
        ? P / n
        : (P * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);

      console.log('Principal (P):', P);
      console.log('Interest Rate:', loan.interestRate + '% annual');
      console.log('Monthly Rate:', (loan.interestRate / 12).toFixed(4) + '%');
      console.log('Tenure (n):', n, 'months');
      console.log('');
      console.log('Calculated EMI (correct formula): $' + correctEMI.toFixed(2));
      console.log('Loan monthlyPayment field: $' + loan.monthlyPayment);
      console.log('First EMI in schedule: $' + emis[0].amount);
      console.log('');
      console.log('Loan totalWithInterest: $' + loan.totalWithInterest);
      console.log('Calculated total (EMI × n): $' + (correctEMI * n).toFixed(2));
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

check();