/**
 * Check all loans for a student
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Loan from './src/models/loan.js';
import EMISchedule from './src/models/emiSchedule.model.js';
import { Student } from './src/models/student.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://saishbafna2019:Minehealer2025@minehealer.mif1alv.mongodb.net/Piolet_finance?retryWrites=true&w=majority&appName=Minehealer';

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find student Saish Bafna
    const student = await Student.findOne({ email: /saish/i });
    if (!student) {
      console.log('Student not found');
      return;
    }

    console.log('=== STUDENT ===');
    console.log('Name:', student.name || student.fullName);
    console.log('Email:', student.email);
    console.log('ID:', student._id);

    // Get all loans for this student
    const loans = await Loan.find({ studentId: student._id }).sort({ createdAt: -1 });

    console.log('\n=== ALL LOANS ===');
    console.log('Total Loans:', loans.length);
    console.log('');

    for (const loan of loans) {
      const emis = await EMISchedule.find({ loanId: loan._id });
      console.log(`📦 ${loan.loanId}`);
      console.log(`   Status: ${loan.status}`);
      console.log(`   Category: ${loan.category}`);
      console.log(`   Principal: $${loan.principalRequested}`);
      console.log(`   Monthly: $${loan.monthlyPayment}`);
      console.log(`   EMI Schedules: ${emis.length}`);
      console.log(`   Shows in Auto-Debit: ${['Disbursed', 'Active'].includes(loan.status) ? 'YES ✅' : 'NO ❌'}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

check();