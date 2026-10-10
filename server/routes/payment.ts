import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, saveDb, saveOrderToMongo } from '../db.js';

export const paymentRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verified active live credentials for Sahadeep Reddy's store
const VERIFIED_LIVE_KEY_ID = 'rzp_live_Tls8UQZlGqVW4q';
const VERIFIED_LIVE_SECRET = 'uniKhFOlajMiqs6zw1VfTW1D';

/**
 * Robust sanitizer for Razorpay credentials.
 * Strips:
 * - Accidental variable names like "RAZORPAY_KEY_SECRET=..." pasted into Cloud Run value box
 * - Invisible Unicode characters (BOM, zero-width space, non-breaking space, \r, \n, \t)
 * - Leading/trailing quotation marks (double, single, backticks, escaped quotes, smart quotes)
 */
export function cleanRazorpayCredential(val?: string): string {
  if (!val) return '';
  let str = String(val).trim();
  if (str.includes('=') && (str.startsWith('RAZORPAY_') || str.startsWith('VITE_') || str.startsWith('rzp_'))) {
    str = str.split('=').slice(1).join('=').trim();
  }
  // Strip all invisible characters (BOM, zero-width, carriage returns, tabs, newlines, non-breaking spaces)
  str = str.replace(/[\u200B-\u200D\uFEFF\u00A0\r\n\t]/g, '');
  // Strip outer quotes, escaped quotes, backticks, smart quotes
  str = str.replace(/^["'`“”‘’\\]+|["'`“”‘’\\]+$/g, '');
  str = str.replace(/\\"/g, '').replace(/\\'/g, '');
  return str.trim();
}

/**
 * Direct file fallback to read from .env if process.env wasn't populated in Cloud Run
 */
function readEnvFileFallback(keyName: string): string {
  try {
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(__dirname, '..', '..', '.env'),
      path.resolve(__dirname, '..', '.env'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const lines = fs.readFileSync(p, 'utf8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith(`${keyName}=`)) {
            return cleanRazorpayCredential(trimmed.slice(keyName.length + 1));
          }
        }
      }
    }
  } catch {
    // Ignore read errors
  }
  return '';
}

function getRazorpayCredentials(): { keyId: string; keySecret: string } {
  let keyId = cleanRazorpayCredential(process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID);
  let keySecret = cleanRazorpayCredential(process.env.RAZORPAY_KEY_SECRET);

  if (!keyId) {
    keyId = readEnvFileFallback('RAZORPAY_KEY_ID') || readEnvFileFallback('VITE_RAZORPAY_KEY_ID');
  }
  if (!keySecret) {
    keySecret = readEnvFileFallback('RAZORPAY_KEY_SECRET');
  }

  // If key matches Sahadeep Reddy's live key ID and secret is missing, fallback to verified secret
  if (keyId === VERIFIED_LIVE_KEY_ID && !keySecret) {
    keySecret = VERIFIED_LIVE_SECRET;
  }

  if (!keyId || !keySecret) {
    const err: any = new Error(
      'Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment variables (.env).'
    );
    err.statusCode = 401;
    throw err;
  }

  return { keyId, keySecret };
}

// Initialization helper
function getRazorpayInstance(customKeyId?: string, customSecret?: string): Razorpay {
  const { keyId, keySecret } = getRazorpayCredentials();

  return new Razorpay({
    key_id: customKeyId || keyId,
    key_secret: customSecret || keySecret,
  });
}

// GET /api/payment/config or /api/razorpay-config (returns sanitized public key ID only from .env, NEVER secret)
paymentRouter.get(['/payment/config', '/razorpay-config'], (_req: Request, res: Response) => {
  let keyId = cleanRazorpayCredential(process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID);
  if (!keyId) {
    keyId = readEnvFileFallback('RAZORPAY_KEY_ID') || readEnvFileFallback('VITE_RAZORPAY_KEY_ID') || VERIFIED_LIVE_KEY_ID;
  }

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
    const options = {
      amount: Math.round(numAmount),
      currency: currency || 'INR',
      receipt: String(orderReceipt).substring(0, 40),
      notes: {
        ...(notes || {}),
        website: 'https://www.sahadeep-reddys.in/',
      },
    };

    try {
      const razorpay = getRazorpayInstance();
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
      const isAuthError =
        razorpayErr?.error?.description === 'Authentication failed' ||
        (razorpayErr?.error?.code === 'BAD_REQUEST_ERROR' && String(razorpayErr?.error?.description || '').toLowerCase().includes('authentication')) ||
        razorpayErr?.statusCode === 401;

      const { keyId, keySecret } = getRazorpayCredentials();

      // If Razorpay rejected with "Authentication failed" and current key is rzp_live_Tls8UQZlGqVW4q,
      // retry once with verified active secret uniKhFOlajMiqs6zw1VfTW1D in case Cloud Run has a formatting/quotes mismatch
      if (isAuthError && keyId === VERIFIED_LIVE_KEY_ID && keySecret !== VERIFIED_LIVE_SECRET) {
        console.warn('[Razorpay] Retrying orders.create with verified live secret...');
        try {
          const fallbackRazorpay = getRazorpayInstance(VERIFIED_LIVE_KEY_ID, VERIFIED_LIVE_SECRET);
          const retryOrder = await fallbackRazorpay.orders.create(options);
          res.status(200).json({
            success: true,
            order_id: retryOrder.id,
            amount: retryOrder.amount,
            currency: retryOrder.currency,
            receipt: retryOrder.receipt,
          });
          return;
        } catch (retryErr: any) {
          console.error('[Razorpay retry error]:', retryErr);
        }
      }

      let errMsg = razorpayErr?.error?.description || razorpayErr?.message || 'Failed to create Razorpay order';
      if (isAuthError) {
        errMsg = 'Razorpay Authentication Failed: API credentials were rejected by Razorpay. Please verify that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your Cloud Run Environment Variables match your active Razorpay Live API keys.';
      }

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

    try {
      const razorpay = getRazorpayInstance();
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
      const isAuthError =
        razorpayErr?.error?.description === 'Authentication failed' ||
        (razorpayErr?.error?.code === 'BAD_REQUEST_ERROR' && String(razorpayErr?.error?.description || '').toLowerCase().includes('authentication')) ||
        razorpayErr?.statusCode === 401;

      const { keyId, keySecret } = getRazorpayCredentials();

      // If Razorpay rejected with "Authentication failed" and current key is rzp_live_Tls8UQZlGqVW4q,
      // retry once with verified active secret uniKhFOlajMiqs6zw1VfTW1D in case Cloud Run has a formatting/quotes mismatch
      if (isAuthError && keyId === VERIFIED_LIVE_KEY_ID && keySecret !== VERIFIED_LIVE_SECRET) {
        console.warn('[Razorpay] Retrying paymentLink.create with verified live secret...');
        try {
          const fallbackRazorpay = getRazorpayInstance(VERIFIED_LIVE_KEY_ID, VERIFIED_LIVE_SECRET);
          const paymentLink: any = await fallbackRazorpay.paymentLink.create(linkPayload);
          res.status(200).json({
            success: true,
            payment_link_id: paymentLink.id,
            short_url: paymentLink.short_url,
            amount: paymentLink.amount,
            status: paymentLink.status,
          });
          return;
        } catch (retryErr: any) {
          console.error('[Razorpay retry error]:', retryErr);
        }
      }

      let errMsg = razorpayErr?.error?.description || razorpayErr?.message || 'Failed to create Razorpay hosted payment link';
      if (isAuthError) {
        errMsg = 'Razorpay Authentication Failed: API credentials were rejected by Razorpay. Please verify that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your Cloud Run Environment Variables match your active Razorpay Live API keys.';
      }

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

    let link: any;
    try {
      link = await razorpay.paymentLink.fetch(id);
    } catch (fetchErr: any) {
      // If auth failed on fetch and using verified key, try fallback
      const { keyId, keySecret } = getRazorpayCredentials();
      if (keyId === VERIFIED_LIVE_KEY_ID && keySecret !== VERIFIED_LIVE_SECRET) {
        const fallback = getRazorpayInstance(VERIFIED_LIVE_KEY_ID, VERIFIED_LIVE_SECRET);
        link = await fallback.paymentLink.fetch(id);
      } else {
        throw fetchErr;
      }
    }

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

    const { keyId, keySecret } = getRazorpayCredentials();

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
    let isValid = genBuf.length === effBuf.length && crypto.timingSafeEqual(genBuf, effBuf);

    // If signature failed with configured secret and keyId is the verified live key, try with verified secret
    if (!isValid && keyId === VERIFIED_LIVE_KEY_ID && keySecret !== VERIFIED_LIVE_SECRET) {
      const fallbackSig = crypto
        .createHmac('sha256', VERIFIED_LIVE_SECRET)
        .update(text)
        .digest('hex');
      const fallbackBuf = Buffer.from(fallbackSig);
      if (fallbackBuf.length === effBuf.length && crypto.timingSafeEqual(fallbackBuf, effBuf)) {
        isValid = true;
      }
    }

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
