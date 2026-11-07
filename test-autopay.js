/**
 * Auto-Pay Flow Test Script
 * Run: node test-autopay.js
 *
 * Prerequisites:
 * 1. Backend server running on localhost:5000
 * 2. Stripe CLI running: stripe listen --forward-to localhost:5000/api/webhooks/stripe
 * 3. Test card: 4242 4242 4242 4242
 */

const BASE_URL = 'http://localhost:5000';

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function runTests() {
  log('cyan', '\n=================================================');
  log('cyan', '       AUTO-PAY FLOW TEST SUITE');
  log('cyan', '=================================================\n');

  let studentToken = null;
  let adminToken = null;
  let loanId = null;
  let paymentMethods = [];

  // Step 1: Test Health Check
  log('blue', '\n📋 STEP 1: Testing Server Health...');
  const health = await request('/');
  if (health.ok) {
    log('green', '✅ Server is running');
  } else {
    log('red', '❌ Server is not responding. Start with: npm run dev');
    return;
  }

  // Step 2: Login as Admin
  log('blue', '\n📋 STEP 2: Login as Admin...');
  const adminLogin = await request('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@example.com', // Replace with actual admin credentials
      password: 'admin123'
    }),
  });

  if (adminLogin.ok && adminLogin.data.token) {
    adminToken = adminLogin.data.token;
    log('green', `✅ Admin logged in: ${adminLogin.data.data?.name || adminLogin.data.user?.name || 'Admin'}`);
  } else {
    log('yellow', '⚠️ Admin login failed. Create an admin first:');
    log('yellow', '   node createAdmin.js');
    log('yellow', '   Or use your existing admin credentials in this script');
  }

  // Step 3: Login as Student
  log('blue', '\n📋 STEP 3: Login as Student...');
  const studentLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com', // Replace with actual student credentials
      password: 'password123'
    }),
  });

  if (studentLogin.ok && studentLogin.data.token) {
    studentToken = studentLogin.data.token;
    log('green', `✅ Student logged in: ${studentLogin.data.user?.fullName || studentLogin.data.user?.name || 'Test User'}`);
  } else {
    log('yellow', '⚠️ Student login failed. Create a test student first via registration');
    log('yellow', '   Skipping remaining tests...');
    return;
  }

  // Step 4: Get Payment Methods
  log('blue', '\n📋 STEP 4: Check Payment Methods...');
  const pmResponse = await request('/api/stripe/payment-methods', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });

  if (pmResponse.ok) {
    paymentMethods = pmResponse.data.data || [];
    if (paymentMethods.length > 0) {
      log('green', `✅ Found ${paymentMethods.length} payment method(s)`);
      paymentMethods.forEach(pm => {
        log('cyan', `   - ${pm.brand} ****${pm.last4} ${pm.isDefault ? '(Default)' : ''}`);
      });
    } else {
      log('yellow', '⚠️ No payment methods found. Add a card via the frontend:');
      log('yellow', '   1. Go to /add-card');
      log('yellow', '   2. Use test card: 4242 4242 4242 4242');
    }
  } else {
    log('red', `❌ Failed to get payment methods: ${pmResponse.data?.msg || pmResponse.error}`);
  }

  // Step 5: Get Loans
  log('blue', '\n📋 STEP 5: Check Loans...');
  const loansResponse = await request('/api/loans/my-loans', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });

  if (loansResponse.ok) {
    const loans = loansResponse.data.data || [];
    if (loans.length > 0) {
      log('green', `✅ Found ${loans.length} loan(s)`);
      loans.forEach(loan => {
        log('cyan', `   - ID: ${loan._id}`);
        log('cyan', `     Status: ${loan.status}`);
        log('cyan', `     Amount: $${loan.totalWithInterest || loan.principalRequested}`);
        log('cyan', `     Auto-Debit: ${loan.autoDebitEnabled ? 'Enabled' : 'Disabled'}`);
      });
      loanId = loans[0]._id;
    } else {
      log('yellow', '⚠️ No loans found. Create a loan via the frontend');
    }
  } else {
    log('red', `❌ Failed to get loans: ${loansResponse.data?.msg || loansResponse.error}`);
  }

  // Step 6: Get Auto-Debit Status
  log('blue', '\n📋 STEP 6: Get Auto-Debit Status...');
  const adResponse = await request('/api/emi/auto-debit-status', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });

  if (adResponse.ok) {
    const { loans, paymentMethods: pms, hasDefaultPaymentMethod } = adResponse.data.data;
    log('green', '✅ Auto-Debit Status:');
    log('cyan', `   - Has Default Card: ${hasDefaultPaymentMethod ? 'Yes' : 'No'}`);
    log('cyan', `   - Payment Methods: ${pms.length}`);

    loans.forEach(loan => {
      log('cyan', `   - Loan: ${loan.loanRef || loan.loanId}`);
      log('cyan', `     Status: ${loan.status}`);
      log('cyan', `     EMIs Paid: ${loan.paidEMIs}/${loan.totalEMIs}`);
      log('cyan', `     Auto-Debit: ${loan.autoDebitEnabled ? 'ON' : 'OFF'}`);
      log('cyan', `     Next EMI: $${loan.nextEMIAmount || loan.monthlyPayment}`);
    });
  } else {
    log('red', `❌ Failed to get auto-debit status: ${adResponse.data?.msg || adResponse.error}`);

    // Debug: Check if the issue is with Student lookup
    if (adResponse.data?.msg === 'Student profile not found') {
      log('yellow', '\n⚠️ DEBUG: Student not found issue detected!');
      log('yellow', '   This means the fix in emiController.js is not deployed.');
      log('yellow', '   Ensure your local changes are deployed to production.');
      log('yellow', '   Check: emiController.js line 88 should use Student.findById(userId)');
    }
  }

  // Step 7: Toggle Auto-Debit (if loan exists)
  if (loanId && paymentMethods.length > 0) {
    log('blue', '\n📋 STEP 7: Toggle Auto-Debit...');
    const toggleResponse = await request(`/api/emi/toggle-autodebit/${loanId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: true }),
    });

    if (toggleResponse.ok) {
      log('green', `✅ Auto-debit toggled: ${toggleResponse.data.msg}`);
      log('cyan', `   - Enabled: ${toggleResponse.data.data?.autoDebitEnabled}`);
      log('cyan', `   - Status: ${toggleResponse.data.data?.autoDebitStatus}`);
    } else {
      log('red', `❌ Failed to toggle auto-debit: ${toggleResponse.data?.msg || toggleResponse.error}`);

      // Specific error handling
      if (toggleResponse.data?.requiresFirstPayment) {
        log('yellow', '   → First EMI payment required before enabling auto-debit');
        log('yellow', '   → Use POST /api/stripe/create-first-payment');
      }
      if (toggleResponse.data?.requiresPaymentMethod) {
        log('yellow', '   → Add a payment method first');
      }
    }
  }

  // Step 8: Trigger EMI Scheduler (Admin)
  if (adminToken) {
    log('blue', '\n📋 STEP 8: Trigger EMI Scheduler (Admin)...');
    const triggerResponse = await request('/api/admin/loan/emi/trigger', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (triggerResponse.ok) {
      log('green', '✅ EMI Scheduler triggered successfully');
      log('cyan', '   Check server logs for EMI processing details');
    } else {
      log('red', `❌ Failed to trigger EMI scheduler: ${triggerResponse.data?.msg || triggerResponse.error}`);
    }
  }

  // Summary
  log('cyan', '\n=================================================');
  log('cyan', '                TEST SUMMARY');
  log('cyan', '=================================================');
  log('green', '\n✅ Tests completed!');
  log('cyan', '\nNext Steps:');
  log('yellow', '1. If "Student profile not found" error:');
  log('reset', '   → Deploy the emiController.js fix to production');
  log('yellow', '2. If no payment methods:');
  log('reset', '   → Add a card via frontend using test card 4242 4242 4242 4242');
  log('yellow', '3. If no loans:');
  log('reset', '   → Create a loan via frontend');
  log('reset', '   → Admin: Approve & Disburse the loan');
  log('yellow', '4. To test auto-debit:');
  log('reset', '   → Make first EMI payment');
  log('reset', '   → Enable auto-debit toggle');
  log('reset', '   → Trigger EMI scheduler (admin)');
  log('cyan', '\n=================================================\n');
}

// Run tests
runTests().catch(console.error);