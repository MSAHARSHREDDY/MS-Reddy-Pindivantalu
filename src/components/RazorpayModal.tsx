import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Lock, ArrowRight, Loader2, X, Smartphone, CreditCard, Building2, Wallet, QrCode, AlertCircle } from 'lucide-react';
import { initiateRazorpayPayment } from '../services/razorpay';

interface RazorpayModalProps {
  isOpen: boolean;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderNotes?: string;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upi' | 'card' | 'netbanking' | 'wallet'>('upi');
  const [upiMethod, setUpiMethod] = useState<'app' | 'id' | 'qr'>('app');
  const [selectedUpiApp, setSelectedUpiApp] = useState('Google Pay');
  const [upiId, setUpiId] = useState('');
  
  // Card states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState(customerName || '');

  // NetBanking state
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Wallet state
  const [selectedWallet, setSelectedWallet] = useState('Paytm');

  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handlePay = async () => {
    setProcessing(true);
    setErrorMessage('');
    setProcessingStep('Creating Razorpay order on server...');

    try {
      await initiateRazorpayPayment({
        amount,
        customerName,
        customerEmail,
        customerPhone,
        receipt: `pv_${Date.now()}`,
        notes: {
          customerName,
          selectedMethod: activeTab,
        },
        onSuccess: (paymentData) => {
          setProcessing(false);
          onSuccess(paymentData.paymentId);
        },
        onError: (errMsg) => {
          setProcessing(false);
          setErrorMessage(errMsg);
        },
        onDismiss: () => {
          setProcessing(false);
          setErrorMessage('Payment cancelled by user.');
        },
      });
    } catch (err: any) {
      setProcessing(false);
      setErrorMessage(err.message || 'Payment initiation failed.');
    }
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={processing ? undefined : onClose}
        className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs transition-opacity"
      />

      {/* Razorpay Checkout Container */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 z-10 flex flex-col text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[95vh]">
        {/* Razorpay Brand Header */}
        <div className="bg-[#0C2340] text-white p-5 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold font-sans text-xl shadow-md text-white">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-wide text-white">Sahadeep Reddy's</span>
                <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded font-mono font-medium">VERIFIED</span>
              </div>
              <p className="text-[11px] text-blue-200 font-mono mt-0.5">
                {customerPhone ? `+91 ${customerPhone.slice(-10)}` : customerEmail}
              </p>
            </div>
          </div>

          <div className="text-right flex items-center gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-blue-300 font-semibold">Payable Amount</div>
              <div className="font-mono text-xl font-bold text-amber-300">₹{amount}</div>
            </div>
            {!processing && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-blue-800/60 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Razorpay Security Bar */}
        <div className="bg-blue-50/90 px-5 py-2 border-b border-blue-100 flex items-center justify-between text-[11px] text-blue-900">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
            <span>Razorpay 256-Bit SSL Encrypted Payment</span>
          </div>
          <span className="font-mono text-[10px] text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded font-bold">
            TEST & LIVE READY
          </span>
        </div>

        {errorMessage && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Processing State Overlay */}
        {processing ? (
          <div className="p-10 text-center space-y-4 flex flex-col items-center justify-center my-auto">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
              <Lock className="w-6 h-6 text-blue-600 absolute inset-0 m-auto" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">Processing Payment</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">{processingStep}</p>
            </div>
            <div className="text-[11px] text-stone-400 font-mono pt-2">
              Please do not refresh or click back
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Payment Method Tabs */}
            <div className="grid grid-cols-4 border-b border-slate-200 text-xs font-semibold bg-slate-50/80">
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className={`py-3 px-2 flex flex-col items-center gap-1 border-b-2 transition-all ${
                  activeTab === 'upi'
                    ? 'border-blue-600 text-blue-700 bg-white shadow-2xs font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`py-3 px-2 flex flex-col items-center gap-1 border-b-2 transition-all ${
                  activeTab === 'card'
                    ? 'border-blue-600 text-blue-700 bg-white shadow-2xs font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('netbanking')}
                className={`py-3 px-2 flex flex-col items-center gap-1 border-b-2 transition-all ${
                  activeTab === 'netbanking'
                    ? 'border-blue-600 text-blue-700 bg-white shadow-2xs font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>NetBanking</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('wallet')}
                className={`py-3 px-2 flex flex-col items-center gap-1 border-b-2 transition-all ${
                  activeTab === 'wallet'
                    ? 'border-blue-600 text-blue-700 bg-white shadow-2xs font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Wallets</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5 space-y-4">
              {/* 1. UPI TAB */}
              {activeTab === 'upi' && (
                <div className="space-y-4 text-xs">
                  <div className="flex rounded-lg bg-slate-100 p-1 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setUpiMethod('app')}
                      className={`flex-1 py-1.5 rounded-md text-center transition-all ${
                        upiMethod === 'app' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Popular UPI Apps
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiMethod('id')}
                      className={`flex-1 py-1.5 rounded-md text-center transition-all ${
                        upiMethod === 'id' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Enter UPI ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiMethod('qr')}
                      className={`flex-1 py-1.5 rounded-md text-center transition-all ${
                        upiMethod === 'qr' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Scan QR Code
                    </button>
                  </div>

                  {upiMethod === 'app' && (
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      {[
                        { name: 'Google Pay', icon: '🟢', desc: 'Instant UPI' },
                        { name: 'PhonePe', icon: '🟣', desc: 'Fast Checkout' },
                        { name: 'Paytm UPI', icon: '🔵', desc: 'Direct Bank UPI' },
                        { name: 'BHIM / Any UPI', icon: '🇮🇳', desc: 'Govt. NPCI UPI' },
                      ].map((app) => (
                        <button
                          key={app.name}
                          type="button"
                          onClick={() => setSelectedUpiApp(app.name)}
                          className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                            selectedUpiApp === app.name
                              ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <span className="text-xl">{app.icon}</span>
                          <div>
                            <div className="font-bold text-slate-900">{app.name}</div>
                            <div className="text-[10px] text-slate-500">{app.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {upiMethod === 'id' && (
                    <div className="space-y-2 pt-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Virtual Payment Address (VPA / UPI ID)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. mobile@okhdfcbank or user@ybl"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
                      />
                      <p className="text-[10px] text-slate-500">
                        A payment collect request will be sent to your UPI app for ₹{amount}.
                      </p>
                    </div>
                  )}

                  {upiMethod === 'qr' && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                      <div className="w-36 h-36 bg-white p-2 mx-auto rounded-lg border border-slate-300 flex items-center justify-center shadow-xs">
                        <QrCode className="w-32 h-32 text-slate-900" />
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700">
                        Scan with any UPI App (GPay, PhonePe, Paytm)
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Amount: <strong className="font-mono text-slate-900">₹{amount}</strong> · No convenience fee
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 2. CARDS TAB */}
              {activeTab === 'card' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="4532 8765 4321 0987"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Name on Card
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. S. Reddy"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cards accepted: Visa, MasterCard, RuPay, Maestro</span>
                  </div>
                </div>
              )}

              {/* 3. NETBANKING TAB */}
              {activeTab === 'netbanking' && (
                <div className="space-y-3 text-xs">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Select Your Bank
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'Punjab National Bank'].map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                          selectedBank === bank
                            ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-bold ring-1 ring-blue-600'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        {bank}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. WALLETS TAB */}
              {activeTab === 'wallet' && (
                <div className="space-y-3 text-xs">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Select Digital Wallet
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Paytm Wallet', 'Amazon Pay Balance', 'PhonePe Wallet', 'MobiKwik'].map((wallet) => (
                      <button
                        key={wallet}
                        type="button"
                        onClick={() => setSelectedWallet(wallet)}
                        className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                          selectedWallet === wallet
                            ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-bold ring-1 ring-blue-600'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        {wallet}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePay}
                className="flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Pay ₹{amount} with Razorpay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
