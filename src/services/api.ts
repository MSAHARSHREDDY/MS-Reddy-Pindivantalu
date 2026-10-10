import {
  User,
  Product,
  Category,
  CartData,
  Order,
  Coupon,
  StoreSettings,
  DashboardStats,
  Address,
} from '../types';

const API_BASE = '/api';

// Generate or retrieve persistent guest ID
function getGuestId(): string {
  let guestId = localStorage.getItem('pindi_guest_id');
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('pindi_guest_id', guestId);
  }
  return guestId;
}

// Get stored auth token
function getAuthToken(): string | null {
  return localStorage.getItem('pindi_auth_token');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; message?: string; [key: string]: any }> {
  const token = getAuthToken();
  const guestId = getGuestId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-guest-id': guestId,
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: 'An unexpected response was received from the server.',
  }));

  if (!response.ok) {
    const errorMsg = data.message || data.error || (data.details?.description) || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  register: (payload: { name: string; email: string; phone?: string; password: string }) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: { email: string; password: string }) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  logout: () => apiRequest('/auth/logout', { method: 'POST' }),

  getMe: () => apiRequest<{ user: User }>('/auth/me'),

  updateProfile: (payload: { name: string; phone?: string }) =>
    apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),

  addAddress: (payload: Omit<Address, 'id'>) =>
    apiRequest('/auth/address', { method: 'POST', body: JSON.stringify(payload) }),

  deleteAddress: (id: string) =>
    apiRequest(`/auth/address/${id}`, { method: 'DELETE' }),

  forgotPassword: (email: string) =>
    apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (payload: { email: string; code: string; newPassword: string }) =>
    apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),

  // Products
  getProducts: (params?: {
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    limit?: number;
    featured?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.minPrice !== undefined) query.append('minPrice', params.minPrice.toString());
    if (params?.maxPrice !== undefined) query.append('maxPrice', params.maxPrice.toString());
    if (params?.sort) query.append('sort', params.sort);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.featured) query.append('featured', 'true');
    return apiRequest<{ products: Product[]; totalCount: number; totalPages: number }>(
      `/products?${query.toString()}`
    );
  },

  getProductBySlug: (slug: string) =>
    apiRequest<{ product: Product; category?: Category; relatedProducts: Product[] }>(`/products/${slug}`),

  // Categories
  getCategories: () => apiRequest<{ categories: Category[] }>('/categories'),

  // Cart
  getCart: () => apiRequest<{ cart: CartData }>('/cart'),

  addToCart: (payload: { productId: string; variantId?: string; quantity?: number }) =>
    apiRequest<{ cart: CartData }>('/cart/items', { method: 'POST', body: JSON.stringify(payload) }),

  updateCartItem: (itemId: string, quantity: number) =>
    apiRequest<{ cart: CartData }>(`/cart/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),

  removeCartItem: (itemId: string) =>
    apiRequest<{ cart: CartData }>(`/cart/items/${itemId}`, { method: 'DELETE' }),

  clearCart: () => apiRequest<{ cart: CartData }>('/cart/clear', { method: 'POST' }),

  // Orders & Checkout
  checkout: (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: Address;
    paymentMethod: 'cod' | 'razorpay' | 'upi';
    paymentId?: string;
    couponCode?: string;
    notes?: string;
    items?: Array<{ productId: string; variantId?: string; quantity: number }>;
  }) => apiRequest<{ order: Order }>('/orders/checkout', { method: 'POST', body: JSON.stringify(payload) }),

  getOrders: () => apiRequest<{ orders: Order[] }>('/orders'),

  getOrderById: (id: string) => apiRequest<{ order: Order }>(`/orders/${id}`),

  cancelOrder: (id: string) => apiRequest<{ order: Order }>(`/orders/${id}/cancel`, { method: 'PATCH' }),

  // Razorpay Payments
  createRazorpayOrder: (payload: { amount: number; currency?: string; receipt?: string; notes?: any }) =>
    apiRequest<{ success: boolean; order_id: string; amount: number; currency: string; receipt?: string; error?: string }>('/create-order', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createRazorpayPaymentLink: (payload: {
    amount: number;
    currency?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    description?: string;
    notes?: any;
    callbackUrl?: string;
  }) =>
    apiRequest<{
      success: boolean;
      payment_link_id: string;
      short_url: string;
      amount: number;
      status: string;
      error?: string;
    }>('/create-payment-link', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  checkPaymentLinkStatus: (linkId: string) =>
    apiRequest<{
      success: boolean;
      id: string;
      status: string;
      isPaid: boolean;
      amount: number;
      amount_paid: number;
      payment_id: string | null;
    }>(`/payment-link-status/${linkId}`),

  verifyRazorpayPayment: (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    systemOrderId?: string;
  }) =>
    apiRequest<{ success: boolean; message: string; verified: boolean; order_id: string; payment_id: string }>(
      '/verify-payment',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getRazorpayConfig: () =>
    apiRequest<{ key_id: string; currency: string; registered_website?: string }>('/payment/config'),

  // Coupons
  applyCoupon: (code: string, subtotal: number) =>
    apiRequest<{ code: string; discount: number; message: string }>('/coupons/apply', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    }),

  // Settings
  getPublicSettings: () => apiRequest<{ settings: StoreSettings }>('/admin/settings/public'),

  // Admin APIs
  getDashboardStats: () => apiRequest<{ stats: DashboardStats }>('/admin/dashboard'),

  getAdminProducts: (params?: { search?: string; category?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    return apiRequest<{ products: Product[] }>(`/products/admin/list?${query.toString()}`);
  },

  createProduct: (payload: Partial<Product>) =>
    apiRequest<{ product: Product }>('/products/admin/create', { method: 'POST', body: JSON.stringify(payload) }),

  updateProduct: (id: string, payload: Partial<Product>) =>
    apiRequest<{ product: Product }>(`/products/admin/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  deleteProduct: (id: string) =>
    apiRequest(`/products/admin/${id}`, { method: 'DELETE' }),

  getAdminCategories: () => apiRequest<{ categories: Category[] }>('/categories/admin/list'),

  createCategory: (payload: Partial<Category>) =>
    apiRequest<{ category: Category }>('/categories/admin/create', { method: 'POST', body: JSON.stringify(payload) }),

  updateCategory: (id: string, payload: Partial<Category>) =>
    apiRequest<{ category: Category }>(`/categories/admin/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  deleteCategory: (id: string, reassignToCategoryId?: string) =>
    apiRequest(`/categories/admin/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reassignToCategoryId }),
    }),

  getAdminOrders: (params?: { status?: string; paymentStatus?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params?.search) query.append('search', params.search);
    return apiRequest<{ orders: Order[] }>(`/orders/admin/list?${query.toString()}`);
  },

  updateOrderStatus: (id: string, status: string, note?: string) =>
    apiRequest<{ order: Order }>(`/orders/admin/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),

  updatePaymentStatus: (id: string, paymentStatus: string) =>
    apiRequest<{ order: Order }>(`/orders/admin/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus }),
    }),

  deleteAdminOrder: (id: string) =>
    apiRequest<{ message: string }>(`/orders/admin/${id}`, {
      method: 'DELETE',
    }),

  getAdminCustomers: (search?: string, role?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role && role !== 'all') params.append('role', role);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ customers: any[] }>(`/admin/customers${qs}`);
  },

  updateCustomerStatus: (id: string, status: 'active' | 'suspended') =>
    apiRequest(`/admin/customers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updateUserRole: (id: string, role: 'admin' | 'customer') =>
    apiRequest<{ success: boolean; message: string; user: any }>(`/admin/customers/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  deleteUser: (id: string) =>
    apiRequest<{ success: boolean; message: string }>(`/admin/customers/${id}`, {
      method: 'DELETE',
    }),

  updateAdminCustomerPassword: (id: string, newPassword: string) =>
    apiRequest<{ success: boolean; message: string }>(`/admin/customers/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    }),

  getAdminInventory: () => apiRequest<{ inventory: any[] }>('/admin/inventory'),

  adjustInventory: (payload: { productId: string; variantId?: string; newStock?: number; adjustment?: number; reason?: string }) =>
    apiRequest('/admin/inventory/adjust', { method: 'POST', body: JSON.stringify(payload) }),

  getAdminCoupons: () => apiRequest<{ coupons: Coupon[] }>('/coupons/admin/list'),

  createCoupon: (payload: Partial<Coupon>) =>
    apiRequest<{ coupon: Coupon }>('/coupons/admin/create', { method: 'POST', body: JSON.stringify(payload) }),

  updateCoupon: (id: string, payload: Partial<Coupon>) =>
    apiRequest<{ coupon: Coupon }>(`/coupons/admin/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  deleteCoupon: (id: string) =>
    apiRequest(`/coupons/admin/${id}`, { method: 'DELETE' }),

  updateSettings: (payload: Partial<StoreSettings>) =>
    apiRequest<{ settings: StoreSettings }>('/admin/settings', { method: 'PATCH', body: JSON.stringify(payload) }),

  getMediaGallery: () => apiRequest<{ gallery: { name: string; url: string; category: string }[] }>('/media/gallery'),

  uploadMedia: (payload: { base64Data?: string; directUrl?: string; fileName?: string }) =>
    apiRequest<{ url: string }>('/media/upload', { method: 'POST', body: JSON.stringify(payload) }),
};
