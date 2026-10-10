/**
 * Razorpay Standard Web Checkout Integration
 * Handles:
 * 1. Loading https://checkout.razorpay.com/v1/checkout.js
 * 2. Calling backend POST /api/create-order
 * 3. Opening Razorpay modal with order_id
 * 4. Capturing payment response (razorpay_payment_id, razorpay_order_id, razorpay_signature)
 * 5. Calling backend POST /api/verify-payment for cryptographic HMAC-SHA256 signature verification
 * 6. Handling modal dismiss (user cancelled) and payment.failed events
 */

import { api } from './api';

export interface RazorpayCheckoutOptions {
  amount: number; // in Rupees (e.g. 450)
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  receipt?: string;
  notes?: Record<string, string>;
  onSuccess: (paymentData: {
    paymentId: string;
    orderId: string;
    signature: string;
  }) => void;
  onError: (errorMessage: string) => void;
  onDismiss?: () => void;
}

// Dynamically load the Razorpay checkout.js script if not already present
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout SDK');
      resolve(false);
    };
    document.head.appendChild(script);
  });
};

export const initiateRazorpayPayment = async ({
  amount,
  customerName,
  customerEmail,
  customerPhone,
  receipt,
  notes = {},
  onSuccess,
  onError,
  onDismiss,
}: RazorpayCheckoutOptions): Promise<void> => {
  try {
    // 1. Ensure amount is valid (minimum ₹1 = 100 paise)
    const amountInPaise = Math.round(amount * 100);
    if (amountInPaise < 100) {
      onError('Order amount must be at least ₹1 (100 paise).');
      return;
    }

    // 2. Ensure SDK is loaded
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded || !(window as any).Razorpay) {
      onError('Razorpay checkout script failed to load. Please check your internet connection.');
      return;
    }

    // 3. Resolve Public Key ID (from Vite env or backend config)
    let keyId = (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined)?.trim();
    if (!keyId) {
      try {
        const config = await api.getRazorpayConfig();
        if (config.key_id) {
          keyId = config.key_id.trim();
        }
      } catch (err: any) {
        console.warn('Could not fetch Razorpay key from server config:', err);
      }
    }

    if (!keyId) {
      onError('Razorpay Key ID is not configured. Please set VITE_RAZORPAY_KEY_ID.');
      return;
    }

    // 4. STEP 1: BACKEND - Call /api/create-order
    const orderReceipt = receipt || `pv_rcpt_${Date.now()}`;
    const orderResponse = await api.createRazorpayOrder({
      amount: amountInPaise,
      currency: 'INR',
      receipt: orderReceipt,
      notes,
    });

    if (!orderResponse || !orderResponse.order_id) {
      onError(orderResponse?.error || 'Failed to initialize payment order on server.');
      return;
    }

    const razorpayOrderId = orderResponse.order_id;

    // Clean phone number for prefill (e.g. 10-digit)
    const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10);

    // 5. STEP 2: FRONTEND - Open Razorpay Modal with order_id
    const options = {
      key: keyId,
      amount: orderResponse.amount,
      currency: orderResponse.currency || 'INR',
      name: "Sahadeep Reddy's",
      description: "Traditional Telugu Snacks & Sweets",
      image: "/src/assets/images/logo.png",
      order_id: razorpayOrderId,
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: cleanPhone ? `+91${cleanPhone}` : undefined,
      },
      notes: {
        ...notes,
        customerName,
      },
      theme: {
        color: '#78350F', // Brand primary amber
      },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        try {
          // 6. STEP 3: BACKEND - Verify Signature
          const verifyResult = await api.verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (verifyResult.success && verifyResult.verified) {
            onSuccess({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });
          } else {
            onError(verifyResult.message || 'Payment signature verification failed. Please contact support.');
          }
        } catch (err: any) {
          onError(err.message || 'Payment verification failed on server.');
        }
      },
      modal: {
        ondismiss: function () {
          if (onDismiss) {
            onDismiss();
          } else {
            const isDomainMismatchLikely = typeof window !== 'undefined' && !window.location.hostname.includes('sahadeep-reddys.in');
            if (isDomainMismatchLikely) {
              onError('Payment modal closed. If Razorpay blocked the payment due to website mismatch, please use the Official Razorpay Gateway (rzp.io) below.');
            } else {
              onError('Payment was cancelled.');
            }
          }
        },
      },
    };

    const razorpayInstance = new (window as any).Razorpay(options);

    // Handle payment.failed event
    razorpayInstance.on('payment.failed', function (response: any) {
      const errorDetail =
        response.error?.description ||
        response.error?.reason ||
        response.error?.message ||
        'Transaction could not be completed.';
      onError(`Payment failed: ${errorDetail}`);
    });

    razorpayInstance.open();
  } catch (error: any) {
    console.error('Razorpay initiation error:', error);
    onError(error.message || 'An error occurred while launching Razorpay checkout.');
  }
};

/**
 * Creates a Razorpay Hosted Payment Link on official rzp.io domain.
 * This completely bypasses website domain mismatch errors because
 * the payment page is hosted directly on Razorpay's verified domain.
 */
export const createRazorpayHostedPaymentLink = async ({
  amount,
  customerName,
  customerEmail,
  customerPhone,
  notes = {},
  description,
  callbackUrl,
}: {
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  notes?: Record<string, string>;
  description?: string;
  callbackUrl?: string;
}) => {
  const amountInPaise = Math.round(amount * 100);
  return await api.createRazorpayPaymentLink({
    amount: amountInPaise,
    customerName,
    customerEmail,
    customerPhone,
    notes: {
      ...notes,
      registeredWebsite: 'https://www.sahadeep-reddys.in/',
    },
    description: description || "Sahadeep Reddy's Traditional Snacks & Sweets",
    callbackUrl,
  });
};
