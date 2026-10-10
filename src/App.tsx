import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { PromotionalBanner } from './components/PromotionalBanner';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { AuthModal } from './components/AuthModal';
import { BackgroundMusic } from './components/BackgroundMusic';

import { HomeView } from './views/HomeView';
import { CatalogView } from './views/CatalogView';
import { ProductDetailView } from './views/ProductDetailView';
import { CheckoutView } from './views/CheckoutView';
import { OrderConfirmationView } from './views/OrderConfirmationView';
import { OrderTrackView } from './views/OrderTrackView';
import { ProfileView } from './views/ProfileView';
import { HeritageView } from './views/HeritageView';
import { ContactView } from './views/ContactView';
import { AdminDashboard } from './views/admin/AdminDashboard';

import { CheckCircle2, X } from 'lucide-react';
import { Product, Category, Order, StoreSettings } from './types';
import { api } from './services/api';
import { useAuth } from './context/AuthContext';

export function AppContent() {
  const { user, isAdmin, openAuthModal } = useAuth();
  const [currentView, setCurrentView] = useState<string>('home');
  const prevUserRef = useRef(user);

  useEffect(() => {
    // Redirection logic: if user role in MongoDB database is admin, redirect to admin panel!
    if (user && user.role?.toLowerCase() === 'admin') {
      if (!prevUserRef.current || prevUserRef.current.role?.toLowerCase() !== 'admin') {
        setCurrentView('admin');
      }
    } else if (prevUserRef.current && !user) {
      // Logout: Redirect to home
      setCurrentView('home');
    }
    prevUserRef.current = user;
  }, [user]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | undefined>(undefined);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [trackOrderId, setTrackOrderId] = useState<string | undefined>(undefined);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadStoreData = async () => {
    try {
      const [prodRes, catRes, settRes] = await Promise.all([
        api.getProducts({ limit: 100 }),
        api.getCategories(),
        api.getPublicSettings(),
      ]);

      if (prodRes.success && prodRes.products) {
        setProducts(prodRes.products);
      }
      if (catRes.success && catRes.categories) {
        setCategories(catRes.categories);
      }
      if (settRes.success && settRes.settings) {
        setSettings(settRes.settings);
      }
    } catch (err) {
      console.error('Failed to load store data:', err);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, []);

  const navigateTo = (view: string, param?: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const hasAuthToken = typeof window !== 'undefined' && !!localStorage.getItem('pindi_auth_token');
    if (view === 'checkout' && !user && !hasAuthToken) {
      openAuthModal(
        'register',
        () => {
          setCurrentView('checkout');
        },
        'Please create an account or sign in to proceed to checkout'
      );
      return;
    }
    if (view === 'catalog') {
      setSelectedCategorySlug(param || 'all');
      loadStoreData();
    }
    if (view === 'home') {
      loadStoreData();
    }
    if (view === 'track') {
      setTrackOrderId(param || undefined);
    }
    setCurrentView(view);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    navigateTo('product-detail');
  };

  const handleOrderSuccess = (order: Order) => {
    setConfirmedOrder(order);
    showToast(`Your order #${order.orderNumber} has been placed successfully!`, 'success');
    // Navigate directly to Order History
    navigateTo('profile');
  };

  // If in admin view, render separate Admin control center
  if (currentView === 'admin') {
    return (
      <AdminDashboard
        onBackToStore={() => {
          loadStoreData();
          navigateTo('catalog');
        }}
        onRefreshCatalog={loadStoreData}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-stone-900 selection:bg-amber-100 selection:text-amber-900 relative">
      {/* Ambient Lighting Scroll Progress Bar with Ting Effect */}
      <div className="ambient-scroll-track" aria-hidden="true">
        <div
          className="ambient-scroll-bar"
          style={{ width: `${Math.min(100, Math.max(0, scrollProgress))}%` }}
        >
          {scrollProgress > 0.5 && <div className="ambient-scroll-ting" />}
        </div>
      </div>

      {/* 1. Admin Controlled Promotional Notice Bar */}
      <PromotionalBanner settings={settings} />

      {/* 2. Top Bar Navigation (Zone 1: Wordmark, Zone 2: Links, Zone 3: Actions) */}
      <Navbar
        currentView={currentView}
        onNavigate={navigateTo}
        onOpenSearch={() => setSearchModalOpen(true)}
      />

      {/* 3. Main Dynamic Content */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomeView
            products={products}
            categories={categories}
            onSelectProduct={handleSelectProduct}
            onSelectCategory={(slug) => navigateTo('catalog', slug)}
            onExploreAll={() => navigateTo('catalog', 'all')}
          />
        )}

        {currentView === 'catalog' && (
          <CatalogView
            categories={categories}
            onSelectProduct={handleSelectProduct}
            onBack={() => navigateTo('home')}
          />
        )}

        {currentView === 'contact' && (
          <ContactView
            settings={settings}
            onExploreProducts={() => navigateTo('catalog')}
          />
        )}

        {currentView === 'product-detail' && selectedProduct && (
          <ProductDetailView
            product={selectedProduct}
            onBack={() => navigateTo('catalog')}
            onSelectProduct={handleSelectProduct}
            onCheckoutDirect={() => navigateTo('checkout')}
          />
        )}

        {currentView === 'checkout' && (
          <CheckoutView
            onBack={() => navigateTo('catalog')}
            onOrderSuccess={handleOrderSuccess}
          />
        )}

        {currentView === 'order-confirmation' && confirmedOrder && (
          <OrderConfirmationView
            order={confirmedOrder}
            onTrackOrder={(orderId) => navigateTo('track', orderId)}
            onContinueShopping={() => navigateTo('catalog')}
          />
        )}

        {currentView === 'track' && (
          <OrderTrackView
            initialOrderId={trackOrderId}
            onExploreSnacks={() => navigateTo('catalog')}
            onBack={() => navigateTo('home')}
          />
        )}

        {currentView === 'profile' && (
          <ProfileView
            initialTab="orders"
            recentOrder={confirmedOrder}
            onTrackOrder={(orderId) => navigateTo('track', orderId)}
            onExploreSnacks={() => navigateTo('catalog')}
            onOpenAdmin={() => navigateTo('admin')}
          />
        )}

        {currentView === 'heritage' && (
          <HeritageView onShopNow={() => navigateTo('catalog')} />
        )}
      </main>

      {/* Global Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-900 border-emerald-800 text-emerald-100' : 'bg-rose-900 border-rose-800 text-rose-100'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <span className="text-sm font-semibold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Footer */}
      <Footer settings={settings} onNavigate={navigateTo} />

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        onCheckout={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setCurrentView('checkout');
        }}
        onExplore={() => navigateTo('catalog')}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectProduct={handleSelectProduct}
        onViewCatalogWithSearch={(term) => {
          setSelectedCategorySlug('all');
          navigateTo('catalog');
        }}
      />

      {/* Auth Modal (Login / Register / Forgot Password) */}
      <AuthModal />

      {/* Background Music Player */}
      <BackgroundMusic />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
