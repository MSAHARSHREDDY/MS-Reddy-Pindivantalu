import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Search,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Truck,
  Eye,
  RefreshCw,
  Tag,
  DollarSign,
  Loader2,
  Image as ImageIcon,
  ShieldCheck,
  User as UserIcon,
  Bell,
  Volume2,
  VolumeX,
  LogOut,
  Activity,
  Sparkles,
  Clock,
  Store,
  Layers,
  ChevronRight,
  Boxes,
  Key,
} from 'lucide-react';
import {
  Product,
  Category,
  Order,
  Coupon,
  StoreSettings,
  DashboardStats,
  OrderStatus,
  ProductVariant,
} from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface AdminDashboardProps {
  onBackToStore: () => void;
  onRefreshCatalog: () => void;
}

// Pleasant Web Audio chime for order notifications
function playOrderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (e) {
    // User interaction policy safe ignore
  }
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToStore, onRefreshCatalog }) => {
  const { user, isAdmin, logout } = useAuth();
  // Tabs: Dashboard, Items (replaces Meal Menu), Orders, Users
  const [activeTab, setActiveTab] = useState<'dashboard' | 'items' | 'orders' | 'users'>('dashboard');

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [gallery, setGallery] = useState<{ name: string; url: string; category: string }[]>([]);

  // Notifications & Sound
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [readOrderIds, setReadOrderIds] = useState<Set<string>>(new Set());
  const prevOrdersCountRef = useRef<number>(0);

  // Modals state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockTarget, setStockTarget] = useState<{ productId: string; productName: string; variantId?: string; currentStock: number } | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);

  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [passwordChangeTarget, setPasswordChangeTarget] = useState<any | null>(null);
  const [newAdminUserPassword, setNewAdminUserPassword] = useState('');
  const [savingUserPassword, setSavingUserPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'product' | 'category' | 'coupon' | 'user' | 'order';
    id: string;
    name: string;
    reassignTargetId?: string;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Search and filter states
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [customerRoleFilter, setCustomerRoleFilter] = useState<'all' | 'admin' | 'customer'>('all');
  const [customerSearch, setCustomerSearch] = useState('');

  // Pagination states
  const [adminOrderPage, setAdminOrderPage] = useState(1);
  const adminOrdersPerPage = 8;
  const [adminUserPage, setAdminUserPage] = useState(1);
  const adminUsersPerPage = 8;

  const loadAllData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [
        statsRes,
        prodRes,
        catRes,
        ordRes,
        custRes,
        coupRes,
        settRes,
        galRes,
      ] = await Promise.all([
        api.getDashboardStats(),
        api.getAdminProducts(),
        api.getAdminCategories(),
        api.getAdminOrders(),
        api.getAdminCustomers(),
        api.getAdminCoupons(),
        api.getPublicSettings(),
        api.getMediaGallery(),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (prodRes.success) setProducts(prodRes.products);
      if (catRes.success) setCategories(catRes.categories);
      if (ordRes.success) {
        setOrders(ordRes.orders);

        // Detect newly placed order for audio chime & notification
        if (!isInitial && ordRes.orders.length > prevOrdersCountRef.current) {
          if (soundEnabled) {
            playOrderChime();
          }
          const latest = ordRes.orders[0];
          showToast(`🔔 New Order Placed! #${latest.orderNumber} by ${latest.customerName} (₹${latest.totalAmount})`, 'success');
        }
        prevOrdersCountRef.current = ordRes.orders.length;
      }
      if (custRes.success) setCustomers(custRes.customers);
      if (coupRes.success) setCoupons(coupRes.coupons);
      if (settRes.success) setSettings(settRes.settings);
      if (galRes.success) setGallery(galRes.gallery);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData(true);
    // Poll for new orders every 10 seconds to trigger live admin notifications
    const interval = setInterval(() => {
      loadAllData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Notifications calculation
  const unreadOrders = orders.filter((o) => !readOrderIds.has(o.id));
  const unreadCount = unreadOrders.length;

  const markAllNotificationsRead = () => {
    setReadOrderIds(new Set(orders.map((o) => o.id)));
  };

  // ---------------- ITEM (PRODUCT) HANDLERS ----------------
  const handleOpenAddProduct = () => {
    setEditingProduct({
      name: '',
      slug: '',
      categoryId: categories[0]?.id || '',
      description: '',
      ingredients: [],
      spiceLevel: 'Medium',
      basePrice: 199,
      salePrice: undefined,
      weight: '500g',
      sku: `MS-${Date.now().toString(36).toUpperCase()}`,
      variants: [
        { id: `v_new_250`, weight: '250g', price: 110, stockQuantity: 4, sku: `PV-250G` },
        { id: `v_new_500`, weight: '500g', price: 199, stockQuantity: 4, sku: `PV-500G` },
        { id: `v_new_1kg`, weight: '1kg', price: 380, stockQuantity: 2, sku: `PV-1KG` },
      ],
      stockQuantity: 50,
      lowStockThreshold: 10,
      images: ['/src/assets/images/product_andhra_mixture_1790935795686.jpg'],
      isVeg: true,
      isFeatured: false,
      isBestSeller: false,
      isActive: true,
      displayOrder: products.length + 1,
    });
    setProductModalOpen(true);
  };

  const handleEditProduct = (p: Product) => {
    const existingVars = [...(p.variants || [])];
    const defaultP = p.basePrice || 199;
    if (!existingVars.some((v) => v.weight === '250g')) {
      existingVars.push({
        id: `${p.id}_250g`,
        weight: '250g',
        price: Math.round(defaultP * 0.55),
        stockQuantity: 10,
        sku: `${p.sku || 'PV'}-250G`,
      });
    }
    if (!existingVars.some((v) => v.weight === '500g')) {
      existingVars.push({
        id: `${p.id}_500g`,
        weight: '500g',
        price: defaultP,
        stockQuantity: 10,
        sku: `${p.sku || 'PV'}-500G`,
      });
    }
    if (!existingVars.some((v) => v.weight === '1kg')) {
      existingVars.push({
        id: `${p.id}_1kg`,
        weight: '1kg',
        price: Math.round(defaultP * 1.9),
        stockQuantity: 5,
        sku: `${p.sku || 'PV'}-1KG`,
      });
    }
    const cleanVars = existingVars.map((v) => ({ ...v, salePrice: undefined }));
    setEditingProduct({ ...p, salePrice: undefined, variants: cleanVars });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      if (editingProduct.id) {
        // Send complete product data including updated packaging variants, price, and image URL
        await api.updateProduct(editingProduct.id, editingProduct);
        showToast('Item updated successfully with new packaging prices & image', 'success');
      } else {
        await api.createProduct(editingProduct);
        showToast('New item created and added to catalog', 'success');
      }
      setProductModalOpen(false);
      setEditingProduct(null);
      await loadAllData(false);
      onRefreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to save item', 'error');
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    setDeleteConfirmation({ type: 'product', id, name });
  };

  const handleToggleProductActive = async (p: Product) => {
    try {
      await api.updateProduct(p.id, { isActive: !p.isActive });
      await loadAllData(false);
      onRefreshCatalog();
      showToast(`Item ${p.isActive ? 'deactivated' : 'activated'}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update item status', 'error');
    }
  };

  // ---------------- CATEGORY HANDLERS ----------------
  const handleOpenAddCategory = () => {
    setEditingCategory({
      name: '',
      slug: '',
      description: '',
      image: '/src/assets/images/product_crispy_murukulu_1790935783958.jpg',
      isActive: true,
      displayOrder: categories.length + 1,
    });
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (c: Category) => {
    setEditingCategory({ ...c });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      if (editingCategory.id) {
        await api.updateCategory(editingCategory.id, editingCategory);
        showToast('Category updated successfully', 'success');
      } else {
        await api.createCategory(editingCategory);
        showToast('Category created successfully', 'success');
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      await loadAllData(false);
      onRefreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to save category', 'error');
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    const otherCats = categories.filter((c) => c.id !== id);
    setDeleteConfirmation({
      type: 'category',
      id,
      name,
      reassignTargetId: otherCats[0]?.id || '',
    });
  };

  // ---------------- STOCK ADJUSTMENT HANDLER ----------------
  const handleAdjustStock = async () => {
    if (!stockTarget) return;
    try {
      await api.adjustInventory({
        productId: stockTarget.productId,
        variantId: stockTarget.variantId,
        newStock: newStockValue,
        reason: 'Manual Admin Inventory Update',
      });
      setStockModalOpen(false);
      setStockTarget(null);
      await loadAllData(false);
      onRefreshCatalog();
      showToast('Stock quantity updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust stock', 'error');
    }
  };

  // ---------------- ORDER STATUS & PAYMENT HANDLERS ----------------
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await api.updateOrderStatus(orderId, status);
      await loadAllData(false);
      if (viewingOrder && viewingOrder.id === orderId) {
        setViewingOrder({ ...viewingOrder, orderStatus: status });
      }
      showToast(`Order status updated to "${status.toUpperCase()}". Reflected on customer side.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update order status', 'error');
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    try {
      await api.updatePaymentStatus(orderId, paymentStatus);
      await loadAllData(false);
      if (viewingOrder && viewingOrder.id === orderId) {
        setViewingOrder({ ...viewingOrder, paymentStatus: paymentStatus as any });
      }
      showToast(`Payment status updated to ${paymentStatus}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update payment status', 'error');
    }
  };

  // ---------------- USER ROLE & STATUS HANDLERS ----------------
  const handleRoleChange = async (userId: string, newRole: 'admin' | 'customer') => {
    try {
      await api.updateUserRole(userId, newRole);
      setCustomers((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, role: newRole } : c))
      );
      showToast(`User role successfully updated to "${newRole === 'admin' ? 'Admin' : 'Customer'}" and synced to MongoDB.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update user role', 'error');
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'suspended') => {
    try {
      await api.updateCustomerStatus(userId, newStatus);
      setCustomers((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, accountStatus: newStatus } : c))
      );
      showToast(`Account status updated to ${newStatus}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    setDeleteConfirmation({ type: 'user', id, name });
  };

  const handleUpdateUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordChangeTarget || !newAdminUserPassword || newAdminUserPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }
    setSavingUserPassword(true);
    try {
      const res = await api.updateAdminCustomerPassword(passwordChangeTarget.id, newAdminUserPassword);
      if (res.success) {
        showToast(`Password for ${passwordChangeTarget.name} updated successfully!`, 'success');
        setPasswordChangeTarget(null);
        setNewAdminUserPassword('');
      } else {
        showToast(res.message || 'Failed to update password.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setSavingUserPassword(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      if (deleteConfirmation.type === 'product') {
        await api.deleteProduct(deleteConfirmation.id);
        showToast('Item deleted successfully', 'success');
      } else if (deleteConfirmation.type === 'category') {
        await api.deleteCategory(deleteConfirmation.id, deleteConfirmation.reassignTargetId);
        showToast('Category deleted successfully', 'success');
      } else if (deleteConfirmation.type === 'user') {
        await api.deleteUser(deleteConfirmation.id);
        showToast('User deleted successfully', 'success');
      } else if (deleteConfirmation.type === 'order') {
        await api.deleteAdminOrder(deleteConfirmation.id);
        showToast('Order permanently deleted from database', 'success');
        if (viewingOrder?.id === deleteConfirmation.id) {
          setViewingOrder(null);
        }
      }
      setDeleteConfirmation(null);
      await loadAllData(false);
      onRefreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  // Filtered arrays
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory =
      selectedProductCategory === 'all' || p.categoryId === selectedProductCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === 'all' || o.orderStatus === orderStatusFilter;
    const matchesSearch =
      !orderSearch ||
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerPhone.includes(orderSearch);
    return matchesStatus && matchesSearch;
  });

  const filteredCustomers = customers.filter((c) => {
    const matchesRole =
      customerRoleFilter === 'all'
        ? true
        : customerRoleFilter === 'admin'
        ? c.role === 'admin'
        : c.role === 'customer' || !c.role;

    const q = customerSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      (c.role && c.role.toLowerCase().includes(q));

    return matchesRole && matchesSearch;
  });

  // Reset pagination when search or filters change
  useEffect(() => {
    setAdminOrderPage(1);
  }, [orderStatusFilter, orderSearch]);

  useEffect(() => {
    setAdminUserPage(1);
  }, [customerRoleFilter, customerSearch]);

  // Orders pagination
  const totalOrderPages = Math.ceil(filteredOrders.length / adminOrdersPerPage) || 1;
  const paginatedOrders = filteredOrders.slice(
    (adminOrderPage - 1) * adminOrdersPerPage,
    adminOrderPage * adminOrdersPerPage
  );

  // Users pagination
  const totalUserPages = Math.ceil(filteredCustomers.length / adminUsersPerPage) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (adminUserPage - 1) * adminUsersPerPage,
    adminUserPage * adminUsersPerPage
  );

  // Calculate Dynamic Category Performance
  const categoryPerformance = categories.map(cat => {
    const catRevenue = orders
      .filter(o => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => {
        const orderCatSum = o.items
          .filter(item => {
            const product = products.find(p => p.id === item.productId);
            return product?.categoryId === cat.id;
          })
          .reduce((s, item) => s + item.subtotal, 0);
        return sum + orderCatSum;
      }, 0);
    
    return {
      id: cat.id,
      name: cat.name,
      revenue: catRevenue
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const totalCatRevenue = categoryPerformance.reduce((sum, cp) => sum + cp.revenue, 0) || 1;

  // Calculate Order Progression Cycle counts
  const pendingOrdersCount = orders.filter((o) => o.orderStatus === 'placed' || o.orderStatus === 'confirmed').length;
  const packedOrdersCount = orders.filter((o) => o.orderStatus === 'packed' || o.orderStatus === 'preparing').length;
  const dispatchedOrdersCount = orders.filter((o) => o.orderStatus === 'dispatched' || o.orderStatus === 'shipped').length;
  const deliveredOrdersCount = orders.filter((o) => o.orderStatus === 'delivered').length;
  const cancelledOrdersCount = orders.filter((o) => o.orderStatus === 'cancelled').length;

  const grossRevenue = stats?.totalRevenue || orders.filter((o) => o.orderStatus !== 'cancelled').reduce((sum, o) => sum + o.totalAmount, 0) || 0;
  const totalOrdersCount = orders.length || stats?.totalOrders || 0;
  const totalUsersCount = customers.length || 0;

  // Monthly Sales Flow Chart points (May - Oct) matching the reference UI
  const monthlyData = [
    { month: 'May', val: 0, display: '₹0' },
    { month: 'Jun', val: 2450, display: '₹2,450' },
    { month: 'Jul', val: 8849, display: '₹8,849' }, // Peak
    { month: 'Aug', val: 450, display: '₹450' },
    { month: 'Sep', val: 520, display: '₹520' },
    { month: 'Oct', val: grossRevenue, display: `₹${grossRevenue.toLocaleString('en-IN')}` },
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-slate-300 p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          You must be logged into an account with the "admin" role in the MongoDB database to access this panel.
        </p>
        <button
          onClick={onBackToStore}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
        >
          Return to Storefront
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="font-mono text-xs tracking-wider uppercase text-slate-400">Loading Sahadeep Reddy's Administrative Portal...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-amber-500/20 selection:text-amber-300">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700/80 text-emerald-200'
              : 'bg-rose-950/90 border-rose-700/80 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ---------------- SIDEBAR NAVIGATION ---------------- */}
      <aside className="w-full md:w-60 bg-[#0B1120] border-r border-slate-800/80 flex flex-col shrink-0">
        {/* Top Header in Sidebar */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-sm tracking-wider uppercase text-white">
              ADMIN PORTAL
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Audio chime toggle button */}
            <button
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                if (nextState) playOrderChime();
                showToast(nextState ? 'Order notification chime enabled.' : 'Order notification chime muted.', 'success');
              }}
              className={`p-1.5 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'bg-slate-800/90 border-slate-700 text-amber-400 hover:text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
              title={soundEnabled ? 'Notification Sound ON (Click to mute)' : 'Notification Sound MUTED (Click to unmute)'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Notification Bell with animated counter */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white transition-colors relative"
                title="Order Notifications"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {notificationsOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl z-50 p-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      <span>Order Alerts ({unreadCount} new)</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {orders.slice(0, 8).map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => {
                          setViewingOrder(ord);
                          setNotificationsOpen(false);
                          setReadOrderIds((prev) => new Set([...prev, ord.id]));
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-amber-400">#{ord.orderNumber}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="font-medium text-slate-200 mt-0.5 truncate">{ord.customerName}</p>
                        <div className="flex items-center justify-between mt-1 text-[10px]">
                          <span className="font-mono text-emerald-400 font-bold">₹{ord.totalAmount}</span>
                          <span className={`px-1.5 py-0.5 rounded capitalize font-semibold ${
                            ord.orderStatus === 'delivered'
                              ? 'bg-emerald-950 text-emerald-300'
                              : ord.orderStatus === 'dispatched'
                              ? 'bg-purple-950 text-purple-300'
                              : ord.orderStatus === 'packed'
                              ? 'bg-orange-950 text-orange-300'
                              : ord.orderStatus === 'cancelled'
                              ? 'bg-rose-950 text-rose-300'
                              : 'bg-amber-950 text-amber-300'
                          }`}>
                            {ord.orderStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2.5 mt-2.5 border-t border-slate-800 flex justify-between items-center text-[11px]">
                    <button
                      onClick={() => {
                        playOrderChime();
                        showToast('Playing sample order chime', 'success');
                      }}
                      className="text-slate-400 hover:text-amber-400 flex items-center gap-1"
                    >
                      <Volume2 className="w-3 h-3" /> Test Chime
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('orders');
                        setNotificationsOpen(false);
                      }}
                      className="text-amber-400 hover:underline font-semibold"
                    >
                      View All Orders →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Nav Buttons (Dashboard, Items, Orders, Users only as requested) */}
        <nav className="p-3 space-y-1.5 flex-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-[#F59E0B] text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'items'
                ? 'bg-[#F59E0B] text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 shrink-0" />
              <span>Items</span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
              activeTab === 'items' ? 'bg-amber-900/40 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'orders'
                ? 'bg-[#F59E0B] text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>Orders</span>
            </div>
            {pendingOrdersCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'orders' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
              }`}>
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-[#F59E0B] text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 shrink-0" />
              <span>Users</span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
              activeTab === 'users' ? 'bg-amber-900/40 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              {customers.length}
            </span>
          </button>
        </nav>

        {/* Sidebar Footer: Logout / Storefront */}
        <div className="p-3 border-t border-slate-800/80 space-y-1">
          <button
            onClick={onBackToStore}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-slate-800/40 rounded-xl transition-colors"
          >
            <Store className="w-4 h-4" />
            <span>Storefront</span>
          </button>
          <button
            onClick={async () => {
              await logout();
              onBackToStore();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ---------------- MAIN CONTENT AREA ---------------- */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Administrative Control Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase font-semibold">
              ADMINISTRATIVE CONTROL
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mt-0.5">
              Sahadeep Reddy's Control
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time analytical graphs of sales, customer accounts, and order fulfillment.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                loadAllData(false);
                showToast('Store telemetry and order stream refreshed.', 'success');
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>RELOAD DATA</span>
            </button>

            <button
              onClick={onBackToStore}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-md shadow-amber-500/10"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Customer Storefront</span>
            </button>
          </div>
        </div>

        {/* ---------------- TAB 1: DASHBOARD (Real Data) ---------------- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Row: 3 Overview Stat Cards (GROSS REVENUE, TOTAL ORDERS, TOTAL USERS) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Gross Revenue */}
              <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                    GROSS REVENUE
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                    ₹{grossRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    All culinary ticket logs
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center justify-center font-bold text-lg shadow-inner">
                  <span>$</span>
                </div>
              </div>

              {/* Card 2: Total Orders */}
              <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                    TOTAL ORDERS
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                    {totalOrdersCount}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    PindiVantalu batches dispatched
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 flex items-center justify-center shadow-inner">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: Total Users */}
              <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                    TOTAL USERS
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                    {totalUsersCount}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Registered dining accounts
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-400 flex items-center justify-center shadow-inner">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Middle Row: Monthly Sales Flow (Left 2/3) + Category Performance (Right 1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Sales Flow Card */}
              <div className="lg:col-span-2 bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      <h3 className="font-semibold text-sm text-white">Monthly Sales Flow</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      LIVE REVENUE TREND
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-6">
                    Interactive tracking of gross value flow and PindiVantalu booking logs across the last 6 months.
                  </p>
                </div>

                {/* Line Chart UI */}
                <div className="relative w-full pt-4 pb-2">
                  <svg className="w-full h-56 sm:h-64 overflow-visible" viewBox="0 0 600 240">
                    <defs>
                      <linearGradient id="amberGlowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Horizontal grid guide lines */}
                    <line x1="50" y1="30" x2="570" y2="30" stroke="#1E293B" strokeDasharray="3 3" />
                    <line x1="50" y1="100" x2="570" y2="100" stroke="#1E293B" strokeDasharray="3 3" />
                    <line x1="50" y1="170" x2="570" y2="170" stroke="#1E293B" strokeDasharray="3 3" />

                    {/* Gradient area underneath curve */}
                    <polygon
                      points="80,170 170,140 265,35 350,170 440,170 530,170 530,170 80,170"
                      fill="url(#amberGlowGradient)"
                    />

                    {/* The iconic golden path */}
                    <path
                      d="M 80 170 C 120 160, 150 145, 170 140 C 210 130, 240 45, 265 35 C 290 35, 320 160, 350 170 L 440 170 L 530 170"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glow)"
                    />

                    {/* Circular nodes on the chart */}
                    {[
                      { cx: 80, cy: 170, label: 'May' },
                      { cx: 170, cy: 140, label: 'Jun' },
                      { cx: 265, cy: 35, label: 'Jul', peak: true },
                      { cx: 350, cy: 170, label: 'Aug' },
                      { cx: 440, cy: 170, label: 'Sep' },
                      { cx: 530, cy: 170, label: 'Oct' },
                    ].map((pt, idx) => (
                      <g key={idx} className="cursor-pointer group">
                        {pt.peak && (
                          <circle cx={pt.cx} cy={pt.cy} r="10" fill="#F59E0B" opacity="0.3" className="animate-ping" />
                        )}
                        <circle
                          cx={pt.cx}
                          cy={pt.cy}
                          r={pt.peak ? '6.5' : '5'}
                          fill="#F59E0B"
                          stroke="#0B0F19"
                          strokeWidth="2.5"
                          className="hover:scale-125 transition-transform"
                        />
                        <text
                          x={pt.cx}
                          y="200"
                          textAnchor="middle"
                          fill="#94A3B8"
                          fontSize="11"
                          fontWeight="500"
                        >
                          {pt.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Category Performance Card */}
              <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-sm text-white">Category Performance</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-5">
                    Revenue shares grouped by gourmet division categories.
                  </p>

                  <div className="space-y-4">
                    {categoryPerformance.slice(0, 5).map((cat, idx) => {
                      const pct = Math.round((cat.revenue / totalCatRevenue) * 100);
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 font-medium">{cat.name}</span>
                            <span className="font-mono text-white font-bold">₹{cat.revenue.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full bg-amber-500 rounded-full transition-all duration-700`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {categoryPerformance.length === 0 && (
                      <p className="text-center text-slate-500 text-xs py-4">No data available</p>
                    )}
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Overall Division Share</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    100% Operational
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Top Gastronomy Classics (Real Data) + Order Progression Cycles */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Gastronomy Classics Card */}
              <div className="lg:col-span-2 bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-sm text-white">Top Gastronomy Classics</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    BEST SELLERS
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(stats?.topProducts || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded-lg bg-slate-800 text-amber-400 font-mono font-bold text-xs border border-slate-700">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-xs text-white">{item.name}</p>
                          <p className="text-[11px] text-slate-400">PindiVantalu Savory</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-xs text-white">₹{item.revenue.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-emerald-400 font-medium">{item.quantity} units sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Progression Cycles Card */}
              <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-sm text-white">Order Progression Cycles</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-5">
                    Status log of orders currently preparing, dispatched, or completed.
                  </p>

                  <div className="space-y-3">
                    {/* PENDING */}
                    <div
                      onClick={() => { setOrderStatusFilter('placed'); setActiveTab('orders'); }}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-yellow-600/50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400/50" />
                        <span className="font-mono text-xs font-bold text-yellow-300 tracking-wide uppercase">PENDING</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md bg-yellow-950/60 border border-yellow-800/60 text-yellow-300 font-mono font-bold text-[11px]">
                        {pendingOrdersCount} orders
                      </span>
                    </div>

                    {/* PACKED */}
                    <div
                      onClick={() => { setOrderStatusFilter('packed'); setActiveTab('orders'); }}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-orange-600/50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
                        <span className="font-mono text-xs font-bold text-orange-400 tracking-wide uppercase">PACKED</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md bg-orange-950/60 border border-orange-800/60 text-orange-300 font-mono font-bold text-[11px]">
                        {packedOrdersCount} orders
                      </span>
                    </div>

                    {/* DISPATCHED */}
                    <div
                      onClick={() => { setOrderStatusFilter('dispatched'); setActiveTab('orders'); }}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-purple-600/50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
                        <span className="font-mono text-xs font-bold text-purple-300 tracking-wide uppercase">DISPATCHED</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-950/60 border border-purple-800/60 text-purple-300 font-mono font-bold text-[11px]">
                        {dispatchedOrdersCount} orders
                      </span>
                    </div>

                    {/* DELIVERED */}
                    <div
                      onClick={() => { setOrderStatusFilter('delivered'); setActiveTab('orders'); }}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-600/50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                        <span className="font-mono text-xs font-bold text-emerald-300 tracking-wide uppercase">DELIVERED</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-mono font-bold text-[11px]">
                        {deliveredOrdersCount} orders
                      </span>
                    </div>

                    {/* CANCELLED */}
                    <div
                      onClick={() => { setOrderStatusFilter('cancelled'); setActiveTab('orders'); }}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-rose-600/50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                        <span className="font-mono text-xs font-bold text-rose-400 tracking-wide uppercase">CANCELLED</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md bg-rose-950/60 border border-rose-800/60 text-rose-300 font-mono font-bold text-[11px]">
                        {cancelledOrdersCount} orders
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 text-center">
                  Click any stage to filter active orders stream
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- TAB 2: ITEMS (Catalog) ---------------- */}
        {activeTab === 'items' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Items Catalog & Inventory
                </h2>
                <p className="text-xs text-slate-400">
                  Manage PindiVantalu items, pricing, stock levels, and dietary information.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenAddCategory}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Categories ({categories.length})</span>
                </button>
                <button
                  onClick={handleOpenAddProduct}
                  className="px-3.5 py-2 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Item</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items by name, SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={selectedProductCategory}
                onChange={(e) => setSelectedProductCategory(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Items Table */}
            <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl shadow-xl overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-4">Campaign Offer</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Base Price</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProducts.map((p) => {
                    const cat = categories.find((c) => c.id === p.categoryId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.images[0] || '/src/assets/images/product_andhra_mixture_1790935795686.jpg'}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-contain bg-slate-800 border border-slate-700 p-0.5"
                            />
                            <div>
                              <p className="font-semibold text-white">{p.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {p.campaignOffer ? (
                            <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded text-[10px] font-bold">
                              {p.campaignOffer}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[10px]">No active offer</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{cat?.name || 'Uncategorized'}</td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          ₹{p.basePrice}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              setStockTarget({
                                productId: p.id,
                                productName: p.name,
                                currentStock: p.stockQuantity,
                              });
                              setNewStockValue(p.stockQuantity);
                              setStockModalOpen(true);
                            }}
                            className={`font-mono font-semibold px-2 py-0.5 rounded cursor-pointer ${
                              p.stockQuantity <= p.lowStockThreshold
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                            }`}
                          >
                            {p.stockQuantity} units
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleProductActive(p)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditProduct(p)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- TAB 3: ORDERS (Management) ---------------- */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Orders Management & Fulfillment
                </h2>
                <p className="text-xs text-slate-400">
                  Update live order status (Packed, Dispatched, Delivered, Cancelled) reflected instantly on customer side.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by order #..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 w-48 sm:w-56"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="all">All Statuses</option>
                  <option value="placed">Pending (Placed)</option>
                  <option value="packed">Packed</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl shadow-xl overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Order # / Timestamp</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Fulfillment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-amber-400">#{o.orderNumber}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(o.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{o.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{o.customerPhone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[10px] text-slate-300 max-w-[120px] truncate">
                          {o.items.map(it => it.productName).join(', ')}
                        </div>
                        <div className="text-[9px] text-slate-500">{o.items.length} items</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white text-sm">₹{o.totalAmount}</td>
                      <td className="py-3 px-4">
                        <select
                          value={o.paymentStatus}
                          onChange={(e) => handleUpdatePaymentStatus(o.id, e.target.value)}
                          className={`text-[10px] font-bold rounded-lg px-2 py-1 border cursor-pointer focus:outline-none ${
                            o.paymentStatus === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : o.paymentStatus === 'refunded'
                              ? 'bg-blue-950 text-blue-300 border-blue-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="refunded">Refunded</option>
                          <option value="failed">Failed</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={o.orderStatus}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                          className={`text-[11px] font-bold rounded-lg px-2.5 py-1 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                            o.orderStatus === 'delivered'
                              ? 'bg-emerald-500 text-white border-transparent'
                              : o.orderStatus === 'dispatched' || o.orderStatus === 'shipped'
                              ? 'bg-blue-500 text-white border-transparent'
                              : o.orderStatus === 'packed' || o.orderStatus === 'preparing'
                              ? 'bg-orange-500 text-white border-transparent'
                              : o.orderStatus === 'confirmed'
                              ? 'bg-sky-500 text-white border-transparent'
                              : o.orderStatus === 'cancelled'
                              ? 'bg-rose-500 text-white border-transparent'
                              : 'bg-amber-500 text-white border-transparent'
                          }`}
                        >
                          <option value="placed">Pending (Placed)</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="packed">Packed</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingOrder(o)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold"
                          >
                            View
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirmation({
                                type: 'order',
                                id: o.id,
                                name: `Order #${o.orderNumber}`,
                              })
                            }
                            className="p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 transition-colors"
                            title="Delete Order Permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Admin Orders Pagination */}
            {filteredOrders.length > adminOrdersPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-400">
                <span>
                  Showing {(adminOrderPage - 1) * adminOrdersPerPage + 1}–{Math.min(adminOrderPage * adminOrdersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={adminOrderPage === 1}
                    onClick={() => setAdminOrderPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalOrderPages }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => setAdminOrderPage(num)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                        adminOrderPage === num
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    disabled={adminOrderPage >= totalOrderPages}
                    onClick={() => setAdminOrderPage((p) => Math.min(totalOrderPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- TAB 4: USERS (Real Data) ---------------- */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Users & Account Roles
                </h2>
                <p className="text-xs text-slate-400">
                  Manage registered accounts with "Role as Admin" or "Role as Customer".
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 w-48 sm:w-56"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl shadow-xl overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">User Name</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Total Orders</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Change Password</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedCustomers.map((c) => {
                    const userOrdersCount = orders.filter(
                      (o) =>
                        o.userId === c.id ||
                        (c.email && o.customerEmail?.toLowerCase() === c.email?.toLowerCase()) ||
                        (c.phone && o.customerPhone && o.customerPhone.replace(/[^0-9]/g, '') === c.phone.replace(/[^0-9]/g, ''))
                    ).length;
                    const totalOrders = typeof c.totalOrders === 'number' && c.totalOrders > 0 ? Math.max(c.totalOrders, userOrdersCount) : userOrdersCount;

                    return (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">{c.name}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border shadow-sm ${
                              c.role === 'admin' ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            }`}>
                              {c.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                              {c.role === 'admin' ? 'Admin' : 'Customer'}
                            </span>
                            {c.role === 'admin' && (
                              <select
                                value={c.role || 'customer'}
                                onChange={(e) => handleRoleChange(c.id, e.target.value as 'admin' | 'customer')}
                                className="text-[10px] bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-slate-200 cursor-pointer"
                              >
                                <option value="customer">Customer</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{c.email}</td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                          {c.phone || orders.find(o => o.userId === c.id || (c.email && o.customerEmail?.toLowerCase() === c.email?.toLowerCase()))?.customerPhone || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <ShoppingBag className="w-3 h-3 text-amber-400" />
                            <span>{totalOrders} {totalOrders === 1 ? 'order' : 'orders'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                            c.accountStatus === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}>
                            {c.accountStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              setPasswordChangeTarget(c);
                              setNewAdminUserPassword('');
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                            title="Change user password"
                          >
                            <Key className="w-3 h-3 text-amber-400" />
                            <span>Change Password</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStatusChange(c.id, c.accountStatus === 'active' ? 'suspended' : 'active')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                c.accountStatus === 'active' ? 'text-rose-400 hover:bg-rose-950/40 border border-rose-900' : 'text-emerald-400 hover:bg-emerald-950/40 border border-emerald-900'
                              }`}
                            >
                              {c.accountStatus === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(c.id, c.name)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Admin Users Pagination */}
            {filteredCustomers.length > adminUsersPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-400">
                <span>
                  Showing {(adminUserPage - 1) * adminUsersPerPage + 1}–{Math.min(adminUserPage * adminUsersPerPage, filteredCustomers.length)} of {filteredCustomers.length} users
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={adminUserPage === 1}
                    onClick={() => setAdminUserPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalUserPages }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => setAdminUserPage(num)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                        adminUserPage === num
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    disabled={adminUserPage >= totalUserPages}
                    onClick={() => setAdminUserPage((p) => Math.min(totalUserPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ---------------- MODALS (Order, Item, Category, Stock, Delete) ---------------- */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setViewingOrder(null)} className="fixed inset-0 bg-black/70 backdrop-blur-xs" />
          <div className="relative w-full max-w-2xl bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl p-6 z-10 space-y-4 max-h-[90vh] overflow-y-auto text-xs text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-white">Order #{viewingOrder.orderNumber}</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Placed on: {new Date(viewingOrder.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button onClick={() => setViewingOrder(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Customer Info</h4>
                <p className="font-semibold text-white">{viewingOrder.customerName}</p>
                <p className="text-slate-300">{viewingOrder.shippingAddress.street}, {viewingOrder.shippingAddress.city}</p>
                <p className="font-mono mt-1 text-slate-400">{viewingOrder.customerPhone}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Status & Payment</h4>
                <div className="space-y-2">
                  <p className="text-slate-300">Payment Method: <strong className="uppercase text-amber-400">{viewingOrder.paymentMethod}</strong></p>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Payment Status:</span>
                    <select
                      value={viewingOrder.paymentStatus}
                      onChange={(e) => handleUpdatePaymentStatus(viewingOrder.id, e.target.value)}
                      className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg font-semibold text-[11px] text-white focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="refunded">Refunded</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <label className="block font-semibold text-slate-300">Update Fulfillment Status:</label>
                  <select
                    value={viewingOrder.orderStatus}
                    onChange={(e) => handleUpdateOrderStatus(viewingOrder.id, e.target.value as OrderStatus)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg font-semibold text-xs text-white focus:outline-none"
                  >
                    <option value="placed">Pending</option>
                    <option value="packed">Packed</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Ordered Items</h4>
              {viewingOrder.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2.5">
                    <img src={item.image} alt={item.productName} className="w-9 h-9 rounded-lg object-contain bg-slate-800 p-0.5" />
                    <div><p className="font-medium text-white">{item.productName}</p><p className="text-[10px] text-slate-400">Qty: {item.quantity}</p></div>
                  </div>
                  <span className="font-mono font-bold text-white">₹{item.subtotal}</span>
                </div>
              ))}
              <div className="pt-2 flex justify-between font-bold text-sm text-white">
                <span>Total Amount:</span><span className="font-mono text-amber-400 text-base">₹{viewingOrder.totalAmount}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  const ord = viewingOrder;
                  setViewingOrder(null);
                  setDeleteConfirmation({
                    type: 'order',
                    id: ord.id,
                    name: `Order #${ord.orderNumber}`,
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 rounded-xl text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Order</span>
              </button>
              <button onClick={() => setViewingOrder(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}

      {productModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setProductModalOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-xs" />
          <div className="relative w-full max-w-2xl bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl p-6 z-10 space-y-4 max-h-[90vh] overflow-y-auto text-xs text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display text-lg font-bold text-white">{editingProduct.id ? 'Edit Item' : 'Add New Item'}</h3>
              <button onClick={() => setProductModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block font-semibold text-slate-300 mb-1">Item Name *</label><input type="text" required value={editingProduct.name || ''} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500" /></div>
                <div><label className="block font-semibold text-slate-300 mb-1">Category *</label><select required value={editingProduct.categoryId || ''} onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500">{categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
                <div className="sm:col-span-2"><label className="block font-semibold text-slate-300 mb-1">Campaign Offer (Dynamic)</label><input type="text" value={editingProduct.campaignOffer || ''} onChange={(e) => setEditingProduct({ ...editingProduct, campaignOffer: e.target.value })} placeholder="e.g. Special Deepavali Discount / Buy 1 Get 1" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500" /></div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Base Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.basePrice || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const vars = [...(editingProduct.variants || [])];
                      const idx500 = vars.findIndex((v) => v.weight === '500g');
                      if (idx500 >= 0) {
                        vars[idx500] = { ...vars[idx500], price: val, salePrice: undefined };
                      }
                      setEditingProduct({ ...editingProduct, basePrice: val, salePrice: undefined, variants: vars });
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div><label className="block font-semibold text-slate-300 mb-1">Stock Quantity *</label><input type="number" required value={editingProduct.stockQuantity ?? 50} onChange={(e) => setEditingProduct({ ...editingProduct, stockQuantity: parseInt(e.target.value, 10) || 0 })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 font-mono" /></div>
                {/* Gram Packaging & Pricing (250g, 500g, 1kg) */}
                <div className="sm:col-span-2 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-200 text-xs">Packaging Sizes & Gram Pricing</h4>
                      <p className="text-[10px] text-slate-400">Set specific prices for 250g, 500g, and 1kg packs (reflects instantly in customer UI)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* 250g */}
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-amber-400 text-xs">
                        <span>250g Pack</span>
                        <span className="text-[9px] text-slate-500 font-mono">1/4 Kg</span>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Price (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={editingProduct.variants?.find((v) => v.weight === '250g')?.price || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const vars = [...(editingProduct.variants || [])];
                            const idx = vars.findIndex((v) => v.weight === '250g');
                            if (idx >= 0) {
                              vars[idx] = { ...vars[idx], price: val, salePrice: undefined };
                            } else {
                              vars.push({ id: `${editingProduct.id || 'p'}_250g`, weight: '250g', price: val, salePrice: undefined, stockQuantity: 4, sku: `${editingProduct.sku || 'PV'}-250G` });
                            }
                            setEditingProduct({ ...editingProduct, variants: vars });
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* 500g */}
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-amber-400 text-xs">
                        <span>500g Pack</span>
                        <span className="text-[9px] text-slate-500 font-mono">1/2 Kg (Std)</span>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Price (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={editingProduct.variants?.find((v) => v.weight === '500g')?.price || editingProduct.basePrice || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const vars = [...(editingProduct.variants || [])];
                            const idx = vars.findIndex((v) => v.weight === '500g');
                            if (idx >= 0) {
                              vars[idx] = { ...vars[idx], price: val, salePrice: undefined };
                            } else {
                              vars.push({ id: `${editingProduct.id || 'p'}_500g`, weight: '500g', price: val, salePrice: undefined, stockQuantity: 4, sku: `${editingProduct.sku || 'PV'}-500G` });
                            }
                            setEditingProduct({ ...editingProduct, basePrice: val, salePrice: undefined, variants: vars });
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* 1kg */}
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-amber-400 text-xs">
                        <span>1kg Pack</span>
                        <span className="text-[9px] text-slate-500 font-mono">1 Kg Family</span>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Price (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={editingProduct.variants?.find((v) => v.weight === '1kg')?.price || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const vars = [...(editingProduct.variants || [])];
                            const idx = vars.findIndex((v) => v.weight === '1kg');
                            if (idx >= 0) {
                              vars[idx] = { ...vars[idx], price: val, salePrice: undefined };
                            } else {
                              vars.push({ id: `${editingProduct.id || 'p'}_1kg`, weight: '1kg', price: val, salePrice: undefined, stockQuantity: 2, sku: `${editingProduct.sku || 'PV'}-1KG` });
                            }
                            setEditingProduct({ ...editingProduct, variants: vars });
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-300">Product Image URL *</label>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Editable by Admin
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={editingProduct.images?.[0] || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, images: [e.target.value] })}
                    placeholder="/src/assets/images/... or https://..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  {editingProduct.images?.[0] && (
                    <div className="flex items-center gap-3 pt-1">
                      <img
                        src={editingProduct.images[0]}
                        alt={editingProduct.name || 'Product'}
                        className="w-10 h-10 rounded-lg object-contain bg-slate-800 border border-slate-700 shrink-0 p-0.5"
                      />
                      <span className="font-mono text-[10px] text-slate-400 truncate">
                        {editingProduct.images[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setProductModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 rounded-xl font-bold">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setCategoryModalOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl p-6 z-10 space-y-4 text-xs text-slate-200">
            <h3 className="font-display text-base font-bold text-white">{editingCategory.id ? 'Edit Category' : 'Create Category'}</h3>
            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              <div><label className="block font-semibold text-slate-300 mb-1">Category Name *</label><input type="text" required value={editingCategory.name || ''} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500" /></div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setCategoryModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 rounded-xl font-bold">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {stockModalOpen && stockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setStockModalOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-xs" />
          <div className="relative w-full max-w-sm bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl p-6 z-10 space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm">Quick Stock Update</h3>
            <p className="text-slate-400">Adjust units for <strong className="text-white">{stockTarget.productName}</strong>.</p>
            <input type="number" min="0" value={newStockValue} onChange={(e) => setNewStockValue(parseInt(e.target.value, 10) || 0)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setStockModalOpen(false)} className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg">Cancel</button>
              <button onClick={handleAdjustStock} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg">Save Stock</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setDeleteConfirmation(null)} className="fixed inset-0 bg-black/70 backdrop-blur-xs" />
          <div className="relative w-full max-w-sm bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-700 p-6 z-10 space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm"><AlertTriangle className="w-5 h-5" /><span>Confirm Delete</span></div>
            <p className="text-slate-300 leading-relaxed">Delete <strong className="text-white">"{deleteConfirmation.name}"</strong> permanently? This cannot be undone.</p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button onClick={() => setDeleteConfirmation(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold">Cancel</button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      {passwordChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setPasswordChangeTarget(null)} className="fixed inset-0 bg-black/70 backdrop-blur-xs" />
          <div className="relative w-full max-w-sm bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl p-6 z-10 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Update User Password</h3>
              </div>
              <button onClick={() => setPasswordChangeTarget(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="text-slate-400 text-xs">
                Setting new password for: <strong className="text-white">{passwordChangeTarget.name}</strong> ({passwordChangeTarget.email})
              </p>
            </div>
            <form onSubmit={handleUpdateUserPassword} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">New Password (min 6 chars)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newAdminUserPassword}
                    onChange={(e) => setNewAdminUserPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const rnd = Math.random().toString(36).substring(2, 10);
                      setNewAdminUserPassword(rnd);
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold rounded-xl text-[10px] whitespace-nowrap cursor-pointer"
                  >
                    Random
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordChangeTarget(null)}
                  className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUserPassword}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingUserPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
