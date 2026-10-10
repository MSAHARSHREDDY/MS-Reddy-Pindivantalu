import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  AlertCircle,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { api } from '../services/api';

interface OrderTrackViewProps {
  initialOrderId?: string;
  onExploreSnacks: () => void;
  onBack?: () => void;
}

const STAGES: { status: OrderStatus; label: string; description: string }[] = [
  { status: 'placed', label: 'Order Placed', description: 'Order details recorded in system' },
  { status: 'confirmed', label: 'Confirmed', description: 'Batch scheduled at kitchen' },
  { status: 'preparing', label: 'Preparing', description: 'Freshly fried with cold-pressed oil' },
  { status: 'packed', label: 'Packed & Sealed', description: 'Nitrogen-flushed multi-layer pack' },
  { status: 'dispatched', label: 'Dispatched', description: 'Package is being handed over to courier' },
  { status: 'shipped', label: 'Out for Delivery', description: 'Handed over to courier partner' },
  { status: 'delivered', label: 'Delivered', description: 'Safely delivered to customer' },
];

export const OrderTrackView: React.FC<OrderTrackViewProps> = ({ initialOrderId, onExploreSnacks, onBack }) => {
  const [orderQuery, setOrderQuery] = useState(initialOrderId || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchOrder = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getOrderById(query.trim());
      if (res.success && res.order) {
        setOrder(res.order);
      } else {
        setError('Order not found. Please check your order number or reference ID.');
        setOrder(null);
      }
    } catch (err: any) {
      setError(err.message || 'Could not fetch order tracking info.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderId) {
      setOrderQuery(initialOrderId);
      fetchOrder(initialOrderId);
    }
  }, [initialOrderId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(orderQuery);
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    const confirmCancel = window.confirm('Are you sure you want to cancel this order? This will restore stock.');
    if (!confirmCancel) return;

    setCancelLoading(true);
    try {
      const res = await api.cancelOrder(order.id);
      if (res.success && res.order) {
        setOrder(res.order);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order.');
    } finally {
      setCancelLoading(false);
    }
  };

  const currentStageIndex = order
    ? STAGES.findIndex((s) => s.status === order.orderStatus)
    : -1;

  const isCancelled = order?.orderStatus === 'cancelled';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {onBack && (
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-50 hover:text-amber-900 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}

      {/* Header & Search */}
      <div className="text-center space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-stone-900">
          Track Your Traditional Snack Order
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
          View your PindiVantalu order preparation and shipment timeline.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Tracking Result */}
      {order && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-8 shadow-sm">
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-stone-900">
                  {order.orderNumber}
                </span>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded capitalize border ${
                  isCancelled
                    ? 'bg-rose-500 text-white border-transparent'
                    : order.orderStatus === 'delivered'
                    ? 'bg-emerald-500 text-white border-transparent'
                    : order.orderStatus === 'dispatched' || order.orderStatus === 'shipped'
                    ? 'bg-blue-500 text-white border-transparent'
                    : order.orderStatus === 'packed' || order.orderStatus === 'preparing'
                    ? 'bg-orange-500 text-white border-transparent'
                    : order.orderStatus === 'confirmed'
                    ? 'bg-sky-500 text-white border-transparent'
                    : 'bg-amber-500 text-white border-transparent'
                }`}>
                  {order.orderStatus}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Cancel Action if eligible */}
            {!isCancelled && ['placed', 'confirmed'].includes(order.orderStatus) && (
              <button
                onClick={handleCancelOrder}
                disabled={cancelLoading}
                className="text-xs text-rose-700 hover:text-rose-900 font-semibold underline self-start sm:self-auto"
              >
                {cancelLoading ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>

          {/* Stepper Progress Bar */}
          {!isCancelled ? (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Fulfilment Timeline
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {STAGES.map((stage, idx) => {
                  const isCompleted = idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  return (
                    <div
                      key={stage.status}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isCurrent
                          ? 'border-[#78350F] bg-amber-50 ring-2 ring-amber-200'
                          : isCompleted
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-stone-200 bg-stone-50 opacity-50'
                      }`}
                    >
                      <div className="flex justify-center mb-1.5">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        ) : (
                          <Clock className="w-5 h-5 text-stone-400" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-stone-900">{stage.label}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                        {stage.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-3 text-xs text-rose-800">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">This order has been cancelled.</p>
                <p className="text-rose-600 mt-0.5">
                  Refund has been scheduled and stock has been restored to kitchen inventory.
                </p>
              </div>
            </div>
          )}

          {/* Status History Notes */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <h2 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Kitchen & Delivery Logs
              </h2>
              <div className="space-y-2">
                {order.statusHistory.map((entry, idx) => (
                  <div key={idx} className="flex items-start justify-between text-xs text-stone-600 py-1 border-b border-stone-50">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-700" />
                      <span className="font-semibold text-stone-800 capitalize">{entry.status}:</span>
                      <span>{entry.note || 'Status updated'}</span>
                    </div>
                    <span className="font-mono text-[11px] text-stone-400 shrink-0 ml-2">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items & Shipping snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-100 text-xs">
            <div>
              <h2 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2">
                Delivery Details
              </h2>
              <div className="text-stone-600 space-y-0.5">
                <p className="font-semibold text-stone-900">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                <p className="font-mono">Phone: {order.shippingAddress.phone}</p>
              </div>
            </div>

            <div>
              <h2 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2">
                Items ({order.items.length})
              </h2>
              <div className="space-y-1.5">
                {order.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-stone-700">
                    <span className="truncate">{i.productName} × {i.quantity}</span>
                    <span className="font-mono font-bold shrink-0 ml-2">₹{i.subtotal}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-stone-100 flex justify-between font-bold text-stone-900 text-sm">
                  <span>Total Amount:</span>
                  <span className="font-mono text-[#451A03]">₹{order.totalAmount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
