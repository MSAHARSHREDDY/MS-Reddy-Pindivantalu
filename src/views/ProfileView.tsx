import React, { useState, useEffect } from 'react';
import { User, MapPin, Package, LogOut, Plus, Trash2, ArrowRight, Loader2, Shield, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw, Sparkles, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order, Address } from '../types';
import { api } from '../services/api';

interface ProfileViewProps {
  initialTab?: 'orders' | 'addresses' | 'password-change';
  recentOrder?: Order | null;
  onTrackOrder: (orderId: string) => void;
  onExploreSnacks: () => void;
  onOpenAdmin?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  initialTab = 'orders',
  recentOrder,
  onTrackOrder,
  onExploreSnacks,
  onOpenAdmin,
}) => {
  const { user, isAdmin, logout, addAddress, deleteAddress, openAuthModal } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 4;
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'password-change'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const getOrderStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-emerald-500 text-white border-transparent';
      case 'dispatched':
      case 'shipped':
        return 'bg-blue-500 text-white border-transparent';
      case 'packed':
      case 'preparing':
        return 'bg-orange-500 text-white border-transparent';
      case 'confirmed':
        return 'bg-sky-500 text-white border-transparent';
      case 'cancelled':
        return 'bg-rose-500 text-white border-transparent';
      case 'placed':
      case 'pending':
      default:
        return 'bg-amber-500 text-white border-transparent';
    }
  };
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [orderActionFeedback, setOrderActionFeedback] = useState<{ id: string; message: string; type: 'success' | 'error' } | null>(null);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordErrorSuccess] = useState(false);

  // New Address Modal state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newFullName, setNewFullName] = useState(user?.name || '');
  const [newPhone, setNewPhone] = useState(user?.phone || '');
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('Hyderabad');
  const [newState, setNewState] = useState('Telangana');
  const [newPincode, setNewPincode] = useState('500033');
  const [newLandmark, setNewLandmark] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.getOrders();
      let list = res.success && Array.isArray(res.orders) ? res.orders : [];
      if (recentOrder && !list.some((o: Order) => o.id === recentOrder.id || o.orderNumber === recentOrder.orderNumber)) {
        list = [recentOrder, ...list];
      }
      setOrders(list);
    } catch {
      if (recentOrder) {
        setOrders([recentOrder]);
      } else {
        setOrders([]);
      }
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else if (recentOrder) {
      setOrders([recentOrder]);
      setLoadingOrders(false);
    } else {
      setLoadingOrders(false);
    }
  }, [user, recentOrder]);

  if (!user && !recentOrder) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <Package className="w-12 h-12 text-amber-800/60 mx-auto" />
        <h2 className="font-display text-2xl font-bold text-stone-900">Order History & Account</h2>
        <p className="text-xs text-stone-500">Sign in to view your past orders, delivery addresses, and track snack packages.</p>
        <div className="pt-2">
          <button
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            Sign In to View Orders
          </button>
        </div>
      </div>
    );
  }

  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`Are you sure you want to cancel order #${orderNumber}? This will cancel your order and restore items to stock.`)) {
      return;
    }
    setCancellingOrderId(orderId);
    setOrderActionFeedback(null);
    try {
      const res = await api.cancelOrder(orderId);
      if (res.success && res.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
        setOrderActionFeedback({ id: orderId, message: `Order #${orderNumber} has been successfully cancelled.`, type: 'success' });
      } else {
        setOrderActionFeedback({ id: orderId, message: res.message || 'Failed to cancel order.', type: 'error' });
      }
    } catch (err: any) {
      setOrderActionFeedback({ id: orderId, message: err.message || 'Failed to cancel order.', type: 'error' });
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      await addAddress({
        fullName: newFullName.trim(),
        phone: newPhone.trim(),
        street: newStreet.trim(),
        city: newCity.trim(),
        state: newState.trim(),
        pincode: newPincode.trim(),
        landmark: newLandmark.trim() || undefined,
        isDefault: (user?.addresses || []).length === 0,
      });
      setShowAddressModal(false);
      setNewStreet('');
      setNewLandmark('');
    } catch (err: any) {
      alert(err.message || 'Failed to save address.');
    } finally {
      setSavingAddress(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Recent Order Banner if just redirected from payment */}
      {recentOrder && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950 text-sm">
                Payment Received & Order #{recentOrder.orderNumber} Placed!
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Amount: <strong className="font-mono">₹{recentOrder.totalAmount}</strong> · Paid via {recentOrder.paymentMethod.toUpperCase()} · Your snacks are being prepared freshly.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTrackOrder(recentOrder.id)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <span>Track Timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Profile Header */}
      {user ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center text-amber-900 font-bold text-xl font-display">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-stone-900">{user.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-stone-500">{user.email} · {user.phone || 'No phone set'}</span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    <Shield className="w-3 h-3 text-amber-700" />
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isAdmin && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#451A03] hover:bg-[#361502] text-amber-100 text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Admin Panel</span>
              </button>
            )}

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 text-stone-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center text-amber-900 font-bold text-xl font-display">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-stone-900">Order History</h1>
              <p className="text-xs text-stone-500 mt-1">
                Track your recent order deliveries and live fulfillment updates.
              </p>
            </div>
          </div>
          <button
            onClick={() => openAuthModal('login')}
            className="px-4 py-2 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            Sign In to Link Orders
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-stone-200 gap-4">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'orders'
                ? 'border-[#78350F] text-[#78350F]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Order History ({orders.length})
          </button>
          {user && (
            <>
              <button
                onClick={() => setActiveTab('addresses')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  activeTab === 'addresses'
                    ? 'border-[#78350F] text-[#78350F]'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Saved Delivery Addresses ({(user.addresses || []).length})
              </button>
              <button
                onClick={() => setActiveTab('password-change')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  activeTab === 'password-change'
                    ? 'border-[#78350F] text-[#78350F]'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Password Change
              </button>
            </>
          )}
        </div>

        {activeTab === 'orders' && (
          <button
            onClick={fetchOrders}
            disabled={loadingOrders}
            className="pb-3 text-xs font-semibold text-stone-600 hover:text-[#78350F] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh latest orders from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Orders</span>
          </button>
        )}
      </div>

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {loadingOrders ? (
            <div className="py-16 text-center text-stone-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-700 mb-2" />
              <p className="text-xs">Loading order history...</p>
            </div>
          ) : orders.length > 0 ? (
            <>
              {orders
                .slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage)
                .map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-xl border border-stone-200 p-5 space-y-4 shadow-2xs hover:shadow-xs transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-stone-900 mr-2">
                          {ord.orderNumber}
                        </span>
                        <span className="text-xs text-stone-400">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded capitalize shadow-2xs ${getOrderStatusBadgeClass(ord.orderStatus)}`}>
                          {ord.orderStatus}
                        </span>
                        <span className="font-mono font-bold text-stone-900 text-sm">
                          ₹{ord.totalAmount}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-stone-600">
                          <div className="flex items-center gap-2 truncate">
                            <img src={it.image} alt={it.productName} className="w-8 h-8 rounded object-contain bg-stone-100 shrink-0 p-0.5" />
                            <span className="truncate">{it.productName} × {it.quantity}</span>
                          </div>
                          <span className="font-mono font-medium text-stone-800 shrink-0 ml-2">₹{it.subtotal}</span>
                        </div>
                      ))}
                    </div>

                    {orderActionFeedback && orderActionFeedback.id === ord.id && (
                      <div className={`p-2.5 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                        orderActionFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {orderActionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        <span>{orderActionFeedback.message}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between pt-3 border-t border-stone-100 gap-2">
                      <span className="text-[11px] text-stone-400">
                        Paid via {ord.paymentMethod.toUpperCase()} ({ord.paymentStatus})
                      </span>
                      <div className="flex items-center gap-3">
                        {['placed', 'confirmed', 'preparing', 'packed'].includes(ord.orderStatus) && (
                          <button
                            onClick={() => handleCancelOrder(ord.id, ord.orderNumber)}
                            disabled={cancellingOrderId === ord.id}
                            className="text-xs font-semibold text-rose-700 hover:text-rose-900 border border-rose-200 hover:border-rose-300 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            {cancellingOrderId === ord.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Cancelling...</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Cancel Order</span>
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => onTrackOrder(ord.id)}
                          className="text-xs font-semibold text-[#78350F] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Track Order Timeline</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Customer Orders Pagination */}
              {orders.length > ordersPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-200 text-xs">
                  <span className="text-stone-500">
                    Showing {(orderPage - 1) * ordersPerPage + 1}–{Math.min(orderPage * ordersPerPage, orders.length)} of {orders.length} orders
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={orderPage === 1}
                      onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.ceil(orders.length / ordersPerPage) }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        onClick={() => setOrderPage(num)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                          orderPage === num
                            ? 'bg-[#451A03] text-[#FEF3C7]'
                            : 'border border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      disabled={orderPage >= Math.ceil(orders.length / ordersPerPage)}
                      onClick={() => setOrderPage((p) => Math.min(Math.ceil(orders.length / ordersPerPage), p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 bg-white rounded-xl border border-stone-200 text-center p-8 space-y-3">
              <Package className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-display text-lg font-semibold text-stone-800">No orders placed yet</h3>
              <p className="text-xs text-stone-500">Your fresh homemade snack cravings await!</p>
              <button
                onClick={onExploreSnacks}
                className="mt-2 px-4 py-2 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] text-xs font-semibold rounded-lg"
              >
                Browse Snacks
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-stone-500">Manage where your snacks get delivered.</p>
            <button
              onClick={() => setShowAddressModal(true)}
              className="px-3.5 py-1.5 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Address</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {user?.addresses && user.addresses.length > 0 ? (
              user.addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-white rounded-xl border border-stone-200 p-5 space-y-3 relative shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-stone-900">{addr.fullName}</span>
                    <button
                      onClick={() => deleteAddress(addr.id)}
                      className="text-stone-400 hover:text-rose-600 p-1"
                      title="Delete Address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-stone-600 space-y-0.5">
                    <p>{addr.street}</p>
                    <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                    {addr.landmark && <p className="text-stone-500">Near: {addr.landmark}</p>}
                    <p className="font-mono text-stone-800 pt-1">Phone: {addr.phone}</p>
                  </div>
                  {addr.isDefault && (
                    <span className="inline-block text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      Default Shipping Address
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="sm:col-span-2 py-12 bg-white rounded-xl border border-stone-200 text-center text-xs text-stone-500">
                No delivery addresses saved yet. Click "Add New Address" above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowAddressModal(false)}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-6 z-10 space-y-4">
            <h3 className="font-display text-lg font-bold text-stone-900">Add Delivery Address</h3>
            <form onSubmit={handleSaveAddress} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    required
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Landmark (optional)</label>
                <input
                  type="text"
                  value={newLandmark}
                  onChange={(e) => setNewLandmark(e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-3 py-1.5 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-4 py-1.5 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] font-semibold rounded-lg disabled:opacity-50"
                >
                  {savingAddress ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Tab: Password Change */}
      {activeTab === 'password-change' && (
        <div className="max-w-md space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-stone-900">Change Password</h3>
            <p className="text-xs text-stone-500">Ensure your account is using a strong, unique password.</p>
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              setPasswordError('');
              setPasswordErrorSuccess(false);
              if (newPassword !== confirmPassword) {
                setPasswordError('New passwords do not match.');
                return;
              }
              setChangingPassword(true);
              try {
                const res = await api.changePassword({ currentPassword, newPassword });
                if (res.success) {
                  setPasswordErrorSuccess(true);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }
              } catch (err: any) {
                setPasswordError(err.message || 'Failed to change password.');
              } finally {
                setChangingPassword(false);
              }
            }}
            className="bg-white rounded-xl border border-stone-200 p-6 space-y-4 shadow-2xs"
          >
            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-lg">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Password updated successfully!</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2 text-stone-400 hover:text-stone-600"
                  >
                    {showCurrentPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2 text-stone-400 hover:text-stone-600"
                  >
                    {showNewPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full py-2 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {changingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Update Password</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
