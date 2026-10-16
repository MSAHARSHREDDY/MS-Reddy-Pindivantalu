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
  Calendar,
  Filter,
  Megaphone,
  Percent,
  RotateCcw,
  Zap,
  Sliders,
  ArrowRight,
  CreditCard,
  Banknote,
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

export type TimeFilterOption = 'today' | 'yesterday' | '1week' | 'last_month' | 'year' | 'all';

export const TIME_FILTER_LABELS: Record<TimeFilterOption, string> = {
  today: 'Today Orders',
  yesterday: 'Yesterday',
  '1week': '1 Week',
  last_month: 'Last Month',
  year: 'Year',
  all: 'All Time',
};

export function isOrderInTimeFilter(orderCreatedAt: string, filter: TimeFilterOption): boolean {
  if (filter === 'all') return true;
  if (!orderCreatedAt) return false;
  const orderDate = new Date(orderCreatedAt);
  if (isNaN(orderDate.getTime())) return false;

  const now = new Date();

  // Local calendar numbers
  const oYear = orderDate.getFullYear();
  const oMonth = orderDate.getMonth();
  const oDay = orderDate.getDate();

  const nYear = now.getFullYear();
  const nMonth = now.getMonth();
  const nDay = now.getDate();

  const startOfToday = new Date(nYear, nMonth, nDay, 0, 0, 0, 0);
  const endOfToday = new Date(nYear, nMonth, nDay, 23, 59, 59, 999);

  // UTC day string match
  const orderIsoDay = orderDate.toISOString().slice(0, 10);
  const todayIsoDay = now.toISOString().slice(0, 10);

  const yesterdayDate = new Date(nYear, nMonth, nDay - 1, 0, 0, 0, 0);
  const yesterdayIsoDay = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

  if (filter === 'today') {
    const isLocalToday = (oYear === nYear && oMonth === nMonth && oDay === nDay) || (orderDate >= startOfToday && orderDate <= endOfToday);
    const isIsoToday = orderIsoDay === todayIsoDay;
    return isLocalToday || isIsoToday;
  }

  if (filter === 'yesterday') {
    const isLocalYesterday = oYear === yesterdayDate.getFullYear() && oMonth === yesterdayDate.getMonth() && oDay === yesterdayDate.getDate();
    const isIsoYesterday = orderIsoDay === yesterdayIsoDay;
    return isLocalYesterday || isIsoYesterday;
  }

  if (filter === '1week') {
    const oneWeekAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    return orderDate.getTime() >= oneWeekAgoMs && orderDate.getTime() <= now.getTime();
  }

  if (filter === 'last_month') {
    const thirtyDaysAgoMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    return orderDate.getTime() >= thirtyDaysAgoMs && orderDate.getTime() <= now.getTime();
  }

  if (filter === 'year') {
    const oneYearAgoMs = now.getTime() - 365 * 24 * 60 * 60 * 1000;
    return oYear === nYear || orderDate.getTime() >= oneYearAgoMs;
  }

  return true;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToStore, onRefreshCatalog }) => {
  const { user, isAdmin, logout } = useAuth();
  // Tabs: Dashboard, Items (replaces Meal Menu), Orders, Users, Campaign
  const [activeTab, setActiveTab] = useState<'dashboard' | 'items' | 'orders' | 'users' | 'campaign'>('dashboard');

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
  const [dashboardTimeFilter, setDashboardTimeFilter] = useState<TimeFilterOption>('all');
  const [orderTimeFilter, setOrderTimeFilter] = useState<TimeFilterOption>('all');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState('all');
  const [productCampaignFilter, setProductCampaignFilter] = useState<'all' | 'active' | 'none'>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<'all' | 'cod' | 'razorpay' | 'upi'>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [customerRoleFilter, setCustomerRoleFilter] = useState<'all' | 'admin' | 'customer'>('all');
  const [customerSearch, setCustomerSearch] = useState('');

  // Pagination states
  const [adminOrderPage, setAdminOrderPage] = useState(1);
  const adminOrdersPerPage = 8;
  const [adminUserPage, setAdminUserPage] = useState(1);
  const adminUsersPerPage = 8;

  // Campaign & Dynamic Pricing states
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignCategoryFilter, setCampaignCategoryFilter] = useState('all');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<'all' | 'active' | 'none'>('all');

  // Bulk Campaign states
  const [bulkCampaignTitle, setBulkCampaignTitle] = useState('Festive Dhamaka - 20% OFF');
  const [bulkDiscountPct, setBulkDiscountPct] = useState<number>(20);
  const [bulkTargetCategory, setBulkTargetCategory] = useState('all');
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkResetting, setBulkResetting] = useState(false);

  // Per-item inline discount drafts: Record<productId, { pct: number; title: string }>
  const [itemCampaignDrafts, setItemCampaignDrafts] = useState<Record<string, { pct: number; title: string }>>({});

  // Single Item Detailed Campaign Modal state
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignProduct, setCampaignProduct] = useState<Product | null>(null);
  const [modalDiscountPct, setModalDiscountPct] = useState<number>(20);
  const [modalCampaignTitle, setModalCampaignTitle] = useState<string>('');
  const [modalBasePrice, setModalBasePrice] = useState<number>(0);
  const [modalOriginalBasePrice, setModalOriginalBasePrice] = useState<number>(0);
  const [modalVariants, setModalVariants] = useState<Array<{
    id: string;
    weight: string;
    price: number;
    originalPrice?: number;
    stockQuantity: number;
    sku: string;
  }>>([]);
  const [modalSaving, setModalSaving] = useState(false);

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
      images: ['https://plain-apac-prod-public.komododecks.com/202610/10/mUWn1R1masto5BxrVzed/image.png'],
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

  // ---------------- CAMPAIGN & DYNAMIC PRICING HANDLERS ----------------
  const getItemDraft = (p: Product) => {
    if (itemCampaignDrafts[p.id]) return itemCampaignDrafts[p.id];
    let defaultPct = 20;
    if (p.originalBasePrice && p.originalBasePrice > p.basePrice) {
      defaultPct = Math.round(((p.originalBasePrice - p.basePrice) / p.originalBasePrice) * 100);
    }
    return {
      pct: defaultPct,
      title: p.campaignOffer || `${defaultPct}% OFF Offer`,
    };
  };

  const setItemDraftPct = (productId: string, pct: number, defaultTitle?: string) => {
    setItemCampaignDrafts((prev) => ({
      ...prev,
      [productId]: {
        pct,
        title: prev[productId]?.title || defaultTitle || `${pct}% OFF Offer`,
      },
    }));
  };

  const setItemDraftTitle = (productId: string, title: string) => {
    setItemCampaignDrafts((prev) => ({
      ...prev,
      [productId]: {
        pct: prev[productId]?.pct ?? 20,
        title,
      },
    }));
  };

  const handleOpenCampaignModal = (p: Product) => {
    const origBase = p.originalBasePrice || p.basePrice;
    let initialPct = 20;
    if (p.originalBasePrice && p.originalBasePrice > p.basePrice) {
      initialPct = Math.round(((p.originalBasePrice - p.basePrice) / p.originalBasePrice) * 100);
    }

    const rawVars = p.variants || [];
    const baseP = p.basePrice;
    const v250 = rawVars.find((v) => v.weight === '250g');
    const v500 = rawVars.find((v) => v.weight === '500g');
    const v1kg = rawVars.find((v) => v.weight === '1kg');

    const standardVariants = [
      {
        id: v250?.id || `${p.id}_250g`,
        weight: '250g',
        price: v250 ? v250.price : Math.round(baseP * 0.55),
        originalPrice: v250?.originalPrice || (v250 ? v250.price : Math.round(origBase * 0.55)),
        stockQuantity: v250?.stockQuantity || 10,
        sku: v250?.sku || `${p.sku || 'PV'}-250G`,
      },
      {
        id: v500?.id || `${p.id}_500g`,
        weight: '500g',
        price: v500 ? v500.price : baseP,
        originalPrice: v500?.originalPrice || (v500 ? v500.price : origBase),
        stockQuantity: v500?.stockQuantity || 10,
        sku: v500?.sku || `${p.sku || 'PV'}-500G`,
      },
      {
        id: v1kg?.id || `${p.id}_1kg`,
        weight: '1kg',
        price: v1kg ? v1kg.price : Math.round(baseP * 1.9),
        originalPrice: v1kg?.originalPrice || (v1kg ? v1kg.price : Math.round(origBase * 1.9)),
        stockQuantity: v1kg?.stockQuantity || 5,
        sku: v1kg?.sku || `${p.sku || 'PV'}-1KG`,
      },
    ];

    setCampaignProduct(p);
    setModalOriginalBasePrice(origBase);
    setModalDiscountPct(initialPct);
    setModalCampaignTitle(p.campaignOffer || `${initialPct}% OFF Festive Offer`);
    setModalBasePrice(p.basePrice);
    setModalVariants(standardVariants);
    setCampaignModalOpen(true);
  };

  const handleModalDiscountPctChange = (newPct: number) => {
    setModalDiscountPct(newPct);
    const newBase = Math.max(1, Math.round(modalOriginalBasePrice * (1 - newPct / 100)));
    setModalBasePrice(newBase);

    const updatedVars = modalVariants.map((v) => {
      const origVarP = v.originalPrice || v.price;
      const newVarP = Math.max(1, Math.round(origVarP * (1 - newPct / 100)));
      return {
        ...v,
        price: newVarP,
        originalPrice: origVarP,
      };
    });
    setModalVariants(updatedVars);
  };

  const handleSaveModalCampaign = async () => {
    if (!campaignProduct) return;
    setModalSaving(true);
    try {
      await api.updateProductCampaign(campaignProduct.id, {
        basePrice: modalBasePrice,
        originalBasePrice: modalOriginalBasePrice,
        campaignOffer: modalCampaignTitle,
        variants: modalVariants.map((v) => {
          let orig = v.originalPrice;
          if (!orig || orig <= v.price) {
            if (v.weight.toLowerCase() === '250g') orig = Math.round(modalOriginalBasePrice * 0.55);
            else if (v.weight.toLowerCase() === '1kg') orig = Math.round(modalOriginalBasePrice * 1.9);
            else orig = modalOriginalBasePrice;
          }
          return {
            ...v,
            originalPrice: orig,
          };
        }),
      });

      showToast(`Campaign offer saved! Prices updated for 250g, 500g, 1kg & Base price.`, 'success');
      setCampaignModalOpen(false);
      setCampaignProduct(null);
      await loadAllData(false);
      onRefreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to update campaign pricing', 'error');
    } finally {
      setModalSaving(false);
    }
  };

  const handleQuickApplyItemCampaign = async (p: Product) => {
    const draft = getItemDraft(p);
    const pct = draft.pct;
    const title = draft.title || `${pct}% OFF Offer`;

    const origBase = p.originalBasePrice || p.basePrice;
    const newBase = Math.max(1, Math.round(origBase * (1 - pct / 100)));

    const rawVars = p.variants || [];
    const v250 = rawVars.find((v) => v.weight === '250g');
    const v500 = rawVars.find((v) => v.weight === '500g');
    const v1kg = rawVars.find((v) => v.weight === '1kg');

    const orig250 = v250?.originalPrice || (v250 ? v250.price : Math.round(origBase * 0.55));
    const orig500 = v500?.originalPrice || (v500 ? v500.price : origBase);
    const orig1kg = v1kg?.originalPrice || (v1kg ? v1kg.price : Math.round(origBase * 1.9));

    const newVariants = [
      {
        id: v250?.id || `${p.id}_250g`,
        weight: '250g',
        price: Math.max(1, Math.round(orig250 * (1 - pct / 100))),
        originalPrice: orig250,
        stockQuantity: v250?.stockQuantity || 10,
        sku: v250?.sku || `${p.sku || 'PV'}-250G`,
      },
      {
        id: v500?.id || `${p.id}_500g`,
        weight: '500g',
        price: newBase,
        originalPrice: orig500,
        stockQuantity: v500?.stockQuantity || 10,
        sku: v500?.sku || `${p.sku || 'PV'}-500G`,
      },
      {
        id: v1kg?.id || `${p.id}_1kg`,
        weight: '1kg',
        price: Math.max(1, Math.round(orig1kg * (1 - pct / 100))),
        originalPrice: orig1kg,
        stockQuantity: v1kg?.stockQuantity || 5,
        sku: v1kg?.sku || `${p.sku || 'PV'}-1KG`,
      },
    ];

    try {
      await api.updateProductCampaign(p.id, {
        basePrice: newBase,
        originalBasePrice: origBase,
        campaignOffer: title,
        variants: newVariants,
      });

      showToast(`Applied ${title} to ${p.name}! Prices dynamically updated from 250g to 1kg & Base.`, 'success');
      await loadAllData(false);
      onRefreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to apply campaign to item', 'error');
    }
  };

  const handleResetItemCampaign = async (p: Product) => {
    try {
      await api.resetCampaign({ productIds: [p.id] });
      showToast(`Restored original prices for ${p.name}.`, 'success');
      await loadAllData(false);
      onRefreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset item pricing', 'error');
    }
  };

  const handleApplyBulkCampaign = async () => {
    if (!bulkCampaignTitle.trim()) {
      showToast('Please enter a campaign offer title.', 'error');
      return;
    }
    setBulkApplying(true);
    try {
      const res = await api.applyCampaign({
        categoryId: bulkTargetCategory,
        campaignOffer: bulkCampaignTitle,
        discountPercentage: bulkDiscountPct,
      });

      showToast(res.message || `Campaign applied to ${res.updatedCount} items!`, 'success');
      await loadAllData(false);
      onRefreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to apply bulk campaign', 'error');
    } finally {
      setBulkApplying(false);
    }
  };

  const handleResetAllCampaigns = async () => {
    setBulkResetting(true);
    try {
      const res = await api.resetCampaign({});
      showToast(res.message || 'All items restored to original regular prices.', 'success');
      await loadAllData(false);
      onRefreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset campaigns', 'error');
    } finally {
      setBulkResetting(false);
    }
  };

  // ---------------- CATEGORY HANDLERS ----------------
  const handleOpenAddCategory = () => {
    setEditingCategory({
      name: '',
      slug: '',
      description: '',
      image: 'https://plain-apac-prod-public.komododecks.com/202610/10/NBJ0ZY4DkywRecmBXl0v/image.png',
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
        setViewingOrder({
          ...viewingOrder,
          orderStatus: status,
          paymentStatus: status === 'cancelled' && (viewingOrder.paymentMethod === 'razorpay' || viewingOrder.paymentStatus === 'completed') ? 'refunded' : viewingOrder.paymentStatus
        });
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
    const matchesCampaign =
      productCampaignFilter === 'all' ||
      (productCampaignFilter === 'active' && Boolean(p.campaignOffer)) ||
      (productCampaignFilter === 'none' && !p.campaignOffer);
    return matchesSearch && matchesCategory && matchesCampaign;
  });

  const filteredOrders = orders.filter((o) => {
    const matchesTime = isOrderInTimeFilter(o.createdAt, orderTimeFilter);
    const matchesStatus = orderStatusFilter === 'all' || o.orderStatus === orderStatusFilter;
    const matchesPayment =
      orderPaymentFilter === 'all' || (o.paymentMethod || 'cod') === orderPaymentFilter;
    const matchesSearch =
      !orderSearch ||
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerPhone.includes(orderSearch) ||
      (o.paymentMethod && o.paymentMethod.toLowerCase().includes(orderSearch.toLowerCase())) ||
      (o.paymentId && o.paymentId.toLowerCase().includes(orderSearch.toLowerCase()));
    return matchesTime && matchesStatus && matchesPayment && matchesSearch;
  });

  const filteredOrdersRevenue = filteredOrders
    .filter((o) => o.orderStatus !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

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
  }, [orderStatusFilter, orderSearch, orderTimeFilter, orderPaymentFilter]);

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

  // ---------------- DYNAMIC DASHBOARD CALCULATIONS (by dashboardTimeFilter) ----------------
  const dashboardOrders = orders.filter((o) => isOrderInTimeFilter(o.createdAt, dashboardTimeFilter));

  const dashboardGrossRevenue = dashboardOrders
    .filter((o) => o.orderStatus !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const dashboardTotalOrders = dashboardOrders.length;
  const dashboardDeliveredOrders = dashboardOrders.filter((o) => o.orderStatus === 'delivered').length;
  const dashboardCancelledOrders = dashboardOrders.filter((o) => o.orderStatus === 'cancelled').length;

  const validDashboardOrders = dashboardOrders.filter((o) => o.orderStatus !== 'cancelled');
  const dashboardAvgOrderValue = validDashboardOrders.length > 0
    ? Math.round(dashboardGrossRevenue / validDashboardOrders.length)
    : 0;

  // Calculate Order Progression Cycle counts for Dashboard
  const pendingOrdersCount = dashboardOrders.filter((o) => o.orderStatus === 'placed' || o.orderStatus === 'confirmed').length;
  const packedOrdersCount = dashboardOrders.filter((o) => o.orderStatus === 'packed' || o.orderStatus === 'preparing').length;
  const dispatchedOrdersCount = dashboardOrders.filter((o) => o.orderStatus === 'dispatched' || o.orderStatus === 'shipped').length;
  const deliveredOrdersCount = dashboardDeliveredOrders;
  const cancelledOrdersCount = dashboardCancelledOrders;

  const totalUsersCount = customers.length || 0;

  // Calculate Dynamic Category Performance for Dashboard
  const categoryPerformance = categories.map((cat) => {
    const catRevenue = dashboardOrders
      .filter((o) => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => {
        const orderCatSum = o.items
          .filter((item) => {
            const product = products.find((p) => p.id === item.productId);
            return product?.categoryId === cat.id;
          })
          .reduce((s, item) => s + item.subtotal, 0);
        return sum + orderCatSum;
      }, 0);

    return {
      id: cat.id,
      name: cat.name,
      revenue: catRevenue,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const totalCatRevenue = categoryPerformance.reduce((sum, cp) => sum + cp.revenue, 0) || 1;

  // Dynamic Top Products for Dashboard
  const dashboardTopProducts = (() => {
    const productStatsMap = new Map<string, { id: string; name: string; revenue: number; quantity: number }>();
    dashboardOrders
      .filter((o) => o.orderStatus !== 'cancelled')
      .forEach((ord) => {
        ord.items.forEach((item) => {
          const prev = productStatsMap.get(item.productId) || {
            id: item.productId,
            name: item.productName,
            revenue: 0,
            quantity: 0,
          };
          prev.revenue += item.subtotal;
          prev.quantity += item.quantity;
          productStatsMap.set(item.productId, prev);
        });
      });
    const list = Array.from(productStatsMap.values()).sort((a, b) => b.revenue - a.revenue);
    if (list.length > 0) return list;
    return (stats?.topProducts || []).slice(0, 5);
  })();

  // Dynamic Sales Flow Chart Data based on dashboardTimeFilter
  const salesFlowData = (() => {
    const now = new Date();
    const validOrders = dashboardOrders.filter((o) => o.orderStatus !== 'cancelled');

    if (dashboardTimeFilter === 'today' || dashboardTimeFilter === 'yesterday') {
      const isToday = dashboardTimeFilter === 'today';
      const title = isToday ? "Today's Sales Breakdown" : "Yesterday's Sales Breakdown";
      const badge = isToday ? "TODAY'S HOURLY FLOW" : "YESTERDAY'S FLOW";
      const subtitle = isToday
        ? "Live sales revenue and booking logs recorded by hour today."
        : "Culinary order volume and revenue logged across yesterday's hours.";

      const slots = [
        { label: '4 AM', minH: 0, maxH: 4 },
        { label: '8 AM', minH: 4, maxH: 8 },
        { label: '12 PM', minH: 8, maxH: 12 },
        { label: '4 PM', minH: 12, maxH: 16 },
        { label: '8 PM', minH: 16, maxH: 20 },
        { label: '11 PM', minH: 20, maxH: 24 },
      ];

      const points = slots.map((s) => {
        const val = validOrders
          .filter((o) => {
            const h = new Date(o.createdAt).getHours();
            return h >= s.minH && h < s.maxH;
          })
          .reduce((sum, o) => sum + o.totalAmount, 0);
        return {
          label: s.label,
          val,
          display: `₹${val.toLocaleString('en-IN')}`,
        };
      });

      return { title, badge, subtitle, points };
    }

    if (dashboardTimeFilter === '1week') {
      const title = "Past 7 Days Sales Trend";
      const badge = "7-DAY SALES FLOW";
      const subtitle = "Daily gross revenue and order intake across the last 7 days.";

      const points = [];
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const dayDate = new Date(now.getTime() - i * 86400000);
        const dayIso = dayDate.toISOString().slice(0, 10);
        const dayLabel = `${weekdays[dayDate.getDay()]} ${dayDate.getDate()}`;
        const val = validOrders
          .filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) === dayIso)
          .reduce((sum, o) => sum + o.totalAmount, 0);
        points.push({
          label: dayLabel,
          val,
          display: `₹${val.toLocaleString('en-IN')}`,
        });
      }

      return { title, badge, subtitle, points };
    }

    if (dashboardTimeFilter === 'last_month') {
      const title = "Past 30 Days Sales Trend";
      const badge = "30-DAY SALES FLOW";
      const subtitle = "Weekly gross revenue and order volume over the last 30 days.";

      const points = [];
      for (let w = 4; w >= 0; w--) {
        const startDaysAgo = (w + 1) * 6;
        const endDaysAgo = w * 6;
        const startMs = now.getTime() - startDaysAgo * 86400000;
        const endMs = now.getTime() - endDaysAgo * 86400000;
        const label = w === 0 ? 'Current' : `Wk -${w}`;
        const val = validOrders
          .filter((o) => {
            const t = new Date(o.createdAt).getTime();
            return t >= startMs && t <= endMs;
          })
          .reduce((sum, o) => sum + o.totalAmount, 0);
        points.push({
          label,
          val,
          display: `₹${val.toLocaleString('en-IN')}`,
        });
      }

      return { title, badge, subtitle, points };
    }

    if (dashboardTimeFilter === 'year') {
      const title = "Annual Monthly Sales Flow";
      const badge = "ANNUAL MONTHLY FLOW";
      const subtitle = "Month-by-month gross revenue progression for the current year.";

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const points = monthNames.map((mName, mIdx) => {
        const val = validOrders
          .filter((o) => {
            const d = new Date(o.createdAt);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === mIdx;
          })
          .reduce((sum, o) => sum + o.totalAmount, 0);
        return {
          label: mName,
          val,
          display: `₹${val.toLocaleString('en-IN')}`,
        };
      });

      return { title, badge, subtitle, points };
    }

    // Default: 'all' (Dynamic All Time Monthly Sales)
    const title = "Monthly Sales Flow";
    const badge = "LIVE REVENUE TREND";
    const subtitle = "Dynamic monthly sales flow computed directly from customer order records.";

    const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Collect all valid order dates
    const orderDates = validOrders
      .map((o) => new Date(o.createdAt))
      .filter((d) => !isNaN(d.getTime()));

    // Generate rolling 6 months up to current month (or earlier if older orders exist)
    const monthSlots: { year: number; month: number; label: string }[] = [];

    let startYear = now.getFullYear();
    let startMonth = now.getMonth() - 5;
    while (startMonth < 0) {
      startMonth += 12;
      startYear -= 1;
    }

    if (orderDates.length > 0) {
      const minOrderTime = Math.min(...orderDates.map((d) => d.getTime()));
      const earliestOrderDate = new Date(minOrderTime);
      const earliestYear = earliestOrderDate.getFullYear();
      const earliestMonth = earliestOrderDate.getMonth();
      if (earliestYear < startYear || (earliestYear === startYear && earliestMonth < startMonth)) {
        startYear = earliestYear;
        startMonth = earliestMonth;
      }
    }

    let y = startYear;
    let m = startMonth;
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    while (y < currentYear || (y === currentYear && m <= currentMonth)) {
      const label = y === currentYear ? monthShortNames[m] : `${monthShortNames[m]} '${String(y).slice(-2)}`;
      monthSlots.push({ year: y, month: m, label });
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }

    // Completely dynamic calculation from validOrders without any static mock numbers
    const points = monthSlots.map((slot) => {
      const val = validOrders
        .filter((o) => {
          const d = new Date(o.createdAt);
          return !isNaN(d.getTime()) && d.getFullYear() === slot.year && d.getMonth() === slot.month;
        })
        .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

      return {
        label: slot.label,
        val,
        display: `₹${val.toLocaleString('en-IN')}`,
      };
    });

    return { title, badge, subtitle, points };
  })();

  // Calculate coordinates for SVG line and polygon
  const maxChartVal = Math.max(...salesFlowData.points.map((p) => p.val), 1);
  const chartPoints = salesFlowData.points.map((pt, i, arr) => {
    const n = arr.length;
    const startX = 60;
    const endX = 540;
    const cx = n > 1 ? startX + (i / (n - 1)) * (endX - startX) : 300;
    const cy = pt.val === 0 ? 170 : Math.max(35, 170 - (pt.val / maxChartVal) * 135);
    const isPeak = pt.val > 0 && pt.val === maxChartVal;
    return { ...pt, cx, cy, peak: isPeak };
  });

  const chartPathD = chartPoints.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.cx} ${pt.cy}`;
    const prev = chartPoints[i - 1];
    const cpX1 = prev.cx + (pt.cx - prev.cx) * 0.5;
    const cpY1 = prev.cy;
    const cpX2 = prev.cx + (pt.cx - prev.cx) * 0.5;
    const cpY2 = pt.cy;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.cx} ${pt.cy}`;
  }, '');

  const chartPolygonPoints = chartPoints.length > 0
    ? `${chartPoints.map((p) => `${p.cx},${p.cy}`).join(' ')} ${chartPoints[chartPoints.length - 1].cx},170 ${chartPoints[0].cx},170`
    : '';

  const peakPoint = chartPoints.reduce((max, p) => (p.val > max.val ? p : max), chartPoints[0] || { label: '-', val: 0, display: '₹0' });

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
            onClick={() => {
              setActiveTab('users');
              loadAllData(false);
            }}
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

          <button
            onClick={() => setActiveTab('campaign')}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'campaign'
                ? 'bg-[#F59E0B] text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Megaphone className="w-4 h-4 shrink-0" />
              <span>Campaign</span>
            </div>
            {products.filter((p) => Boolean(p.campaignOffer)).length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                activeTab === 'campaign' ? 'bg-amber-900/40 text-slate-950' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {products.filter((p) => Boolean(p.campaignOffer)).length}
              </span>
            )}
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
            {/* Dashboard Period Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-white">Dashboard Analytics Overview</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold uppercase">
                      {TIME_FILTER_LABELS[dashboardTimeFilter]}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Live revenue, sales flow, and order metrics dynamically calculated for {TIME_FILTER_LABELS[dashboardTimeFilter].toLowerCase()}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Filter Period:</span>
                <select
                  value={dashboardTimeFilter}
                  onChange={(e) => setDashboardTimeFilter(e.target.value as TimeFilterOption)}
                  className="px-3.5 py-1.5 text-xs bg-slate-900 border border-slate-700 hover:border-amber-500 text-white font-semibold rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm transition-colors"
                >
                  <option value="today">Today Orders</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="1week">1 Week</option>
                  <option value="last_month">Last Month</option>
                  <option value="year">Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>

            {/* Top Row: 4 Overview Stat Cards (GROSS REVENUE, TOTAL ORDERS, AVG TICKET, USERS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Gross Revenue */}
              <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                    GROSS REVENUE
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                    ₹{dashboardGrossRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {TIME_FILTER_LABELS[dashboardTimeFilter]} sales logs
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center justify-center font-bold text-lg shadow-inner">
                  <span>₹</span>
                </div>
              </div>

              {/* Card 2: Total Orders */}
              <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                    TOTAL ORDERS
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                    {dashboardTotalOrders}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {dashboardDeliveredOrders} delivered · {dashboardCancelledOrders} cancelled
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 flex items-center justify-center shadow-inner">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: Avg Order Value */}
              <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                    AVG ORDER VALUE
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                    ₹{dashboardAvgOrderValue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ticket size for {TIME_FILTER_LABELS[dashboardTimeFilter].toLowerCase()}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400 flex items-center justify-center shadow-inner">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              {/* Card 4: Total Users */}
              <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                    REGISTERED USERS
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                    {totalUsersCount}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Active dining accounts
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
                      <h3 className="font-semibold text-sm text-white">{salesFlowData.title}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {salesFlowData.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-6">
                    {salesFlowData.subtitle}
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
                    {chartPolygonPoints && (
                      <polygon
                        points={chartPolygonPoints}
                        fill="url(#amberGlowGradient)"
                      />
                    )}

                    {/* The iconic golden path */}
                    {chartPathD && (
                      <path
                        d={chartPathD}
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#glow)"
                      />
                    )}

                    {/* Circular nodes on the chart */}
                    {chartPoints.map((pt, idx) => (
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
                        {/* Dynamic Value Tooltip */}
                        <text
                          x={pt.cx}
                          y={Math.max(18, pt.cy - 10)}
                          textAnchor="middle"
                          fill="#FDE68A"
                          fontSize="10"
                          fontWeight="700"
                          className="opacity-75 group-hover:opacity-100 transition-opacity"
                        >
                          {pt.display}
                        </text>
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

                {/* Footer summary stats under chart */}
                <div className="pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Period Volume</span>
                    <span className="font-mono font-bold text-white text-sm">₹{dashboardGrossRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Orders Logged</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">{dashboardTotalOrders}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Peak Timepoint</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">{peakPoint.label} ({peakPoint.display})</span>
                  </div>
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
                    Revenue shares grouped by division for {TIME_FILTER_LABELS[dashboardTimeFilter].toLowerCase()}.
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
                      <p className="text-center text-slate-500 text-xs py-4">No data available for this period</p>
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
                    {TIME_FILTER_LABELS[dashboardTimeFilter].toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dashboardTopProducts.map((item, idx) => (
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
                  {dashboardTopProducts.length === 0 && (
                    <p className="text-center text-slate-500 text-xs py-6">No item purchases logged in this period</p>
                  )}
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
                    Order volume across stages for {TIME_FILTER_LABELS[dashboardTimeFilter].toLowerCase()}.
                  </p>

                  <div className="space-y-3">
                    {/* PENDING */}
                    <div
                      onClick={() => { setOrderStatusFilter('placed'); setOrderTimeFilter(dashboardTimeFilter); setActiveTab('orders'); }}
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
                      onClick={() => { setOrderStatusFilter('packed'); setOrderTimeFilter(dashboardTimeFilter); setActiveTab('orders'); }}
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
                      onClick={() => { setOrderStatusFilter('dispatched'); setOrderTimeFilter(dashboardTimeFilter); setActiveTab('orders'); }}
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
                      onClick={() => { setOrderStatusFilter('delivered'); setOrderTimeFilter(dashboardTimeFilter); setActiveTab('orders'); }}
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
                      onClick={() => { setOrderStatusFilter('cancelled'); setOrderTimeFilter(dashboardTimeFilter); setActiveTab('orders'); }}
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
                  Click any stage to filter orders stream for this period
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
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search items by name, SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={selectedProductCategory}
                  onChange={(e) => setSelectedProductCategory(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={productCampaignFilter}
                  onChange={(e) => setProductCampaignFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Items (Offers & Regular)</option>
                  <option value="active">Active Campaign Offers Only</option>
                  <option value="none">No Campaign Offer</option>
                </select>

                {(productSearch || selectedProductCategory !== 'all' || productCampaignFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearch('');
                      setSelectedProductCategory('all');
                      setProductCampaignFilter('all');
                    }}
                    className="px-2.5 py-1 text-xs text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>
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
                            {p.images && p.images[0] ? (
                              <img
                                src={p.images[0]}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-contain bg-slate-800 border border-slate-700 p-0.5"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                                {p.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-white">{p.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {p.campaignOffer ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 bg-amber-950/90 text-amber-300 border border-amber-800/80 rounded text-[10px] font-bold flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                <span>{p.campaignOffer}</span>
                              </span>
                              <button
                                onClick={() => {
                                  setActiveTab('campaign');
                                  handleOpenCampaignModal(p);
                                }}
                                className="text-[10px] text-amber-400 hover:underline font-semibold"
                                title="Edit Campaign"
                              >
                                Edit
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveTab('campaign');
                                handleOpenCampaignModal(p);
                              }}
                              className="text-slate-500 hover:text-amber-400 text-[10px] flex items-center gap-1 group transition-colors"
                            >
                              <Plus className="w-2.5 h-2.5 group-hover:scale-110 transition-transform" />
                              <span>Add offer</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{cat?.name || 'Uncategorized'}</td>
                        <td className="py-3 px-4 font-mono">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-amber-400 text-sm">₹{p.basePrice}</span>
                            {p.originalBasePrice && p.originalBasePrice > p.basePrice && (
                              <span className="text-[10px] text-slate-500 line-through">
                                ₹{p.originalBasePrice}
                              </span>
                            )}
                          </div>
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
                              onClick={() => {
                                setActiveTab('campaign');
                                handleOpenCampaignModal(p);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-950/50 text-slate-300 hover:text-amber-400 transition-colors"
                              title="Campaign Offers & Dynamic Pricing"
                            >
                              <Megaphone className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleEditProduct(p)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Edit item"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400"
                              title="Delete item"
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
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 w-44 sm:w-52"
                  />
                </div>

                {/* Time filter dropdown in Orders column */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <select
                    value={orderTimeFilter}
                    onChange={(e) => setOrderTimeFilter(e.target.value as TimeFilterOption)}
                    className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="today" className="bg-slate-900 text-white">Today Orders</option>
                    <option value="yesterday" className="bg-slate-900 text-white">Yesterday</option>
                    <option value="1week" className="bg-slate-900 text-white">1 Week</option>
                    <option value="last_month" className="bg-slate-900 text-white">Last Month</option>
                    <option value="year" className="bg-slate-900 text-white">Year</option>
                    <option value="all" className="bg-slate-900 text-white">All Orders</option>
                  </select>
                </div>

                {/* Status filter dropdown */}
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="placed">Pending (Placed)</option>
                  <option value="packed">Packed</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {/* Payment Method filter dropdown */}
                <select
                  value={orderPaymentFilter}
                  onChange={(e) => setOrderPaymentFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="razorpay">Online (Razorpay)</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
            </div>

            {/* Filter Summary Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl text-slate-300">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white">
                  {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} found
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400 font-mono font-bold">
                  Period Volume: ₹{filteredOrdersRevenue.toLocaleString('en-IN')}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase">
                  {TIME_FILTER_LABELS[orderTimeFilter]}
                </span>
                {orderStatusFilter !== 'all' && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                    {orderStatusFilter}
                  </span>
                )}
                {orderPaymentFilter !== 'all' && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase">
                    {orderPaymentFilter === 'razorpay' ? 'Razorpay' : orderPaymentFilter.toUpperCase()}
                  </span>
                )}
              </div>

              {(orderTimeFilter !== 'all' || orderStatusFilter !== 'all' || orderPaymentFilter !== 'all' || orderSearch) && (
                <button
                  onClick={() => {
                    setOrderTimeFilter('all');
                    setOrderStatusFilter('all');
                    setOrderPaymentFilter('all');
                    setOrderSearch('');
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold self-start sm:self-auto cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl shadow-xl space-y-3">
                <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-semibold text-white">No Orders Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No orders match "{TIME_FILTER_LABELS[orderTimeFilter]}" and your selected search or status filters.
                </p>
                <button
                  onClick={() => {
                    setOrderTimeFilter('all');
                    setOrderStatusFilter('all');
                    setOrderPaymentFilter('all');
                    setOrderSearch('');
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  View All Orders
                </button>
              </div>
            ) : (
              <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl shadow-xl overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Order # / Timestamp</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Payment Method</th>
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
                        {(o.paymentMethod === 'cod' || !o.paymentMethod) ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                            <Banknote className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="font-semibold text-[11px] whitespace-nowrap">Cash on Delivery</span>
                          </div>
                        ) : o.paymentMethod === 'upi' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-300">
                            <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span className="font-semibold text-[11px] whitespace-nowrap">UPI</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-300">
                            <CreditCard className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="font-semibold text-[11px] whitespace-nowrap">
                              {o.paymentMethod === 'razorpay' ? 'Razorpay (Online)' : String(o.paymentMethod || 'Online').toUpperCase()}
                            </span>
                          </div>
                        )}
                        {o.paymentId && (
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5 max-w-[130px] truncate" title={o.paymentId}>
                            Ref: {o.paymentId}
                          </div>
                        )}
                      </td>
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
            )}

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
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border shadow-sm ${
                            c.role === 'admin' ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}>
                            {c.role === 'admin' ? <ShieldCheck className="w-3 h-3 text-amber-400" /> : <UserIcon className="w-3 h-3 text-emerald-400" />}
                            <span>{c.role === 'admin' ? 'Admin' : 'Customer'}</span>
                          </span>
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

        {/* ---------------- TAB 5: CAMPAIGN (Offers & Dynamic Pricing) ---------------- */}
        {activeTab === 'campaign' && (
          <div className="space-y-6">
            {/* Header & Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl font-bold text-white">
                    Campaigns & Dynamic Price Discounts
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    LIVE PRICING
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Launch promotional offers and dynamic discounts. Prices automatically recalculate across Base Price and packaging weights from 250g to 1kg, directly updating the catalog and store.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleResetAllCampaigns}
                  disabled={bulkResetting || products.filter((p) => Boolean(p.campaignOffer)).length === 0}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Reset all active campaign prices back to standard regular prices"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${bulkResetting ? 'animate-spin' : ''}`} />
                  <span>Reset All Offers</span>
                </button>
              </div>
            </div>

            {/* Campaign Metrics & Bulk Launcher Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Stats Card 1: Active Offers Overview */}
              <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                    <span>Active Offers Status</span>
                    <Megaphone className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-display text-2xl font-bold text-white">
                      {products.filter((p) => Boolean(p.campaignOffer)).length}
                    </span>
                    <span className="text-xs text-slate-400">of {products.length} items on offer</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Regular items:</span>
                  <span className="font-semibold text-slate-200">
                    {products.filter((p) => !p.campaignOffer).length} items
                  </span>
                </div>
              </div>

              {/* Stats Card 2 & 3: Bulk Dynamic Discount Launcher */}
              <div className="lg:col-span-2 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Quick Bulk Campaign Discount
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Applies to Base Price & packaging 250g, 500g, 1kg
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] text-slate-400 mb-1">Campaign Offer Name</label>
                    <input
                      type="text"
                      value={bulkCampaignTitle}
                      onChange={(e) => setBulkCampaignTitle(e.target.value)}
                      placeholder="e.g. Festive Dhamaka - 20% OFF"
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Apply To Category</label>
                    <select
                      value={bulkTargetCategory}
                      onChange={(e) => setBulkTargetCategory(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="all">All Items ({products.length})</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({products.filter((p) => p.categoryId === c.id).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Discount %</label>
                    <div className="flex items-center gap-1.5">
                      {[10, 15, 20, 25].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setBulkDiscountPct(pct);
                            setBulkCampaignTitle(`Festive Offer - ${pct}% OFF`);
                          }}
                          className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                            bulkDiscountPct === pct
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                      <input
                        type="number"
                        min="1"
                        max="80"
                        value={bulkDiscountPct}
                        onChange={(e) => setBulkDiscountPct(Math.max(1, Math.min(80, parseInt(e.target.value) || 0)))}
                        className="w-12 px-1.5 py-1 text-center bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleApplyBulkCampaign}
                    disabled={bulkApplying}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {bulkApplying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Apply {bulkDiscountPct}% Dynamic Discount</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar for Items */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative min-w-[220px] max-w-xs flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search items by name, SKU..."
                    value={campaignSearch}
                    onChange={(e) => setCampaignSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={campaignCategoryFilter}
                  onChange={(e) => setCampaignCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setCampaignStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      campaignStatusFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({products.length})
                  </button>
                  <button
                    onClick={() => setCampaignStatusFilter('active')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      campaignStatusFilter === 'active'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Active Offers ({products.filter((p) => Boolean(p.campaignOffer)).length})
                  </button>
                  <button
                    onClick={() => setCampaignStatusFilter('none')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      campaignStatusFilter === 'none'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    No Offer ({products.filter((p) => !p.campaignOffer).length})
                  </button>
                </div>

                {(campaignSearch || campaignCategoryFilter !== 'all' || campaignStatusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCampaignSearch('');
                      setCampaignCategoryFilter('all');
                      setCampaignStatusFilter('all');
                    }}
                    className="px-2.5 py-1 text-xs text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* Campaign Items Table with Dynamic Pricing */}
            <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-2xl shadow-xl overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Item Name & Status</th>
                    <th className="py-3 px-4">Present Price (Live)</th>
                    <th className="py-3 px-4">Dynamic Discount</th>
                    <th className="py-3 px-4">Reflected New Prices (250g - 1kg & Base)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {products
                    .filter((p) => {
                      if (campaignSearch.trim()) {
                        const q = campaignSearch.toLowerCase().trim();
                        if (!p.name.toLowerCase().includes(q) && !p.sku?.toLowerCase().includes(q)) {
                          return false;
                        }
                      }
                      if (campaignCategoryFilter !== 'all' && p.categoryId !== campaignCategoryFilter) {
                        return false;
                      }
                      if (campaignStatusFilter === 'active' && !p.campaignOffer) {
                        return false;
                      }
                      if (campaignStatusFilter === 'none' && p.campaignOffer) {
                        return false;
                      }
                      return true;
                    })
                    .map((p) => {
                      const cat = categories.find((c) => c.id === p.categoryId);
                      const draft = getItemDraft(p);
                      const pct = draft.pct;

                      const rawVars = p.variants || [];
                      const v250 = rawVars.find((v) => v.weight === '250g');
                      const v500 = rawVars.find((v) => v.weight === '500g');
                      const v1kg = rawVars.find((v) => v.weight === '1kg');

                      const origBase = p.originalBasePrice || p.basePrice;
                      const orig250 = v250?.originalPrice || (v250 ? v250.price : Math.round(origBase * 0.55));
                      const orig500 = v500?.originalPrice || (v500 ? v500.price : origBase);
                      const orig1kg = v1kg?.originalPrice || (v1kg ? v1kg.price : Math.round(origBase * 1.9));

                      const calcBase = Math.max(1, Math.round(origBase * (1 - pct / 100)));
                      const calc250 = Math.max(1, Math.round(orig250 * (1 - pct / 100)));
                      const calc500 = Math.max(1, Math.round(orig500 * (1 - pct / 100)));
                      const calc1kg = Math.max(1, Math.round(orig1kg * (1 - pct / 100)));

                      const hasActiveOffer = Boolean(p.campaignOffer);

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Item Name & Details */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {p.images && p.images[0] ? (
                                <img
                                  src={p.images[0]}
                                  alt={p.name}
                                  className="w-11 h-11 rounded-xl object-contain bg-slate-800 border border-slate-700 p-0.5 shrink-0"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                                  {p.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-white text-xs">{p.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</span>
                                  <span className="text-[10px] text-slate-500">•</span>
                                  <span className="text-[10px] text-slate-400">{cat?.name || 'Uncategorized'}</span>
                                </div>
                                {hasActiveOffer ? (
                                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                    <span>{p.campaignOffer}</span>
                                  </span>
                                ) : (
                                  <span className="inline-block mt-1 text-[10px] text-slate-500 font-medium">
                                    Standard pricing
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Present Price */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                                <span>Base: ₹{p.basePrice}</span>
                                {p.originalBasePrice && p.originalBasePrice > p.basePrice && (
                                  <span className="text-[10px] text-slate-500 line-through font-normal">
                                    ₹{p.originalBasePrice}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 space-x-1.5">
                                <span>250g: ₹{v250?.price || Math.round(p.basePrice * 0.55)}</span>
                                <span>•</span>
                                <span>500g: ₹{v500?.price || p.basePrice}</span>
                                <span>•</span>
                                <span>1kg: ₹{v1kg?.price || Math.round(p.basePrice * 1.9)}</span>
                              </div>
                            </div>
                          </td>

                          {/* Dynamic Discount Controls */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5 max-w-[200px]">
                              <div className="flex items-center gap-1">
                                {[10, 15, 20, 25].map((discountOption) => (
                                  <button
                                    key={discountOption}
                                    type="button"
                                    onClick={() => setItemDraftPct(p.id, discountOption, `${discountOption}% OFF Offer`)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                      pct === discountOption
                                        ? 'bg-amber-500 text-slate-950'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                  >
                                    {discountOption}%
                                  </button>
                                ))}
                                <input
                                  type="number"
                                  min="1"
                                  max="80"
                                  value={pct}
                                  onChange={(e) => setItemDraftPct(p.id, Math.max(1, Math.min(80, parseInt(e.target.value) || 0)))}
                                  className="w-10 px-1 py-0.5 text-center bg-slate-950 border border-slate-700 rounded text-white font-mono text-[10px] focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <input
                                type="text"
                                value={draft.title}
                                onChange={(e) => setItemDraftTitle(p.id, e.target.value)}
                                placeholder="Offer label (e.g. 20% OFF)"
                                className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white text-[10px] focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </td>

                          {/* Dynamically Reflected New Prices (250g to 1kg and Base) */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-sans">Base Price:</span>
                                <span className="text-xs font-bold text-emerald-400">₹{calcBase}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800/80 text-[10px]">
                                <div>
                                  <span className="text-slate-500 block text-[9px] font-sans">250g</span>
                                  <span className="text-emerald-400 font-semibold">₹{calc250}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[9px] font-sans">500g</span>
                                  <span className="text-emerald-400 font-semibold">₹{calc500}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[9px] font-sans">1kg</span>
                                  <span className="text-emerald-400 font-semibold">₹{calc1kg}</span>
                                </div>
                              </div>
                              <div className="text-[9px] text-amber-400/90 font-sans pt-0.5">
                                Savings: ₹{origBase - calcBase} ({pct}% OFF)
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleQuickApplyItemCampaign(p)}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                                title="Apply this dynamic discount immediately"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Apply Offer</span>
                              </button>

                              <button
                                onClick={() => handleOpenCampaignModal(p)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                title="Fine-tune individual variant prices & preview"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>

                              {hasActiveOffer && (
                                <button
                                onClick={() => handleResetItemCampaign(p)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300"
                                title="Reset back to regular price"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400">Payment Method:</span>
                    {(viewingOrder.paymentMethod === 'cod' || !viewingOrder.paymentMethod) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        <Banknote className="w-3 h-3 text-emerald-400" />
                        Cash on Delivery (COD)
                      </span>
                    ) : viewingOrder.paymentMethod === 'upi' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        <Zap className="w-3 h-3 text-purple-400" />
                        UPI Payment
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        <CreditCard className="w-3 h-3 text-indigo-400" />
                        {viewingOrder.paymentMethod === 'razorpay' ? 'Razorpay (Online)' : String(viewingOrder.paymentMethod || 'Online').toUpperCase()}
                      </span>
                    )}
                  </div>
                  {viewingOrder.paymentId && (
                    <p className="text-[10px] text-slate-400 font-mono">
                      Payment Ref / ID: <span className="text-amber-300 font-bold">{viewingOrder.paymentId}</span>
                    </p>
                  )}
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

      {/* ---------------- CAMPAIGN OFFER & DYNAMIC PRICING MODAL ---------------- */}
      {campaignModalOpen && campaignProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setCampaignModalOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-2xl bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl p-6 z-10 space-y-5 max-h-[90vh] overflow-y-auto text-xs text-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    Dynamic Campaign Pricing: {campaignProduct.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Fine-tune dynamic discounts for Base Price and packaging from 250g to 1kg.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCampaignModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Customer Preview Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center gap-4">
              {campaignProduct.images && campaignProduct.images[0] ? (
                <img
                  src={campaignProduct.images[0]}
                  alt={campaignProduct.name}
                  className="w-16 h-16 rounded-xl object-contain bg-slate-900 border border-slate-700 p-1 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-base shrink-0">
                  {campaignProduct.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 space-y-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="font-bold text-white text-sm">{campaignProduct.name}</span>
                  <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold rounded text-[10px] shadow-sm">
                    {modalCampaignTitle || `${modalDiscountPct}% OFF`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Customer sees: Regular <span className="line-through">₹{modalOriginalBasePrice}</span> ➔ Special Offer <span className="text-emerald-400 font-bold font-mono text-xs">₹{modalBasePrice}</span> (Save ₹{modalOriginalBasePrice - modalBasePrice})
                </p>
              </div>
            </div>

            {/* Campaign Offer Title & Discount % Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Campaign Offer Badge Text *
                </label>
                <input
                  type="text"
                  required
                  value={modalCampaignTitle}
                  onChange={(e) => setModalCampaignTitle(e.target.value)}
                  placeholder="e.g. 20% OFF Diwali Offer"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Dynamic Discount Percentage ({modalDiscountPct}%)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[10, 15, 20, 25, 30, 40, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleModalDiscountPctChange(pct)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                        modalDiscountPct === pct
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Packaging Prices Breakdown (250g to 1kg and Base Price) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Dynamically Calculated Prices (Directly Editable)
                </span>
                <span className="text-[10px] text-amber-400">
                  Directly reflects in items & store
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Base Price */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                    <span>Base Price</span>
                    <span className="text-[9px] text-slate-500 font-mono">Reg: ₹{modalOriginalBasePrice}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Offer Price (₹)</label>
                    <input
                      type="number"
                      min="1"
                      value={modalBasePrice}
                      onChange={(e) => setModalBasePrice(Math.max(1, parseFloat(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Save: ₹{Math.max(0, modalOriginalBasePrice - modalBasePrice)}
                  </p>
                </div>

                {/* Variants 250g, 500g, 1kg */}
                {modalVariants.map((v, idx) => {
                  const origVPrice = v.originalPrice || v.price;
                  return (
                    <div key={v.weight} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                        <span>{v.weight} Pack</span>
                        <span className="text-[9px] text-slate-500 font-mono">Reg: ₹{origVPrice}</span>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Offer Price (₹)</label>
                        <input
                          type="number"
                          min="1"
                          value={v.price}
                          onChange={(e) => {
                            const val = Math.max(1, parseFloat(e.target.value) || 0);
                            const updated = [...modalVariants];
                            updated[idx] = { ...updated[idx], price: val };
                            setModalVariants(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Save: ₹{Math.max(0, origVPrice - v.price)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  if (campaignProduct) {
                    await handleResetItemCampaign(campaignProduct);
                    setCampaignModalOpen(false);
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Regular Price</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCampaignModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalCampaign}
                  disabled={modalSaving}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {modalSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Save Campaign Prices</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
