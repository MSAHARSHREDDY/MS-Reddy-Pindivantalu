import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartData } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: CartData;
  loading: boolean;
  itemCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addToCart: (productId: string, variantId?: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  appliedCoupon: string | null;
  couponDiscount: number;
  applyCouponCode: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCouponCode: () => void;
}

const emptyCart: CartData = {
  items: [],
  subtotal: 0,
  deliveryFee: 0,
  freeDeliveryThreshold: 0,
  amountNeededForFreeDelivery: 0,
  total: 0,
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartData>(emptyCart);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);

  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getCart();
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } catch (err) {
      console.error('Failed to load cart:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [user, refreshCart]);

  const addToCart = async (productId: string, variantId?: string, quantity: number = 1) => {
    try {
      const res = await api.addToCart({ productId, variantId, quantity });
      if (res.success && res.cart) {
        setCart(res.cart);
        setIsDrawerOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Could not add item to cart');
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await api.updateCartItem(itemId, quantity);
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } catch (err: any) {
      alert(err.message || 'Could not update item quantity');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const res = await api.removeCartItem(itemId);
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } catch (err: any) {
      alert(err.message || 'Could not remove item');
    }
  };

  const clearCart = async () => {
    try {
      const res = await api.clearCart();
      if (res.success && res.cart) {
        setCart(res.cart);
        setAppliedCoupon(null);
        setCouponDiscount(0);
      }
    } catch (err: any) {
      alert(err.message || 'Could not clear cart');
    }
  };

  const applyCouponCode = async (code: string) => {
    try {
      const res = await api.applyCoupon(code, cart.subtotal);
      if (res.success) {
        setAppliedCoupon(res.code);
        setCouponDiscount(res.discount);
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || 'Failed to apply coupon' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Invalid coupon code' };
    }
  };

  const removeCouponCode = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
  };

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        itemCount,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
        appliedCoupon,
        couponDiscount,
        applyCouponCode,
        removeCouponCode,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
