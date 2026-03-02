import Stripe from "stripe";

// Initialize Stripe with secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2023-10-16",
});

/**
 * Create a Stripe customer for a student
 * @param {Object} studentData - Student data (name, email, phone)
 * @returns {Promise<Object>} - Stripe customer object
 */
export const createStripeCustomer = async (studentData) => {
  try {
    const customer = await stripe.customers.create({
      name: studentData.name,
      email: studentData.email,
      phone: studentData.phone,
      metadata: {
        studentId: studentData.studentId || "",
        userId: studentData.userId || "",
      },
    });
    return customer;
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    throw error;
  }
};

/**
 * Retrieve a Stripe customer
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Object>} - Stripe customer object
 */
export const getStripeCustomer = async (customerId) => {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer;
  } catch (error) {
    console.error("Error retrieving Stripe customer:", error);
    throw error;
  }
};

/**
 * Attach a payment method to a customer
 * @param {string} paymentMethodId - Stripe payment method ID
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Object>} - Payment method object
 */
export const attachPaymentMethod = async (paymentMethodId, customerId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    return paymentMethod;
  } catch (error) {
    console.error("Error attaching payment method:", error);
    throw error;
  }
};

/**
 * Detach a payment method from a customer
 * @param {string} paymentMethodId - Stripe payment method ID
 * @returns {Promise<Object>} - Payment method object
 */
export const detachPaymentMethod = async (paymentMethodId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
    return paymentMethod;
  } catch (error) {
    console.error("Error detaching payment method:", error);
    throw error;
  }
};

/**
 * List all payment methods for a customer
 * @param {string} customerId - Stripe customer ID
 * @param {string} type - Payment method type (default: 'card')
 * @returns {Promise<Array>} - List of payment methods
 */
export const listPaymentMethods = async (customerId, type = "card") => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: type,
    });
    return paymentMethods.data;
  } catch (error) {
    console.error("Error listing payment methods:", error);
    throw error;
  }
};

/**
 * Set default payment method for a customer
 * @param {string} customerId - Stripe customer ID
 * @param {string} paymentMethodId - Stripe payment method ID
 * @returns {Promise<Object>} - Updated customer object
 */
export const setDefaultPaymentMethod = async (customerId, paymentMethodId) => {
  try {
    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    return customer;
  } catch (error) {
    console.error("Error setting default payment method:", error);
    throw error;
  }
};

/**
 * Create a payment intent for one-time payment
 * @param {number} amount - Amount in smallest currency unit (cents for USD)
 * @param {string} customerId - Stripe customer ID
 * @param {string} paymentMethodId - Stripe payment method ID (optional)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Payment intent object
 */
export const createPaymentIntent = async (
  amount,
  customerId,
  paymentMethodId = null,
  metadata = {}
) => {
  try {
    const paymentIntentData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      customer: customerId,
      metadata: metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    if (paymentMethodId) {
      paymentIntentData.payment_method = paymentMethodId;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
    return paymentIntent;
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
};

/**
 * Confirm a payment intent
 * @param {string} paymentIntentId - Stripe payment intent ID
 * @param {string} paymentMethodId - Stripe payment method ID (optional)
 * @returns {Promise<Object>} - Payment intent object
 */
export const confirmPaymentIntent = async (paymentIntentId, paymentMethodId = null) => {
  try {
    const confirmData = paymentMethodId ? { payment_method: paymentMethodId } : {};
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, confirmData);
    return paymentIntent;
  } catch (error) {
    console.error("Error confirming payment intent:", error);
    throw error;
  }
};

/**
 * Retrieve a payment intent
 * @param {string} paymentIntentId - Stripe payment intent ID
 * @returns {Promise<Object>} - Payment intent object
 */
export const getPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error("Error retrieving payment intent:", error);
    throw error;
  }
};

/**
 * Create a Setup Intent for saving payment method without immediate charge
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Object>} - Setup intent object
 */
export const createSetupIntent = async (customerId) => {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return setupIntent;
  } catch (error) {
    console.error("Error creating setup intent:", error);
    throw error;
  }
};

/**
 * Charge a customer using saved payment method (off-session payment)
 * @param {number} amount - Amount in smallest currency unit
 * @param {string} customerId - Stripe customer ID
 * @param {string} paymentMethodId - Stripe payment method ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Payment intent object
 */
export const chargeCustomer = async (amount, customerId, paymentMethodId, metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: metadata,
    });
    return paymentIntent;
  } catch (error) {
    console.error("Error charging customer:", error);
    throw error;
  }
};

/**
 * Verify webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe-Signature header
 * @param {string} secret - Webhook secret
 * @returns {Object} - Parsed event object
 */
export const verifyWebhookSignature = (payload, signature, secret) => {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    throw error;
  }
};

/**
 * Get Stripe instance for advanced usage
 * @returns {Stripe} - Stripe instance
 */
export const getStripeInstance = () => stripe;

export default stripe;