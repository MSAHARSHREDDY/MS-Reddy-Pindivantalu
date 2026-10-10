import React from 'react';
import { CheckCircle2, Package, Printer, ArrowRight, Truck } from 'lucide-react';
import { Order } from '../types';

interface OrderConfirmationViewProps {
  order: Order;
  onTrackOrder: (orderId: string) => void;
  onContinueShopping: () => void;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({
  order,
  onTrackOrder,
  onContinueShopping,
}) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Success Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-8 sm:p-10 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
            Order Successfully Placed!
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Thank you for ordering with PindiVantalu. Your traditional snacks are being prepared.
          </p>
        </div>

        {/* Order Number Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
          <span className="text-xs text-stone-600 font-medium">Order Reference:</span>
          <span className="font-mono text-sm font-bold text-amber-950 tracking-wider">
            {order.orderNumber}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <button
            onClick={() => onTrackOrder(order.id)}
            className="px-5 py-2.5 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Truck className="w-4 h-4" />
            <span>Track Order Status</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Order Details & Summary */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-6">
        <h2 className="font-display text-xl font-bold text-stone-900 border-b border-stone-100 pb-3">
          Order Summary & Delivery Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-stone-600">
          <div>
            <h3 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-1.5">
              Delivery Address
            </h3>
            <p className="font-semibold text-stone-900">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.street}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
            <p className="font-mono mt-1">Phone: {order.shippingAddress.phone}</p>
          </div>

          <div>
            <h3 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-1.5">
              Payment Details
            </h3>
            <p>
              Method:{' '}
              <strong className="text-stone-900 uppercase">
                {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
              </strong>
            </p>
            <p>
              Status:{' '}
              <span className={`font-semibold capitalize ${
                order.paymentStatus === 'completed' ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {order.paymentStatus}
              </span>
            </p>
            {order.paymentId && (
              <p className="font-mono text-[11px] text-stone-400 mt-1">
                Ref: {order.paymentId}
              </p>
            )}
          </div>
        </div>

        {/* Item Snapshots */}
        <div className="pt-4 border-t border-stone-100 space-y-3">
          <h3 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
            Items Ordered
          </h3>
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-100 text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-10 h-10 rounded object-cover bg-stone-200"
                  />
                  <div>
                    <p className="font-semibold text-stone-900">{item.productName}</p>
                    <p className="text-stone-500 font-mono">
                      ₹{item.unitPrice} × {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-bold font-mono tabular-nums text-stone-900">
                  ₹{item.subtotal}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="pt-4 border-t border-stone-100 space-y-1.5 text-xs text-stone-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums text-stone-900">₹{order.subtotal}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Coupon Discount ({order.couponCode})</span>
              <span className="font-mono tabular-nums">-₹{order.discount}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Delivery</span>
            <span className="font-mono tabular-nums text-emerald-700 font-semibold">FREE</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
            <span>Total Paid / Payable</span>
            <span className="font-mono tabular-nums text-base text-[#451A03]">
              ₹{order.totalAmount}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-100 flex justify-end">
          <button
            onClick={onContinueShopping}
            className="text-xs font-semibold text-[#78350F] hover:underline flex items-center gap-1"
          >
            <span>Continue Shopping for Snacks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
