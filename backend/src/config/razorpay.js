import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpayInstance = null;

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.'
    );
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
};

/**
 * Create a Razorpay order for an invoice
 * @param {Object} orderData - { amount (in paise), currency, receipt, notes }
 * @returns {Promise<Object>} Razorpay order object
 */
export const createOrder = async (amount, currency = 'INR', notes = {}) => {
  try {
    const client = getRazorpayClient();
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency,
      notes: notes,
    };
    
    const order = await client.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    throw new Error(`Failed to create Razorpay order: ${error.message}`);
  }
};

/**
 * Fetch an existing Razorpay order
 * @param {String} orderId - Razorpay order ID
 * @returns {Promise<Object>} Razorpay order object
 */
export const fetchOrder = async (orderId) => {
  try {
    const client = getRazorpayClient();
    const order = await client.orders.fetch(orderId);
    return order;
  } catch (error) {
    console.error('Razorpay Order Fetch Error:', error);
    throw new Error(`Failed to fetch Razorpay order: ${error.message}`);
  }
};

/**
 * Verify Razorpay payment signature
 * @param {Object} paymentData - { orderId, paymentId, signature }
 * @returns {Boolean} true if signature is valid
 */
export const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generated_signature === razorpaySignature;
  } catch (error) {
    console.error('Signature Verification Error:', error);
    return false;
  }
};

/**
 * Fetch payment details from Razorpay
 * @param {String} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} Payment details
 */
export const fetchPayment = async (paymentId) => {
  try {
    const client = getRazorpayClient();
    const payment = await client.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Fetch Payment Error:', error);
    throw new Error(`Failed to fetch payment: ${error.message}`);
  }
};

/**
 * Capture a payment (for authorized payments)
 * @param {String} paymentId - Razorpay payment ID
 * @param {Number} amount - Amount to capture (in paise)
 * @returns {Promise<Object>} Captured payment object
 */
export const capturePayment = async (paymentId, amount) => {
  try {
    const client = getRazorpayClient();
    const payment = await client.payments.capture(
      paymentId,
      Math.round(amount * 100), // Convert to paise
      'INR'
    );
    return payment;
  } catch (error) {
    console.error('Capture Payment Error:', error);
    throw new Error(`Failed to capture payment: ${error.message}`);
  }
};

/**
 * Create a refund for a payment
 * @param {String} paymentId - Razorpay payment ID
 * @param {Number} amount - Amount to refund (optional, full refund if not provided)
 * @returns {Promise<Object>} Refund object
 */
export const createRefund = async (paymentId, amount = null) => {
  try {
    const client = getRazorpayClient();
    const options = {};
    if (amount) {
      options.amount = Math.round(amount * 100); // Convert to paise
    }
    
    const refund = await client.payments.refund(paymentId, options);
    return refund;
  } catch (error) {
    console.error('Create Refund Error:', error);
    throw new Error(`Failed to create refund: ${error.message}`);
  }
};

/**
 * Fetch all refunds for a payment
 * @param {String} paymentId - Razorpay payment ID
 * @returns {Promise<Array>} List of refunds
 */
export const fetchRefunds = async (paymentId) => {
  try {
    const client = getRazorpayClient();
    const refunds = await client.payments.fetchMultipleRefund(paymentId);
    return refunds.items;
  } catch (error) {
    console.error('Fetch Refunds Error:', error);
    throw new Error(`Failed to fetch refunds: ${error.message}`);
  }
};