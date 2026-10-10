import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getDb, saveDb, saveOrderToMongo } from '../db.js';

export const paymentRouter = Router();

// Helper to sanitize and trim environment variables (removing stray spaces, quotes, newlines)
function getCleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

function getRazorpayCredentials(): { keyId: string; keySecret: string } {
  const keyId = getCleanEnv(process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID);
  const keySecret = getCleanEnv(process.env.RAZORPAY_KEY_SECRET);

  if (!keyId || !keySecret) {
    const err: any = new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment variables (.env).');
    err.statusCode = 401;
    throw err;
  }

  return { keyId, keySecret };
}

// Strict initialization fetching exclusively from .env / environment variables with whitespace trimming
function getRazorpayInstance(): Razorpay {
  const { keyId, keySecret } = getRazorpayCredentials();

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

// GET /api/payment/config or /api/razorpay-config (returns sanitized public key ID only from .env, NEVER secret)
paymentRouter.get(['/payment/config', '/razorpay-config'], (_req: Request, res: Response) => {
  const keyId = getCleanEnv(process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID);
  if (!keyId) {
    res.status(401).json({
      success: false,
      message: 'RAZORPAY_KEY_ID is not configured in environment variables (.env).',
      error: 'RAZORPAY_KEY_ID is not configured in environment variables (.env).',
    });
    return;
  }
  res.json({
    success: true,
    key_id: keyId,
    currency: 'INR',
    registered_website: 'https://www.sahadeep-reddys.in/',
  });
});

/**
 * STEP 1: BACKEND - Create Order (Standard Checkout)
 * Endpoint: POST /api/create-order or /api/payment/create-order
 * Request: { amount (paise), currency, receipt, notes }
 * Return: { order_id, amount, currency }
 * Minimum amount: 100 paise
 */
paymentRouter.post(['/create-order', '/payment/create-order'], async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body || {};

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount < 100) {
      res.status(400).json({
        success: false,
        message: 'Invalid amount. Minimum amount is 100 paise (₹1).',
        error: 'Invalid amount. Minimum amount is 100 paise (₹1).',
      });
      return;
    }

    const orderReceipt = receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    try {
      const razorpay = getRazorpayInstance();
      const options = {
        amount: Math.round(numAmount),
        currency: currency || 'INR',
        receipt: String(orderReceipt).substring(0, 40),
        notes: {
          ...(notes || {}),
          website: 'https://www.sahadeep-reddys.in/',
        },
      };

      const order = await razorpay.orders.create(options);
      res.status(200).json({
        success: true,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      });
      return;
    } catch (razorpayErr: any) {
      console.error('[Razorpay orders.create error]:', razorpayErr);
      const errMsg = razorpayErr?.error?.description || razorpayErr?.message || 'Failed to create Razorpay order';
      const statusCode = razorpayErr?.statusCode || (razorpayErr?.error?.code === 'BAD_REQUEST_ERROR' ? 400 : (errMsg.includes('not configured') ? 401 : 500));

      res.status(statusCode).json({
        success: false,
        message: errMsg,
        error: errMsg,
        details: razorpayErr?.error || razorpayErr,
      });
      return;
    }
  } catch (error: any) {
    console.error('[Razorpay create-order error]:', error);
    const statusCode = error?.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create Razorpay order',
      error: error.message || 'Failed to create Razorpay order',
    });
  }
});

/**
 * STEP 1B: BACKEND - Create Razorpay Hosted Payment Link (Bypasses website mismatch)
 * Endpoint: POST /api/create-payment-link or /api/payment/create-payment-link
 * Request: { amount, customerName, customerEmail, customerPhone, notes, description, callbackUrl }
 * Return: { success: true, payment_link_id, short_url, amount, status }
 */
paymentRouter.post(['/create-payment-link', '/payment/create-payment-link'], async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      amount,
      currency = 'INR',
      customerName,
      customerEmail,
      customerPhone,
      notes,
      description,
      callbackUrl,
    } = req.body || {};

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount < 100) {
      res.status(400).json({
        success: false,
        message: 'Invalid amount. Minimum amount is 100 paise (₹1).',
        error: 'Invalid amount. Minimum amount is 100 paise (₹1).',
      });
      return;
    }

    const cleanPhone = customerPhone ? String(customerPhone).replace(/\D/g, '').slice(-10) : '';

    try {
      const razorpay = getRazorpayInstance();
      const linkPayload: any = {
        amount: Math.round(numAmount),
        currency: currency || 'INR',
        accept_partial: false,
        description: description || "Sahadeep Reddy's Traditional Sweets & Snacks Order",
        customer: {
          name: customerName || 'Valued Customer',
          email: customerEmail || 'customer@sahadeep-reddys.in',
          contact: cleanPhone ? `+91${cleanPhone}` : undefined,
        },
        notify: {
          sms: Boolean(cleanPhone),
          email: Boolean(customerEmail && customerEmail.includes('@')),
        },
        reminder_enable: false,
        notes: {
          ...(notes || {}),
          website: 'https://www.sahadeep-reddys.in/',
          storeName: "Sahadeep Reddy's",
        },
      };

      if (callbackUrl) {
        linkPayload.callback_url = callbackUrl;
        linkPayload.callback_method = 'get';
      }

      const paymentLink: any = await razorpay.paymentLink.create(linkPayload);

      res.status(200).json({
        success: true,
        payment_link_id: paymentLink.id,
        short_url: paymentLink.short_url,
        amount: paymentLink.amount,
        status: paymentLink.status,
      });
      return;
    } catch (razorpayErr: any) {
      console.error('[Razorpay paymentLink.create error]:', razorpayErr);
      const errMsg = razorpayErr?.error?.description || razorpayErr?.message || 'Failed to create Razorpay hosted payment link';
      const statusCode = razorpayErr?.statusCode || (razorpayErr?.error?.code === 'BAD_REQUEST_ERROR' ? 400 : (errMsg.includes('not configured') ? 401 : 500));

      res.status(statusCode).json({
        success: false,
        message: errMsg,
        error: errMsg,
        details: razorpayErr?.error || razorpayErr,
      });
      return;
    }
  } catch (error: any) {
    console.error('[Razorpay create-payment-link error]:', error);
    const statusCode = error?.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create Razorpay hosted payment link',
      error: error.message || 'Failed to create Razorpay hosted payment link',
    });
  }
});

/**
 * STEP 2B: Check Razorpay Payment Link Status
 * Endpoint: GET /api/payment-link-status/:id or /api/payment/link-status/:id
 */
paymentRouter.get(['/payment-link-status/:id', '/payment/link-status/:id'], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      res.status(401).json({ success: false, error: 'Razorpay credentials not configured' });
      return;
    }

    const link: any = await razorpay.paymentLink.fetch(id);
    const isPaid = link.status === 'paid';
    const paymentId = link.payments?.[0]?.payment_id || (isPaid ? `plink_pay_${link.id}` : null);

    res.json({
      success: true,
      id: link.id,
      status: link.status,
      isPaid,
      amount: link.amount,
      amount_paid: link.amount_paid,
      payment_id: paymentId,
    });
  } catch (error: any) {
    console.error('[Razorpay payment-link-status error]:', error);
    res.status(500).json({
      success: false,
      error: error.error?.description || error.message || 'Failed to fetch payment link status',
    });
  }
});

/**
 * STEP 3: BACKEND - Verify Signature
 * Endpoint: POST /api/verify-payment or /api/payment/verify-payment
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * Compare generated signature with razorpay_signature
 * Return success only if signatures match
 */
paymentRouter.post(['/verify-payment', '/payment/verify-payment'], async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,
      payment_id,
      signature,
      systemOrderId,
    } = req.body;

    const keySecret = getCleanEnv(process.env.RAZORPAY_KEY_SECRET);

    if (!keySecret) {
      res.status(401).json({
        success: false,
        message: 'Razorpay secret key not configured on server.',
        error: 'Razorpay secret key not configured on server.',
      });
      return;
    }

    const effectiveOrderId = razorpay_order_id || order_id;
    const effectivePaymentId = razorpay_payment_id || payment_id;
    const effectiveSignature = razorpay_signature || signature;

    // Check for missing fields
    if (!effectiveOrderId || !effectivePaymentId || !effectiveSignature) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields for signature verification. Expected order_id, payment_id, and signature.',
      });
      return;
    }

    // Generate expected signature
    const text = `${effectiveOrderId}|${effectivePaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    // Constant-time comparison safely checking buffer lengths
    const genBuf = Buffer.from(generatedSignature);
    const effBuf = Buffer.from(String(effectiveSignature));
    const isValid = genBuf.length === effBuf.length && crypto.timingSafeEqual(genBuf, effBuf);

    if (!isValid) {
      res.status(400).json({
        success: false,
        error: 'Invalid payment signature. Payment verification failed.',
        verified: false,
      });
      return;
    }

    // If a system order ID was passed, update order payment status in database
    if (systemOrderId) {
      const db = getDb();
      const existingOrder = db.orders.find((o) => o.id === systemOrderId || o.orderNumber === systemOrderId);
      if (existingOrder) {
        existingOrder.paymentStatus = 'completed';
        existingOrder.paymentId = effectivePaymentId;
        existingOrder.updatedAt = new Date().toISOString();
        existingOrder.statusHistory.push({
          status: existingOrder.orderStatus,
          timestamp: new Date().toISOString(),
          note: `Razorpay payment verified successfully (Payment ID: ${effectivePaymentId}, Order ID: ${effectiveOrderId})`,
        });
        saveDb();
        saveOrderToMongo(existingOrder).catch(() => {});
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment signature verified successfully',
      verified: true,
      order_id: effectiveOrderId,
      payment_id: effectivePaymentId,
    });
  } catch (error: any) {
    console.error('[Razorpay verify-payment error]:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during signature verification',
    });
  }
});
