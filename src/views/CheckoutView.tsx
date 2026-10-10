import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  ArrowLeft,
  Loader2,
  User,
  Lock,
  Mail,
  Phone,
  LogIn,
  Eye,
  EyeOff,
  ShoppingBag,
  ExternalLink,
  Globe,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { Address, Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { initiateRazorpayPayment, createRazorpayHostedPaymentLink } from '../services/razorpay';
import { RazorpayModal } from '../components/RazorpayModal';

interface CheckoutViewProps {
  onBack: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({ onBack, onOrderSuccess }) => {
  const { user, login, register, addAddress } = useAuth();
  const { cart, clearCart } = useCart();

  // Auth form states if user is not logged in
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    user?.addresses?.find((a) => a.isDefault)?.id || (user?.addresses?.[0]?.id || 'new')
  );

  // Address fields
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [state, setState] = useState('Telangana');
  const [pincode, setPincode] = useState('500033');
  const [landmark, setLandmark] = useState('');
  const [saveToAccount, setSaveToAccount] = useState(true);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [onlineSubMethod, setOnlineSubMethod] = useState<'hosted' | 'modal'>('hosted');
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [pendingAddress, setPendingAddress] = useState<Address | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Razorpay Hosted Gateway states (bypasses domain mismatch)
  const [hostedModalOpen, setHostedModalOpen] = useState(false);
  const [hostedPaymentUrl, setHostedPaymentUrl] = useState('');
  const [hostedPaymentId, setHostedPaymentId] = useState('');
  const [hostedPaymentStatus, setHostedPaymentStatus] = useState<'waiting' | 'paid' | 'checking'>('waiting');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const isDomainMismatchLikely = typeof window !== 'undefined' && !window.location.hostname.includes('sahadeep-reddys.in');

  const subtotal = cart.subtotal;
  const delivery = 0;
  const total = subtotal;

  // Sync address fields when user logs in
  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.name);
      if (!phone && user.phone) setPhone(user.phone);
      if (user.addresses && user.addresses.length > 0) {
        const defaultAddr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
        setSelectedAddressId(defaultAddr.id);
      }
    }
  }, [user]);

  // Check URL params if returning from Razorpay hosted payment link
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const plinkId = urlParams.get('razorpay_payment_link_id') || urlParams.get('payment_link_id');
    const plinkStatus = urlParams.get('razorpay_payment_link_status');
    const rzpPaymentId = urlParams.get('razorpay_payment_id');

    if (plinkId && (plinkStatus === 'paid' || rzpPaymentId)) {
      const savedAddrRaw = sessionStorage.getItem('pindi_pending_address');
      if (savedAddrRaw) {
        try {
          const savedAddr = JSON.parse(savedAddrRaw);
          const effectivePayId = rzpPaymentId || `plink_${plinkId}`;
          executeFinalCheckout(savedAddr, 'razorpay', effectivePayId);
          sessionStorage.removeItem('pindi_pending_address');
          // Clean query params from address bar
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
          console.error('Failed to parse saved address from session:', e);
        }
      }
    }
  }, []);

  // Poll Razorpay payment link status in background when hosted modal is open
  useEffect(() => {
    let intervalId: any = null;
    if (hostedModalOpen && hostedPaymentId && hostedPaymentStatus === 'waiting' && pendingAddress) {
      intervalId = setInterval(async () => {
        try {
          const statusRes = await api.checkPaymentLinkStatus(hostedPaymentId);
          if (statusRes.success && statusRes.isPaid) {
            clearInterval(intervalId);
            setHostedPaymentStatus('paid');
            const payId = statusRes.payment_id || `plink_pay_${hostedPaymentId}`;
            await executeFinalCheckout(pendingAddress, 'razorpay', payId);
            setHostedModalOpen(false);
          }
        } catch {
          // Keep polling silently
        }
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [hostedModalOpen, hostedPaymentId, hostedPaymentStatus, pendingAddress]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        await login(authEmail, authPassword);
      } else {
        await register(authName, authEmail, authPhone, authPassword);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const resolveAddress = (): Address | null => {
    if (selectedAddressId !== 'new' && user?.addresses) {
      const found = user.addresses.find((a) => a.id === selectedAddressId);
      if (!found) {
        setError('Selected address not found.');
        return null;
      }
      return found;
    }

    if (!fullName.trim() || !phone.trim() || !street.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      setError('Please fill in all required shipping address fields.');
      return null;
    }

    const addr: Address = {
      id: `addr_${Date.now()}`,
      fullName: fullName.trim(),
      phone: phone.trim(),
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      landmark: landmark.trim() || undefined,
    };

    if (user && saveToAccount) {
      addAddress(addr).catch(() => {});
    }

    return addr;
  };

  const executeFinalCheckout = async (targetAddress: Address, method: 'cod' | 'razorpay', paymentId?: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await api.checkout({
        customerName: targetAddress.fullName,
        customerEmail: user?.email || `${targetAddress.phone.replace(/[^0-9]/g, '')}@pindivantalu.guest`,
        customerPhone: targetAddress.phone,
        shippingAddress: targetAddress,
        paymentMethod: method,
        paymentId: paymentId,
        notes: notes.trim() || undefined,
        items: cart.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      });

      if (res.success && res.order) {
        try {
          await clearCart();
        } catch {
          // ignore cart clear error
        }
        onOrderSuccess(res.order);
      } else {
        setError(res.message || 'Checkout could not be completed.');
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayPayment = async (targetAddress: Address) => {
    setLoading(true);
    setError('');

    try {
      await initiateRazorpayPayment({
        amount: total,
        customerName: targetAddress.fullName || user?.name || fullName || 'Customer',
        customerEmail: user?.email || `${targetAddress.phone.replace(/[^0-9]/g, '')}@sahadeep-reddys.in`,
        customerPhone: targetAddress.phone || user?.phone || phone || '',
        receipt: `pv_${Date.now()}`,
        notes: {
          address: `${targetAddress.street}, ${targetAddress.city}, ${targetAddress.pincode}`,
          instructions: notes || '',
        },
        onSuccess: async (paymentData) => {
          // Signature was verified cryptographically via backend /api/verify-payment
          await executeFinalCheckout(targetAddress, 'razorpay', paymentData.paymentId);
        },
        onError: (errorMessage) => {
          setLoading(false);
          setError(errorMessage);
        },
        onDismiss: () => {
          setLoading(false);
          if (isDomainMismatchLikely) {
            setError('Payment modal closed. Domain mismatch detected on preview URL (registered website: https://www.sahadeep-reddys.in/). Please use the Official Razorpay Gateway (rzp.io) below to complete your payment.');
          } else {
            setError('Payment was cancelled by user. You can retry when ready.');
          }
        },
      });
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Payment processing failed. Please try again.');
    }
  };

  const handlePayViaHostedLink = async (targetAddress: Address) => {
    setLoading(true);
    setError('');

    try {
      // Save address in sessionStorage for URL redirect recovery
      sessionStorage.setItem('pindi_pending_address', JSON.stringify(targetAddress));
      sessionStorage.setItem('pindi_pending_notes', notes || '');

      const callbackUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/?payment_method=razorpay_link`
        : 'https://www.sahadeep-reddys.in/';

      const res = await createRazorpayHostedPaymentLink({
        amount: total,
        customerName: targetAddress.fullName || user?.name || fullName || 'Valued Customer',
        customerEmail: user?.email || `${targetAddress.phone.replace(/[^0-9]/g, '')}@sahadeep-reddys.in`,
        customerPhone: targetAddress.phone || user?.phone || phone || '',
        notes: {
          address: `${targetAddress.street}, ${targetAddress.city}, ${targetAddress.pincode}`,
          instructions: notes || '',
        },
        callbackUrl,
      });

      if (res.success && res.short_url) {
        setHostedPaymentUrl(res.short_url);
        setHostedPaymentId(res.payment_link_id);
        setHostedPaymentStatus('waiting');
        setHostedModalOpen(true);
        setPendingAddress(targetAddress);

        // Open official Razorpay hosted checkout page in a new window/tab
        const popup = window.open(res.short_url, '_blank');
        if (!popup) {
          // Pop-up was blocked by browser; user can click the button inside the modal
        }
      } else {
        setError(res.error || 'Failed to generate Razorpay payment link. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating Razorpay payment link.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckStatus = async () => {
    if (!hostedPaymentId || !pendingAddress) return;
    setIsCheckingStatus(true);
    try {
      const statusRes = await api.checkPaymentLinkStatus(hostedPaymentId);
      if (statusRes.success && statusRes.isPaid) {
        setHostedPaymentStatus('paid');
        const payId = statusRes.payment_id || `plink_pay_${hostedPaymentId}`;
        await executeFinalCheckout(pendingAddress, 'razorpay', payId);
        setHostedModalOpen(false);
      } else {
        setError('Payment has not been completed on Razorpay yet. Please complete the transaction on the Razorpay screen and click verify again.');
      }
    } catch (err: any) {
      setError('Could not verify status: ' + (err.message || 'Please try again.'));
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleOpenRazorpay = () => {
    setError('');
    if (cart.items.length === 0) {
      setError('Your cart is empty. Please add snacks before checking out.');
      return;
    }
    const addr = resolveAddress();
    if (!addr) return;
    setPendingAddress(addr);

    if (onlineSubMethod === 'modal') {
      handleRazorpayPayment(addr);
    } else {
      handlePayViaHostedLink(addr);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (cart.items.length === 0) {
      setError('Your cart is empty. Please add snacks before checking out.');
      return;
    }

    const targetAddress = resolveAddress();
    if (!targetAddress) return;

    if (paymentMethod === 'razorpay') {
      setPendingAddress(targetAddress);
      if (onlineSubMethod === 'modal') {
        await handleRazorpayPayment(targetAddress);
      } else {
        await handlePayViaHostedLink(targetAddress);
      }
      return;
    }

    await executeFinalCheckout(targetAddress, 'cod');
  };

  // If user is NOT logged in: Prompt login / register first before proceeding to checkout!
  if (!user) {
    if (typeof window !== 'undefined' && localStorage.getItem('pindi_auth_token')) {
      return (
        <div className="py-24 text-center text-stone-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-700 mb-2" />
          <p className="text-sm font-semibold">Preparing your checkout details...</p>
        </div>
      );
    }
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#78350F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shopping</span>
        </button>

        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden p-6 sm:p-10 max-w-lg mx-auto">
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-[#451A03]">
              <LogIn className="w-6 h-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-stone-900">
              {authMode === 'login' ? 'Sign In to Proceed to Checkout' : 'Create an Account to Checkout'}
            </h1>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Please log in to verify your contact details and securely deliver your homemade snacks.
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {authMode === 'register' && (
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ananya Rao"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-800"
                />
              </div>
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Mobile Number (for delivery coordination) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  type={showAuthPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 6 characters"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-800 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthPassword(!showAuthPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 transition-colors"
                  aria-label={showAuthPassword ? 'Hide password' : 'Show password'}
                >
                  {showAuthPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>{authMode === 'login' ? 'Sign In & Proceed to Checkout' : 'Create Account & Checkout'}</span>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-stone-600 border-t border-stone-100 pt-4">
            {authMode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                  }}
                  className="font-semibold text-[#78350F] hover:underline"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  className="font-semibold text-[#78350F] hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Back Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#78350F] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Shopping</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Main Checkout Flow */}
        <div className="lg:col-span-7 space-y-8">
          {error && (
            <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${
              error.toLowerCase().includes('mismatch') || error.toLowerCase().includes('website') || error.toLowerCase().includes('domain')
                ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                  error.toLowerCase().includes('mismatch') || error.toLowerCase().includes('website') || error.toLowerCase().includes('domain')
                    ? 'text-amber-700'
                    : 'text-rose-600'
                }`} />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">{error}</p>
                  {error.toLowerCase().includes('authentication') && (
                    <div className="pt-1.5 space-y-1.5 text-[11px] text-rose-800 leading-relaxed border-t border-rose-200">
                      <p>
                        <strong>How to resolve:</strong> Razorpay rejected the API Key ID or Key Secret on the server.
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>Verify that <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-semibold">RAZORPAY_KEY_ID</code> and <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-semibold">RAZORPAY_KEY_SECRET</code> in your Cloud Run Environment Variables or <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-semibold">.env</code> match without quotes or spaces.</li>
                        <li>Check your Razorpay Dashboard (Settings &gt; API Keys) to confirm the key is in Active status.</li>
                      </ul>
                    </div>
                  )}
                  {(error.toLowerCase().includes('mismatch') || error.toLowerCase().includes('website') || error.toLowerCase().includes('domain')) && (
                    <div className="pt-1.5 space-y-2 text-[11px] text-amber-900 leading-relaxed border-t border-amber-200">
                      <p>
                        <strong>Why did this happen?</strong> Your Razorpay account is in <strong>Live Mode</strong> registered for <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">https://www.sahadeep-reddys.in/</code>. Razorpay's security blocks standard popup checkouts on any preview/staging URLs.
                      </p>
                      <p>
                        <strong>Instant Solution:</strong> Use Razorpay's <strong>Official Hosted Gateway (rzp.io)</strong>. It runs directly on Razorpay's verified domain and completely bypasses website mismatch restrictions!
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const addr = resolveAddress();
                          if (addr) handlePayViaHostedLink(addr);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Pay ₹{total} via Official Gateway (rzp.io) Now</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Delivery Address */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <Truck className="w-5 h-5 text-amber-900" />
              <h2 className="font-display text-xl font-bold text-stone-900">
                1. Delivery Address
              </h2>
            </div>

            {/* Saved Addresses for logged in users */}
            {user.addresses && user.addresses.length > 0 && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Select Saved Address
                </label>
                <div className="space-y-2">
                  {user.addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-[#78350F] bg-amber-50/50 ring-1 ring-[#78350F]'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address_select"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-0.5 text-amber-900 focus:ring-amber-800"
                      />
                      <div className="text-xs text-stone-700 space-y-0.5">
                        <p className="font-bold text-stone-900">
                          {addr.fullName} <span className="font-normal font-mono">({addr.phone})</span>
                        </p>
                        <p>{addr.street}</p>
                        <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                        {addr.landmark && <p className="text-stone-500">Landmark: {addr.landmark}</p>}
                      </div>
                    </label>
                  ))}

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs font-semibold ${
                      selectedAddressId === 'new'
                        ? 'border-[#78350F] bg-amber-50/50 text-[#78350F]'
                        : 'border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address_select"
                      checked={selectedAddressId === 'new'}
                      onChange={() => setSelectedAddressId('new')}
                      className="text-amber-900 focus:ring-amber-800"
                    />
                    <span>Deliver to a New Address</span>
                  </label>
                </div>
              </div>
            )}

            {/* Address Form (if new address or no saved addresses) */}
            {(selectedAddressId === 'new' || !user.addresses || user.addresses.length === 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Recipient's name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Mobile Phone Number (for delivery updates) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Street Address, Flat / House No, Area *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flat 301, Fortune Towers, Madhapur"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hyderabad"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Telangana / Andhra Pradesh"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500033"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full text-xs p-2.5 border border-stone-300 rounded-lg font-mono focus:outline-none focus:border-amber-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nearby Landmark (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Near Metro Station"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Order Items */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <ShoppingBag className="w-5 h-5 text-amber-900" />
              <h2 className="font-display text-xl font-bold text-stone-900">
                2. Order Items ({cart.items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-16 h-16 rounded-xl object-contain bg-stone-100 shrink-0 p-1"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-stone-900 truncate">
                      {item.productName}
                    </h4>
                    <p className="text-xs text-stone-500 font-mono mt-0.5">
                      Qty: {item.quantity} · ₹{item.unitPrice}
                    </p>
                  </div>
                  <span className="text-sm font-bold font-mono tabular-nums text-stone-900">
                    ₹{item.subtotal}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 pt-4 border-t border-stone-100 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums text-stone-900">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-mono tabular-nums text-emerald-700 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Final Amount Payable</span>
                <span className="font-mono tabular-nums text-lg text-[#451A03]">
                  ₹{total}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Payment Method */}
          <form onSubmit={handleSubmitOrder} className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <CreditCard className="w-5 h-5 text-amber-900" />
              <h2 className="font-display text-xl font-bold text-stone-900">
                3. Payment Method
              </h2>
            </div>

            <div className="space-y-3">
              {/* Cash On Delivery */}
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-[#78350F] bg-amber-50/50 ring-1 ring-[#78350F]'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment_select"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 text-amber-900 focus:ring-amber-800"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-stone-900">
                      Cash on Delivery (COD)
                    </span>
                    <span className="bg-stone-100 text-stone-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                      Pay at Doorstep
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Pay with cash or UPI directly to the delivery person upon receiving your fresh package.
                  </p>
                </div>
              </label>

              {/* Online Payment */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  paymentMethod === 'razorpay'
                    ? 'border-[#78350F] bg-amber-50/50 ring-1 ring-[#78350F]'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_select"
                    checked={paymentMethod === 'razorpay'}
                    onChange={() => setPaymentMethod('razorpay')}
                    className="mt-1 text-amber-900 focus:ring-amber-800"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-stone-900">
                        Online Payment (UPI, Cards, NetBanking)
                      </span>
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded font-mono">
                        Razorpay Live
                      </span>
                      {isDomainMismatchLikely && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>Preview Mode</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      Pay instantly with Google Pay, PhonePe, Paytm, UPI QR, Credit/Debit Cards, or NetBanking.
                    </p>
                  </div>
                </label>

                {paymentMethod === 'razorpay' && (
                  <div className="mt-3.5 pt-3.5 border-t border-amber-200/60 space-y-3">
                    {/* Sub-method Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOnlineSubMethod('hosted')}
                        className={`p-3 rounded-xl border text-left transition-all relative ${
                          onlineSubMethod === 'hosted'
                            ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600'
                            : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs flex items-center gap-1.5 text-blue-900">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            Official Gateway (rzp.io)
                          </span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                            RECOMMENDED
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 leading-tight">
                          Hosted on official Razorpay domain. <strong>Zero domain mismatch errors</strong> on preview URLs!
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOnlineSubMethod('modal')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          onlineSubMethod === 'modal'
                            ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600'
                            : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs flex items-center gap-1.5 text-slate-800">
                            <CreditCard className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                            Popup Modal
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 leading-tight">
                          Embedded checkout popup for registered website: <code className="font-mono text-[10px]">sahadeep-reddys.in</code>
                        </p>
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="text-[11px] text-stone-600 font-medium">
                        {onlineSubMethod === 'hosted'
                          ? 'Opens verified Razorpay payment page'
                          : 'Opens embedded Razorpay modal'}
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenRazorpay}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{onlineSubMethod === 'hosted' ? 'Pay via rzp.io Now' : 'Open Razorpay Modal'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Special Instructions */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Order Notes / Delivery Instructions (optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Please leave with security guard, call before delivery"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 mt-4 font-semibold text-base rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
                paymentMethod === 'razorpay'
                  ? 'bg-blue-700 hover:bg-blue-800 text-white shadow-blue-900/20'
                  : 'bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7]'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Order with Kitchen...</span>
                </>
              ) : paymentMethod === 'razorpay' ? (
                <span>
                  {onlineSubMethod === 'hosted'
                    ? `Pay ₹${total} via Official Gateway (rzp.io)`
                    : `Pay Online with Razorpay · ₹${total}`}
                </span>
              ) : (
                <span>Place Order · ₹{total} (COD)</span>
              )}
            </button>
          </form>
        </div>

        {/* Right Summary: Sidebar Guarantee & Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-amber-50/80 rounded-2xl border border-amber-200 p-6 space-y-4 text-xs text-stone-600">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <span>Sahadeep Reddy's Freshness Guarantee</span>
            </div>
            <p className="text-xs leading-relaxed">
              Every single batch is packaged in multi-layered airtight sealed pouches with oxygen barrier film to retain authentic crispness and shelf life.
            </p>
            <ul className="space-y-2.5 mt-4">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                <span>Cold-pressed oils used for frying</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                <span>Zero preservatives or artificial colors</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                <span>Authentic Telugu heirloom recipes</span>
              </li>
            </ul>
          </div>

          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6">
            <h4 className="font-bold text-stone-900 mb-3 text-sm">Secure Fulfillment</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Your order is processed instantly in our traditional kitchens. Tracking updates will be sent to your registered mobile number once the batch is dispatched.
            </p>
          </div>
        </div>
      </div>

      {/* Razorpay Online Payment Gateway Modal (Popup Mode) */}
      {isRazorpayOpen && (
        <RazorpayModal
          isOpen={isRazorpayOpen}
          amount={total}
          customerName={pendingAddress?.fullName || user?.name || fullName || 'Customer'}
          customerEmail={user?.email || 'customer@sahadeep-reddys.in'}
          customerPhone={pendingAddress?.phone || user?.phone || phone || ''}
          orderNotes={notes}
          onClose={() => setIsRazorpayOpen(false)}
          onSuccess={async (paymentId) => {
            setIsRazorpayOpen(false);
            if (pendingAddress) {
              await executeFinalCheckout(pendingAddress, 'razorpay', paymentId);
            }
          }}
        />
      )}

      {/* Razorpay Official Hosted Gateway Modal (rzp.io) */}
      {hostedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 text-slate-800 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#0C2340] text-white p-5 flex items-center justify-between border-b border-blue-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl text-white shadow-md">
                  ₹
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm tracking-wide">Sahadeep Reddy's</span>
                    <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded font-mono font-medium">
                      OFFICIAL
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-200 font-mono mt-0.5">
                    Razorpay Live Gateway
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-blue-300 font-semibold">Payable</div>
                <div className="font-mono text-xl font-bold text-amber-300">₹{total}</div>
              </div>
            </div>

            {/* Sub-header banner */}
            <div className="bg-blue-50/90 px-5 py-2.5 border-b border-blue-100 flex items-center justify-between text-[11px] text-blue-900">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero Domain Restriction (rzp.io)</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-bold">
                100% SECURE
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <QrCode className="w-7 h-7 text-[#78350F]" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-stone-900 text-base">Complete Payment on Razorpay</h3>
                <p className="text-xs text-stone-600 leading-relaxed max-w-xs mx-auto">
                  A new tab with Razorpay's official checkout was opened. Pay using <strong>Google Pay, PhonePe, Paytm, UPI QR, Cards, or NetBanking</strong>.
                </p>
              </div>

              {/* Action: Open Tab if not opened */}
              {hostedPaymentUrl && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <span className="text-[11px] text-stone-500 block">
                    Did the payment tab not open automatically?
                  </span>
                  <a
                    href={hostedPaymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Click Here to Open Razorpay Payment Screen</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Live Polling Status */}
              <div className="flex items-center justify-center gap-2 text-xs text-stone-600 pt-1">
                <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                <span>Waiting for payment confirmation from Razorpay...</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setHostedModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualCheckStatus}
                disabled={isCheckingStatus}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCheckingStatus ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying with Razorpay...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>I've Completed Payment · Verify Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
