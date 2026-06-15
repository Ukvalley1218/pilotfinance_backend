# Auto-Pay Flow Testing Guide

## Prerequisites
1. Node.js installed
2. MongoDB running (or Atlas connection)
3. Stripe account (Test mode)
4. Stripe CLI for local webhook testing

---

## Step 1: Start the Backend Server

```bash
cd D:\office\pilot-finance\pilotfinance_backend
npm run dev
```

The server should start on `http://localhost:5000`

---

## Step 2: Start Stripe Webhook Forwarding (For Local Testing)

In a separate terminal:

```bash
# Install Stripe CLI if not already installed
# Then run:
stripe listen --forward-to localhost:5000/api/webhooks/stripe

# This will give you a webhook secret like: whsec_xxxxx
# Copy that and update your .env file with STRIPE_WEBHOOK_SECRET
```

---

## Step 3: Test Auto-Pay Flow

### A. Register/Login as Student

```bash
# Register a new student
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Response will include a token - save it!
# TOKEN=<your-token-here>
```

### B. Add Payment Method (Card)

```bash
# Create a card setup session
curl -X POST http://localhost:5000/api/stripe/create-card-setup-session \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"frontendUrl":"http://localhost:5173"}'

# This returns a Stripe Checkout URL - open it in browser
# Enter test card: 4242 4242 4242 4242, any future date, any CVC
# After completing, you'll be redirected back with session_id
```

### C. Verify Card Saved

```bash
curl -X GET http://localhost:5000/api/stripe/payment-methods \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return your saved card
```

### D. Create Loan Application

```bash
curl -X POST http://localhost:5000/api/loans/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Education",
    "totalAmount": 10000,
    "period": "12",
    "interestRate": 2.5,
    "monthlyPayment": 850
  }'
```

### E. Admin: Approve & Disburse Loan

```bash
# Login as admin first
curl -X POST http://localhost:5000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# ADMIN_TOKEN=<admin-token>

# Approve the loan
curl -X PUT http://localhost:5000/api/admin/loan/LOAN_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"Approved"}'

# Disburse the loan (this generates EMI schedule)
curl -X PUT http://localhost:5000/api/admin/loan/LOAN_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"Disbursed"}'
```

### F. Check EMI Schedule Was Generated

```bash
curl -X GET http://localhost:5000/api/admin/loan/LOAN_ID/emi-schedule \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Should return 12 EMI installments with status "pending"
```

### G. Get Auto-Debit Status

```bash
curl -X GET http://localhost:5000/api/emi/auto-debit-status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should show:
# - loans: array with your loan
# - paymentMethods: array with your card
# - paidEMIs: 0
# - needsFirstPayment: true
```

### H. Make First EMI Payment

```bash
curl -X POST http://localhost:5000/api/stripe/create-first-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "loanId":"LOAN_ID",
    "frontendUrl":"http://localhost:5173"
  }'

# Returns Stripe Checkout URL - open it
# Complete payment with test card: 4242 4242 4242 4242
# After payment, you'll be redirected back
```

### I. Verify Payment & Auto-Debit Activation

```bash
# Check auto-debit status again
curl -X GET http://localhost:5000/api/emi/auto-debit-status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should show:
# - paidEMIs: 1
# - autoDebitEnabled: true
# - autoDebitStatus: "active"
```

### J. Test Auto-Debit Manually

```bash
# Trigger EMI scheduler manually (Admin)
curl -X POST http://localhost:5000/api/admin/loan/emi/trigger \
  -H "Authorization: Bearer ADMIN_TOKEN"

# This will try to charge the next EMI automatically
```

---

## Test Card Numbers (Stripe Test Mode)

| Card Number | Scenario |
|-------------|----------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0025 0000 3155 | 3D Secure required |

---

## Checking Database

```javascript
// In MongoDB shell or Compass
db.students.findOne({ email: "test@example.com" })
db.loans.find({ studentId: ObjectId("...") })
db.emischedules.find({ loanId: ObjectId("...") })
db.paymentmethods.find({ studentId: ObjectId("...") })
db.transactions.find({ studentId: ObjectId("...") })
```

---

## Troubleshooting

### Issue: "Student profile not found"
- Check if token is valid
- Check if auth middleware is returning Student (not User)
- Fix: Ensure `Student.findById(userId)` is used, not `Student.findOne({ userId })`

### Issue: "No pending EMIs found"
- Loan must be in "Disbursed" or "Active" status
- EMI schedule must be generated (happens on disbursement)

### Issue: "Please add a payment method first"
- Add a card via `/api/stripe/create-card-setup-session`
- Verify card was saved with `/api/stripe/payment-methods`

### Issue: Webhook not receiving events
- Ensure Stripe CLI is running: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`
- Check STRIPE_WEBHOOK_SECRET in .env matches CLI output