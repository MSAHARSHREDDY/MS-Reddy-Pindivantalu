import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { PromotionalBanner } from './components/PromotionalBanner';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { AuthModal } from './components/AuthModal';
import { BackgroundMusic } from './components/BackgroundMusic';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';

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
import { PolicyView } from './views/PolicyView';
import { POLICIES } from './constants/policies';

import { CheckCircle2, X, AlertCircle } from 'lucide-react';
import { Product, Category, Order, StoreSettings } from './types';
import { api } from './services/api';
import { useAuth } from './context/AuthContext';

export function AppContent() {
  const { user, isAdmin, openAuthModal } = useAuth();
  const { showToast, toast } = useToast();
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
  const [orderConfirmationModalOpen, setOrderConfirmationModalOpen] = useState(false);
  const [trackOrderId, setTrackOrderId] = useState<string | undefined>(undefined);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

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

    const parseUrlAndNavigate = (updateHistory = false) => {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      let view = 'home';
      let param = params.get('param') || undefined;

      if (pathname === '/' || pathname === '') {
        view = params.get('view') || 'home';
      } else if (pathname.startsWith('/policy-')) {
        view = pathname.slice(1);
      } else if (pathname === '/catalog') {
        view = 'catalog';
        param = params.get('category') || params.get('param') || undefined;
      } else if (pathname === '/checkout') {
        view = 'checkout';
      } else if (pathname === '/contact') {
        view = 'contact';
      } else if (pathname === '/heritage') {
        view = 'heritage';
      } else if (pathname === '/track') {
        view = 'track';
        param = params.get('orderId') || params.get('param') || undefined;
      } else if (pathname === '/profile') {
        view = 'profile';
      } else if (pathname === '/admin') {
        view = 'admin';
      } else if (pathname === '/product') {
        view = 'product-detail';
      } else if (pathname === '/order-confirmation') {
        view = 'order-confirmation';
      } else {
        view = pathname.slice(1) || params.get('view') || 'home';
      }

      navigateTo(view, param, updateHistory);
    };

    const handlePopState = () => {
      parseUrlAndNavigate(false);
    };

    window.addEventListener('popstate', handlePopState);

    // Initial check on load
    parseUrlAndNavigate(false);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (view: string, param?: string, updateHistory = true) => {
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

    if (updateHistory && typeof window !== 'undefined') {
      let url = '/';
      if (view === 'home') {
        url = '/';
      } else if (view.startsWith('policy-')) {
        url = `/${view}`;
      } else if (view === 'catalog') {
        url = param && param !== 'all' ? `/catalog?category=${param}` : '/catalog';
      } else if (view === 'track') {
        url = param ? `/track?orderId=${encodeURIComponent(param)}` : '/track';
      } else {
        url = `/${view}`;
      }
      window.history.pushState({ view, param }, '', url);
    }

    setCurrentView(view);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    navigateTo('product-detail');
  };

  const handleOrderSuccess = (order: Order) => {
    setConfirmedOrder(order);
    setOrderConfirmationModalOpen(true);
    showToast(`Your order #${order.orderNumber} has been placed successfully!`, 'success');
    // Navigate to order-confirmation view
    navigateTo('order-confirmation');
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
            orderId={trackOrderId}
            onGoToOrderHistory={() => navigateTo('profile')}
            onExploreSnacks={() => navigateTo('catalog')}
            onBack={() => navigateTo('profile')}
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

        {currentView.startsWith('policy-') && (() => {
          const policyId = currentView.replace('policy-', '');
          const policyObj = POLICIES.find((p) => p.id === policyId) || POLICIES[0];
          return (
            <PolicyView
              policy={policyObj}
              onNavigate={navigateTo}
              onExploreProducts={() => navigateTo('catalog')}
            />
          );
        })()}
      </main>

      {/* 4. Footer with Policies (Return & Refund, Delivery, Privacy, Terms) */}
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

      {/* Order Confirmation Modal Popup - Fully responsive on mobile */}
      <OrderConfirmationModal
        isOpen={orderConfirmationModalOpen}
        order={confirmedOrder}
        onClose={() => setOrderConfirmationModalOpen(false)}
        onTrackOrder={(orderId) => {
          setOrderConfirmationModalOpen(false);
          navigateTo('track', orderId);
        }}
        onContinueShopping={() => {
          setOrderConfirmationModalOpen(false);
          navigateTo('catalog');
        }}
      />

      {/* Background Music Player */}
      <BackgroundMusic />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
