/**
 * Diagnostic and Fix Script for EMI Issues
 *
 * Run: node diagnose-emi.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Loan from './src/models/loan.js';
import EMISchedule from './src/models/emiSchedule.model.js';
import { Student } from './src/models/student.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://saishbafna2019:Minehealer2025@minehealer.mif1alv.mongodb.net/Piolet_finance?retryWrites=true&w=majority&appName=Minehealer';

function calculateEMI(principal, annualRate, tenure) {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return principal / tenure;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
               (Math.pow(1 + monthlyRate, tenure) - 1);
  return Math.round(emi * 100) / 100;
}

async function generateEMISchedule(loan) {
  const tenureMatch = loan.period.match(/(\d+)/);
  const tenure = tenureMatch ? parseInt(tenureMatch[1]) : 12;

  const emiAmount = calculateEMI(
    loan.principalRequested,
    loan.interestRate,
    tenure
  );

  const disbursementDate = loan.disbursementDate ? new Date(loan.disbursementDate) : new Date();

  const emiSchedules = [];
  for (let i = 1; i <= tenure; i++) {
    const dueDate = new Date(disbursementDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    dueDate.setDate(dueDate.getDate() - 1);

    emiSchedules.push({
      loanId: loan._id,
      studentId: loan.studentId,
      installmentNumber: i,
      amount: emiAmount,
      dueDate: dueDate,
      status: "pending",
      retryCount: 0,
      maxRetries: 3,
    });
  }

  const savedSchedules = await EMISchedule.insertMany(emiSchedules);

  if (savedSchedules.length > 0) {
    loan.nextPaymentDueDate = savedSchedules[0].dueDate;
    await loan.save();
  }

  return savedSchedules;
}

async function diagnose() {
  console.log('\n========================================');
  console.log('   EMI DIAGNOSTIC & FIX SCRIPT');
  console.log('========================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all Disbursed/Active loans without EMIs
    const loans = await Loan.find({
      status: { $in: ['Disbursed', 'Active'] }
    }).populate('studentId');

    console.log(`📋 Found ${loans.length} disbursed/active loans\n`);

    let fixedCount = 0;

    for (const loan of loans) {
      // Check if EMIs exist
      const existingEMIs = await EMISchedule.find({ loanId: loan._id });

      console.log(`\n📦 Loan: ${loan.loanId}`);
      console.log(`   Status: ${loan.status}`);
      console.log(`   Student: ${loan.studentId?.name || loan.studentId?.email || 'Unknown'}`);
      console.log(`   Principal: $${loan.principalRequested}`);
      console.log(`   Period: ${loan.period}`);
      console.log(`   Interest Rate: ${loan.interestRate}%`);
      console.log(`   Disbursement Date: ${loan.disbursementDate || 'Not set'}`);
      console.log(`   Next Payment Due: ${loan.nextPaymentDueDate || 'Not set'}`);
      console.log(`   EMIs: ${existingEMIs.length}`);

      if (existingEMIs.length === 0) {
        console.log('   ❌ MISSING EMIs - Generating now...');

        try {
          // Validate required fields
          if (!loan.period || !loan.principalRequested) {
            console.log('   ⚠️ Missing required fields:');
            console.log(`      Period: ${loan.period || 'MISSING'}`);
            console.log(`      Principal: ${loan.principalRequested || 'MISSING'}`);
            continue;
          }

          if (!loan.disbursementDate) {
            console.log('   ⚠️ Setting disbursement date to now...');
            loan.disbursementDate = new Date();
            await loan.save();
          }

          const emiSchedule = await generateEMISchedule(loan);
          console.log(`   ✅ Generated ${emiSchedule.length} EMIs`);

          emiSchedule.forEach((emi, i) => {
            console.log(`      EMI ${i + 1}: $${emi.amount} due ${emi.dueDate.toISOString().split('T')[0]}`);
          });

          fixedCount++;
        } catch (err) {
          console.log(`   ❌ Error generating EMIs: ${err.message}`);
        }
      } else {
        console.log('   ✅ EMIs exist');
      }
    }

    console.log(`\n\n========================================`);
    console.log(`   SUMMARY`);
    console.log(`========================================`);
    console.log(`Total loans checked: ${loans.length}`);
    console.log(`Loans fixed: ${fixedCount}`);
    console.log(`========================================\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

diagnose();