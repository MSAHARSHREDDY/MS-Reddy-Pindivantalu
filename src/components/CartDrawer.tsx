import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface CartDrawerProps {
  onCheckout: () => void;
  onExplore: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onCheckout, onExplore }) => {
  const {
    cart,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
  } = useCart();
  const { user, openAuthModal } = useAuth();

  if (!isDrawerOpen) return null;

  const finalSubtotal = cart.subtotal;
  const delivery = 0;
  const finalTotal = finalSubtotal;

  const handleProceedToCheckout = () => {
    const hasAuthToken = typeof window !== 'undefined' && !!localStorage.getItem('pindi_auth_token');
    if (!user && !hasAuthToken) {
      openAuthModal(
        'register',
        () => {
          closeDrawer();
          onCheckout();
        },
        'Please create an account or sign in to complete your checkout. Your selected snacks are waiting in your cart!'
      );
    } else {
      closeDrawer();
      onCheckout();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-[#FAF7F2] shadow-2xl flex flex-col">
          {/* Header with Back button and Close */}
          <div className="p-4 sm:p-5 bg-white border-b border-stone-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={closeDrawer}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                aria-label="Back to store"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-1.5 pl-1">
                <h2 className="font-display text-lg font-bold text-stone-900">
                  Your Cart
                </h2>
                <span className="text-xs text-stone-500 font-medium">
                  ({cart.items.reduce((s, i) => s + i.quantity, 0)})
                </span>
              </div>
            </div>
            <button
              onClick={closeDrawer}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-900 text-2xl">
                  🍲
                </div>
                <h3 className="font-display text-lg font-semibold text-stone-800">
                  Your cart is empty
                </h3>
                <p className="text-xs text-stone-500 max-w-xs">
                  Discover freshly fried traditional Andhra Murukulu, Mixtures, and sweets prepared using authentic recipes.
                </p>
                <button
                  onClick={() => {
                    closeDrawer();
                    onExplore();
                  }}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2.5 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Explore Snacks</span>
                </button>
              </div>
            ) : (
              cart.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-3 border border-stone-200/70 shadow-2xs flex gap-3 items-center"
                >
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-16 h-16 rounded-lg object-contain bg-stone-100 shrink-0 p-1"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-stone-900 truncate">
                      {item.productName}
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5 font-medium">
                      {item.variantName || item.weight} · ₹{item.unitPrice} each
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-stone-200 rounded-md bg-stone-50">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-stone-600 hover:text-stone-900 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-semibold font-mono tabular-nums text-stone-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.availableStock}
                          className="p-1 text-stone-600 hover:text-stone-900 disabled:opacity-30 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 font-mono tabular-nums">
                          ₹{item.subtotal}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Area */}
          {cart.items.length > 0 && (
            <div className="p-4 sm:p-5 bg-white border-t border-stone-200/80 space-y-3">
              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums text-stone-800">₹{finalSubtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="font-mono tabular-nums text-emerald-700 font-semibold">FREE</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-stone-900 pt-1.5 border-t border-stone-200">
                  <span>Total Amount</span>
                  <span className="font-mono tabular-nums text-base text-[#451A03]">
                    ₹{finalTotal}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] rounded-xl font-semibold text-sm shadow-md transition-colors"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={closeDrawer}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold text-xs transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Shopping</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>100% Homemade · Fresh Batch Guarantee · Secure Checkout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
