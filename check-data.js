/**
 * Check Loan and EMI Data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Loan from './src/models/loan.js';
import EMISchedule from './src/models/emiSchedule.model.js';
import Transaction from './src/models/transaction.model.js';
import { Student } from './src/models/student.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://saishbafna2019:Minehealer2025@minehealer.mif1alv.mongodb.net/Piolet_finance?retryWrites=true&w=majority&appName=Minehealer';

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Loan LN197385
    const loan = await Loan.findOne({ loanId: 'LN197385' });
    console.log('=== LOAN LN197385 ===');
    console.log('Status:', loan.status);
    console.log('Monthly Payment: $' + loan.monthlyPayment);
    console.log('Total Amount: $' + loan.totalWithInterest);
    console.log('Paid Amount: $' + loan.paidAmount);
    console.log('Principal: $' + loan.principalRequested);
    console.log('Interest Rate:', loan.interestRate + '%');
    console.log('Period:', loan.period);

    // EMI Schedule
    const emis = await EMISchedule.find({ loanId: loan._id }).sort({ installmentNumber: 1 });
    console.log('\n=== EMI SCHEDULE ===');
    console.log('Total EMIs:', emis.length);
    const paidEMIs = emis.filter(e => e.status === 'paid');
    const pendingEMIs = emis.filter(e => e.status === 'pending' || e.status === 'overdue');
    console.log('Paid EMIs:', paidEMIs.length);
    console.log('Pending EMIs:', pendingEMIs.length);

    console.log('\nFirst 5 EMIs:');
    emis.slice(0, 5).forEach(e => {
      console.log(`  EMI ${e.installmentNumber}: $${e.amount} | ${e.status} | Due: ${e.dueDate.toISOString().split('T')[0]}`);
    });

    // Transactions for this student
    const txns = await Transaction.find({ studentId: loan.studentId }).sort({ createdAt: -1 }).limit(10);
    console.log('\n=== RECENT TRANSACTIONS ===');
    let totalPaid = 0;
    txns.forEach(t => {
      if (t.type === 'Credit' || t.status === 'Completed') {
        console.log(`  ${t.desc} | ${t.type} | $${t.amount} | ${t.status}`);
        if (t.type === 'Credit') totalPaid += t.amount;
      }
    });
    console.log('\nTotal Credited: $' + totalPaid);

    // Second loan
    const loan2 = await Loan.findOne({ loanId: 'LN701741' });
    if (loan2) {
      console.log('\n=== LOAN LN701741 ===');
      console.log('Status:', loan2.status);
      console.log('Monthly Payment: $' + loan2.monthlyPayment);
      console.log('Principal: $' + loan2.principalRequested);

      const emis2 = await EMISchedule.find({ loanId: loan2._id });
      console.log('EMI Schedules:', emis2.length);
    }

    // Check all loans for this student
    const student = await Student.findById(loan.studentId);
    const allLoans = await Loan.find({ studentId: student._id });
    console.log('\n=== ALL LOANS FOR THIS STUDENT ===');
    console.log('Student:', student.name || student.email);
    console.log('Total Loans:', allLoans.length);
    allLoans.forEach(l => {
      console.log(`  ${l.loanId} | ${l.status} | $${l.monthlyPayment}/mo`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

check();