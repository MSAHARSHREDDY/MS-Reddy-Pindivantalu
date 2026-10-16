import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, Truck, ArrowRight, X, Sparkles, MapPin, CreditCard, ShoppingBag } from 'lucide-react';
import { Order } from '../types';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onTrackOrder: (orderId: string) => void;
  onContinueShopping: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen,
  order,
  onClose,
  onTrackOrder,
  onContinueShopping,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const handleCopyOrderNumber = () => {
    if (order.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isPaidOnline = order.paymentMethod === 'razorpay' || order.paymentStatus === 'completed';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Dimmed backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Dialog - Robust responsive container for mobile & desktop */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-stone-200 z-10 flex flex-col max-h-[92dvh] sm:max-h-[88vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-3.5 sm:p-5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm sm:text-base tracking-wide text-white">Order Confirmed!</span>
                <span className="text-[10px] bg-emerald-950/50 text-emerald-100 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  {isPaidOnline ? 'PAID ONLINE' : 'COD'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 font-medium truncate mt-0.5">
                Freshly handcrafted in traditional kitchen
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 -mr-1 rounded-xl text-emerald-100 hover:text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Close confirmation popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body - single clean touch scroll container */}
        <div className="overflow-y-auto overscroll-contain flex-1 p-3.5 sm:p-5 space-y-3 sm:space-y-4 text-xs text-stone-700">
          {/* Order Reference Box */}
          <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200/90 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] text-amber-900/80 font-bold uppercase tracking-wider block">
                Order Reference Number
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-amber-950 tracking-wider truncate block">
                {order.orderNumber}
              </span>
            </div>
            <button
              onClick={handleCopyOrderNumber}
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-amber-300 text-amber-950 text-[11px] font-semibold rounded-lg hover:bg-amber-100 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
              title="Copy Order Number"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Payment & Amount Summary */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">Total Amount</span>
              <span className="font-mono text-base font-bold text-stone-900">₹{order.totalAmount}</span>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Free Delivery Included</span>
            </div>

            <div className="p-2.5 sm:p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">Payment Method</span>
              {isPaidOnline ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  ✓ Paid via Razorpay
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Cash on Delivery (COD)
                </span>
              )}
              {order.paymentId && (
                <span className="font-mono text-[9px] text-stone-400 block mt-1 truncate">
                  ID: {order.paymentId}
                </span>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          {order.shippingAddress && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <div className="flex items-center gap-1 text-stone-700 font-bold text-[10px] uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                <span>Delivery Address</span>
              </div>
              <p className="font-semibold text-stone-900 text-xs">
                {order.shippingAddress.fullName || order.customerName} · {order.shippingAddress.phone || order.customerPhone}
              </p>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                {[order.shippingAddress.street, order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.pincode].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {/* Ordered Snacks List - Clean display without nested scroll locks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-stone-700 font-bold text-[10px] uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                <span>Items Ordered ({order.items.length})</span>
              </span>
              <span className="text-[10px] text-stone-400 font-normal">Fresh Kitchen Batch</span>
            </div>

            <div className="space-y-1.5">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 bg-stone-50 rounded-lg border border-stone-200/80"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-md object-contain bg-white border border-stone-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-amber-100 border border-stone-200 flex items-center justify-center text-[10px] font-bold text-amber-900 shrink-0">
                        {item.productName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 text-xs truncate">{item.productName}</p>
                      <p className="text-[10px] text-stone-500 font-mono">
                        {item.variantName ? `${item.variantName} · ` : ''}Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-xs text-stone-900 shrink-0">
                    ₹{item.subtotal}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions - Touch-friendly and safe on mobile */}
        <div className="p-3 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => {
              onClose();
              onContinueShopping();
            }}
            type="button"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 active:scale-98 font-semibold text-xs transition-all text-center cursor-pointer order-2 sm:order-1"
          >
            Continue Shopping
          </button>

          <button
            onClick={() => {
              onClose();
              onTrackOrder(order.id);
            }}
            type="button"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#451A03] hover:bg-[#78350F] active:scale-98 text-[#FEF3C7] font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
          >
            <Truck className="w-4 h-4 text-amber-300" />
            <span>Track Order Timeline</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
          </button>
        </div>
      </div>
    </div>
  );
};
