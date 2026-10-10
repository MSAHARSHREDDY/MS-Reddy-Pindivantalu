export type UserRole = 'customer' | 'admin';

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  addresses: Address[];
  accountStatus: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  weight: string;
  price: number;
  salePrice?: number;
  stockQuantity: number;
  sku: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  images: string[];
  basePrice: number;
  salePrice?: number;
  weight: string;
  sku: string;
  variants: ProductVariant[];
  stockQuantity: number;
  lowStockThreshold: number;
  ingredients: string[];
  allergens?: string[];
  shelfLife?: string;
  storageInstructions?: string;
  spiceLevel?: 'Mild' | 'Medium' | 'Spicy';
  isVeg?: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  displayOrder: number;
  campaignOffer?: string;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parentCategoryId?: string | null;
  isActive: boolean;
  displayOrder: number;
  productCount?: number;
  totalProducts?: number;
  activeProducts?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartHydratedItem {
  id: string;
  productId: string;
  productName: string;
  slug: string;
  image: string;
  variantId?: string;
  variantName?: string;
  weight?: string;
  unitPrice: number;
  regularPrice: number;
  quantity: number;
  availableStock: number;
  isOutOfStock: boolean;
  subtotal: number;
}

export interface CartData {
  items: CartHydratedItem[];
  subtotal: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  amountNeededForFreeDelivery: number;
  total: number;
}

export type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'packed' | 'dispatched' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'cod' | 'razorpay' | 'upi';

export interface OrderItemSnapshot {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  image: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItemSnapshot[];
  shippingAddress: Address;
  subtotal: number;
  discount: number;
  couponCode?: string;
  deliveryFee: number;
  tax: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  orderStatus: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderValue: number;
  maximumDiscount?: number;
  validUntil: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  supportPhone: string;
  whatsappNumber: string;
  supportEmail: string;
  storeAddress: string;
  freeDeliveryThreshold: number;
  standardDeliveryFee: number;
  codEnabled: boolean;
  onlinePaymentEnabled: boolean;
  bannerNotice: {
    enabled: boolean;
    text: string;
    linkUrl?: string;
  };
  seoDefaults: {
    title: string;
    description: string;
  };
  campaignOffers: CampaignOffer[];
  updatedAt: string;
}

export interface CampaignOffer {
  id: string;
  title: string;
  description: string;
  bannerUrl?: string;
  targetUrl?: string;
  isActive: boolean;
  displayOrder: number;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalCustomers: number;
  activeProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockProducts: { id: string; name: string; stock: number; threshold: number }[];
  outOfStockProducts: { id: string; name: string }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    itemCount: number;
    createdAt: string;
  }[];
  topProducts: {
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  salesTrend: {
    date: string;
    revenue: number;
    orders: number;
  }[];
}
