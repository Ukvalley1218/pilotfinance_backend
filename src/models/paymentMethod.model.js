import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    // Reference to Student
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    // Reference to User (for easier queries)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Stripe Payment Method ID
    stripePaymentMethodId: {
      type: String,
      required: true,
      unique: true,
    },
    // Card details (stored for display purposes)
    last4: {
      type: String,
      required: true,
    },
    brand: {
  type: String,
  enum: ["visa", "mastercard", "amex", "discover", "diners", "jcb", "unionpay"],
},
    expMonth: {
      type: Number,
      required: true,
    },
    expYear: {
      type: Number,
      required: true,
    },
    // Cardholder name (optional)
    cardholderName: {
      type: String,
      default: "",
    },
    // Whether this is the default payment method
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Active status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
paymentMethodSchema.index({ studentId: 1 });
paymentMethodSchema.index({ userId: 1 });

const PaymentMethod =
  mongoose.models.PaymentMethod ||
  mongoose.model("PaymentMethod", paymentMethodSchema);

export default PaymentMethod;