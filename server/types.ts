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
  passwordHash: string;
  role: UserRole;
  addresses: Address[];
  accountStatus: 'active' | 'suspended';
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  weight: string; // e.g. "250g", "500g", "1kg"
  price: number; // Regular price
  salePrice?: number; // Discounted price
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
  weight: string; // e.g., "500g"
  sku: string;
  variants: ProductVariant[];
  stockQuantity: number;
  lowStockThreshold: number;
  ingredients: string[];
  allergens?: string[];
  shelfLife?: string; // e.g., "60 Days"
  storageInstructions?: string; // e.g., "Store in an airtight container in a cool, dry place"
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
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  addedAt: string;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  updatedAt: string;
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
