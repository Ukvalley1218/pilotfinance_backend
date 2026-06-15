/**
 * Verify all loans and EMI schedules
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Loan from './src/models/loan.js';
import EMISchedule from './src/models/emiSchedule.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://saishbafna2019:Minehealer2025@minehealer.mif1alv.mongodb.net/Piolet_finance?retryWrites=true&w=majority&appName=Minehealer';

async function verifyAll() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const loans = await Loan.find({ status: { $in: ['Disbursed', 'Active'] } }).sort({ createdAt: -1 });

    console.log(`📋 Found ${loans.length} active loans\n`);
    console.log('='.repeat(80));

    for (const loan of loans) {
      const emis = await EMISchedule.find({ loanId: loan._id }).sort({ installmentNumber: 1 });
      const pendingEMIs = emis.filter(e => e.status === 'pending' || e.status === 'overdue');
      const paidEMIs = emis.filter(e => e.status === 'paid');
      const nextEMI = pendingEMIs[0];

      console.log(`\n📦 ${loan.loanId} (${loan.category})`);
      console.log(`   Status: ${loan.status}`);
      console.log(`   Monthly Payment: $${loan.monthlyPayment}`);
      console.log(`   EMI Schedules: ${emis.length} total, ${paidEMIs.length} paid, ${pendingEMIs.length} pending`);
      console.log(`   Next EMI Amount: $${nextEMI?.amount || 'N/A'}`);
      console.log(`   Match: ${nextEMI?.amount === loan.monthlyPayment ? '✅ YES' : '❌ NO'}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

verifyAll();