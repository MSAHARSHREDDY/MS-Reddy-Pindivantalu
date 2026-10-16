import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  AlertCircle,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ClipboardCheck,
  CheckCheck,
  Flame,
  PackageCheck,
  Navigation,
  Home,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Lock,
  FileText,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { PolicyModal, PolicyType } from '../components/PolicyModal';

interface OrderTrackViewProps {
  orderId?: string;
  onGoToOrderHistory?: () => void;
  onExploreSnacks: () => void;
  onBack?: () => void;
}

const STAGES: {
  status: OrderStatus;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { status: 'placed', label: 'Order Placed', shortLabel: 'Placed', Icon: ClipboardCheck },
  { status: 'confirmed', label: 'Confirmed', shortLabel: 'Confirmed', Icon: CheckCheck },
  { status: 'preparing', label: 'Preparing', shortLabel: 'Cooking', Icon: Flame },
  { status: 'packed', label: 'Packed & Sealed', shortLabel: 'Packed', Icon: PackageCheck },
  { status: 'dispatched', label: 'Dispatched', shortLabel: 'Dispatched', Icon: Truck },
  { status: 'shipped', label: 'Out for Delivery', shortLabel: 'On the Way', Icon: Navigation },
  { status: 'delivered', label: 'Delivered', shortLabel: 'Delivered', Icon: Home },
];

export const OrderTrackView: React.FC<OrderTrackViewProps> = ({
  orderId,
  onGoToOrderHistory,
  onExploreSnacks,
  onBack,
}) => {
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyType>('refund');

  const openPolicy = (policy: PolicyType) => {
    setSelectedPolicy(policy);
    setPolicyModalOpen(true);
  };

  const fetchOrder = async (id: string) => {
    if (!id || !id.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getOrderById(id.trim());
      if (res.success && res.order) {
        setOrder(res.order);
      } else {
        const errorMsg = 'Order details not found. Please verify the order in your Order History.';
        setError(errorMsg);
        toast.error(errorMsg);
        setOrder(null);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Could not fetch order tracking info.';
      setError(errorMsg);
      toast.error(errorMsg);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch live tracking status using orderId from Order History
  useEffect(() => {
    if (orderId && orderId.trim()) {
      fetchOrder(orderId.trim());
    } else {
      setOrder(null);
      setError('');
    }
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!order) return;
    const confirmCancel = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmCancel) return;

    setCancelLoading(true);
    try {
      const res = await api.cancelOrder(order.id);
      if (res.success && res.order) {
        setOrder(res.order);
        toast.success('Order has been cancelled successfully.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order.');
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

      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-stone-900">
          Track Your Traditional Snack Order
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
          View your PindiVantalu order preparation and shipment timeline.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 sm:p-12 shadow-sm text-center space-y-4 max-w-lg mx-auto">
          <Loader2 className="w-8 h-8 text-amber-700 animate-spin mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-stone-900">Fetching live tracking status...</h3>
            <p className="text-xs text-stone-500 mt-1">
              Checking kitchen preparation and delivery dispatch
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 sm:p-8 shadow-sm text-center space-y-3 max-w-lg mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-sm font-bold text-stone-900">Unable to Fetch Tracking Status</h3>
          <p className="text-xs text-rose-700">{error}</p>
          <div className="pt-2 flex justify-center gap-3">
            {onGoToOrderHistory && (
              <button
                type="button"
                onClick={onGoToOrderHistory}
                className="px-4 py-2 bg-[#451A03] hover:bg-[#321302] text-[#FEF3C7] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Go to Order History
              </button>
            )}
            <button
              type="button"
              onClick={onExploreSnacks}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Browse Snacks
            </button>
          </div>
        </div>
      )}

      {/* Empty State when no orderId was provided */}
      {!loading && !order && !error && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 sm:p-12 shadow-sm text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-800">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">No Order Selected to Track</h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Open your Order History and click <strong className="text-stone-800">"Track order online"</strong> on any order to view its live fulfillment timeline.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            {onGoToOrderHistory && (
              <button
                type="button"
                onClick={onGoToOrderHistory}
                className="px-4 py-2 bg-[#451A03] hover:bg-[#321302] text-[#FEF3C7] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Go to Order History
              </button>
            )}
            <button
              type="button"
              onClick={onExploreSnacks}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Explore Snacks
            </button>
          </div>
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
                {(order.paymentStatus === 'refunded' || (order.paymentMethod === 'razorpay' && isCancelled)) && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Razorpay: Refunded</span>
                  </span>
                )}
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
                className="text-xs text-rose-700 hover:text-rose-900 font-semibold underline self-start sm:self-auto cursor-pointer"
              >
                {cancelLoading ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>

          {/* Icon-Driven Dynamic Fulfilment Timeline */}
          {!isCancelled ? (
            <div className="space-y-6 bg-gradient-to-b from-stone-50/70 to-amber-50/20 p-5 sm:p-6 rounded-2xl border border-stone-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/70 pb-3">
                <div>
                  <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Fulfilment Timeline</span>
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-stone-800">
                    Current Milestone: <strong className="text-amber-800 capitalize">{STAGES[currentStageIndex]?.label || order.orderStatus}</strong>
                  </span>
                </div>
              </div>

              {/* Dynamic Icon Stepper Row */}
              {/* Dynamic Stepper: Strictly Vertical on Mobile/Tablet (< lg), Horizontal on Large Desktop (lg+) */}
              <div className="relative pt-2 pb-2">
                {/* 1. MOBILE & TABLET VERTICAL TIMELINE (< lg) */}
                <div className="lg:hidden flex flex-col space-y-4 relative pl-1">
                  {/* Vertical Progress Line */}
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-stone-200 -z-0">
                    <div
                      className="w-full bg-gradient-to-b from-emerald-500 via-amber-500 to-amber-400 transition-all duration-700"
                      style={{
                        height: `${Math.min(100, Math.max(0, (currentStageIndex / (STAGES.length - 1)) * 100))}%`,
                      }}
                    />
                  </div>

                  {STAGES.map((stage, idx) => {
                    const isCompleted = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    const isDelivered = stage.status === 'delivered' && isCompleted;
                    const StageIcon = stage.Icon;

                    return (
                      <div key={stage.status} className="flex items-center gap-3.5 relative z-10">
                        {/* Dynamic Stage Icon Node */}
                        <div className="relative shrink-0">
                          {isCurrent && !isDelivered && (
                            <span className="absolute -inset-1 rounded-2xl bg-amber-400/40 animate-ping pointer-events-none" />
                          )}

                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                              isCurrent && !isDelivered
                                ? 'bg-gradient-to-br from-amber-500 via-amber-400 to-orange-400 text-stone-950 font-bold ring-4 ring-amber-300/80 shadow-lg shadow-amber-500/30 scale-105'
                                : isCompleted
                                ? 'bg-emerald-600 text-white shadow-emerald-600/20 ring-2 ring-emerald-300 ring-offset-2'
                                : 'bg-white text-stone-300 border border-stone-200 opacity-60'
                            }`}
                          >
                            <StageIcon
                              className={`w-5 h-5 transition-transform duration-300 ${
                                isCurrent && !isDelivered ? 'animate-bounce-subtle' : ''
                              }`}
                            />

                            {/* Mini checkmark */}
                            {isCompleted && (
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stage details on the right */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span
                              className={`text-xs font-bold leading-tight ${
                                isCurrent
                                  ? 'text-amber-900 font-extrabold'
                                  : isCompleted
                                  ? 'text-stone-900'
                                  : 'text-stone-400'
                              }`}
                            >
                              {stage.label}
                            </span>
                            {isCurrent && !isDelivered ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                                In Progress
                              </span>
                            ) : isCompleted ? (
                              <span className="text-[10px] font-semibold text-emerald-700">Completed</span>
                            ) : (
                              <span className="text-[10px] text-stone-400">Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. DESKTOP HORIZONTAL STEPPER (lg+) */}
                <div className="hidden lg:block relative pt-2">
                  {/* Horizontal Progress Track for large screens */}
                  <div className="absolute top-8 left-8 right-8 h-1 bg-stone-200 -z-0 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-amber-400 transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min(100, Math.max(0, (currentStageIndex / (STAGES.length - 1)) * 100))}%`,
                      }}
                    />
                  </div>

                  {/* Horizontal Icons Grid */}
                  <div className="grid grid-cols-7 gap-2 relative z-10">
                    {STAGES.map((stage, idx) => {
                      const isCompleted = idx <= currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      const isDelivered = stage.status === 'delivered' && isCompleted;
                      const StageIcon = stage.Icon;

                      return (
                        <div
                          key={stage.status}
                          className="flex flex-col items-center text-center group cursor-default"
                        >
                          {/* Dynamic Stage Icon Node */}
                          <div className="relative mb-2 flex items-center justify-center">
                            {isCurrent && !isDelivered && (
                              <span className="absolute -inset-1.5 rounded-2xl bg-amber-400/40 animate-ping pointer-events-none" />
                            )}

                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                                isCurrent && !isDelivered
                                  ? 'bg-gradient-to-br from-amber-500 via-amber-400 to-orange-400 text-stone-950 font-bold ring-4 ring-amber-300/80 shadow-lg shadow-amber-500/30 scale-110 z-10'
                                  : isCompleted
                                  ? 'bg-emerald-600 text-white shadow-emerald-600/20 ring-2 ring-emerald-300 ring-offset-2 hover:scale-105'
                                  : 'bg-white text-stone-300 border border-stone-200 opacity-60 hover:opacity-80'
                              }`}
                            >
                              <StageIcon
                                className={`w-5 h-5 transition-transform duration-300 ${
                                  isCurrent && !isDelivered ? 'animate-bounce-subtle' : ''
                                }`}
                              />

                              {/* Floating Mini Checkmark on Completed */}
                              {isCompleted && (
                                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" />
                                </span>
                              )}

                              {/* Floating LIVE badge on Current */}
                              {isCurrent && !isDelivered && (
                                <span className="absolute -top-2.5 px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-200 text-[8px] font-extrabold uppercase tracking-wider shadow-xs">
                                  LIVE
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Stage Name below icon */}
                          <p
                            className={`text-xs font-bold leading-tight ${
                              isCurrent
                                ? 'text-amber-900 font-extrabold'
                                : isCompleted
                                ? 'text-stone-900'
                                : 'text-stone-400'
                            }`}
                          >
                            {stage.shortLabel}
                          </p>

                          {/* Dynamic Status Indicator */}
                          <div className="mt-1">
                            {isCurrent && !isDelivered ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-1.5 py-0.2 rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                                In Progress
                              </span>
                            ) : isCompleted ? (
                              <span className="inline-block text-[10px] font-semibold text-emerald-700">
                                Completed
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] text-stone-400">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Active Milestone Highlight Card */}
              {STAGES[currentStageIndex] && (
                <div className="p-3.5 rounded-xl bg-white border border-amber-200/90 flex items-center gap-3 shadow-2xs">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-900 shrink-0">
                    {React.createElement(STAGES[currentStageIndex].Icon, { className: 'w-4 h-4' })}
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-stone-900 flex items-center gap-1.5">
                      <span>Current Milestone: {STAGES[currentStageIndex].label}</span>
                      <span className="text-[10px] font-normal text-stone-500">
                        ({currentStageIndex + 1} of {STAGES.length})
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 flex items-start gap-3 text-xs text-rose-800">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-stone-900">This order has been cancelled.</p>
                {order.paymentMethod === 'razorpay' ? (
                  <p className="text-emerald-700 font-semibold mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 inline" />
                    <span>Razorpay Payment Status: <strong>Refunded</strong>. Refund of ₹{order.totalAmount} has been processed back to your payment account.</span>
                  </p>
                ) : (
                  <p className="text-stone-600 mt-1">
                    Your Cash on Delivery order has been cancelled. No payment was collected.
                  </p>
                )}
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

      {/* Policies Section at Bottom */}
      <div className="pt-6 border-t border-stone-200">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
            <h2 className="text-base font-bold text-stone-900 tracking-tight">Policies</h2>
          </div>
          <p className="text-xs text-stone-500">
            Read our customer commitments, delivery assurances, and privacy guidelines.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <button
              type="button"
              onClick={() => openPolicy('refund')}
              className="p-4 bg-stone-50 hover:bg-amber-50/70 border border-stone-200/90 hover:border-amber-300 rounded-xl text-left transition-all duration-200 group flex items-center justify-between cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-4 h-4 text-amber-700 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-xs font-semibold text-stone-800 group-hover:text-amber-950">Return & Refund Policy</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => openPolicy('delivery')}
              className="p-4 bg-stone-50 hover:bg-amber-50/70 border border-stone-200/90 hover:border-amber-300 rounded-xl text-left transition-all duration-200 group flex items-center justify-between cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-amber-700 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-xs font-semibold text-stone-800 group-hover:text-amber-950">Delivery Policy</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => openPolicy('privacy')}
              className="p-4 bg-stone-50 hover:bg-amber-50/70 border border-stone-200/90 hover:border-amber-300 rounded-xl text-left transition-all duration-200 group flex items-center justify-between cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-700 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-xs font-semibold text-stone-800 group-hover:text-amber-950">Privacy Policy</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => openPolicy('terms')}
              className="p-4 bg-stone-50 hover:bg-amber-50/70 border border-stone-200/90 hover:border-amber-300 rounded-xl text-left transition-all duration-200 group flex items-center justify-between cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-amber-700 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-xs font-semibold text-stone-800 group-hover:text-amber-950">Terms and Conditions</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Policy Modal Dialog */}
      <PolicyModal
        isOpen={policyModalOpen}
        initialPolicy={selectedPolicy}
        onClose={() => setPolicyModalOpen(false)}
      />
    </div>
  );
};
