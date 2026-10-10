import React, { useState } from 'react';
import { ShoppingBag, Search, User, Shield, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenSearch }) => {
  const { user, isAdmin, openAuthModal } = useAuth();
  const { itemCount, openDrawer } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view: string, param?: string) => {
    onNavigate(view, param);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-stone-700 hover:text-amber-900 p-1.5 focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              handleNav('home');
            }}
            className="flex items-center gap-2 group"
            title="Sahadeep Reddy's Home"
          >
            <img
              src="/src/assets/images/logo.png"
              alt="Sahadeep Reddy's Logo"
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-amber-800/60 shadow-sm group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
            
          </a>
        </div>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-700">
          <button
            onClick={() => handleNav('catalog')}
            className={`transition-colors hover:text-[#78350F] ${
              currentView === 'catalog' ? 'text-[#78350F] font-semibold' : ''
            }`}
          >
            Products
          </button>
          <button
            onClick={() => handleNav('contact')}
            className={`transition-colors hover:text-[#78350F] ${
              currentView === 'contact' ? 'text-[#78350F] font-semibold' : ''
            }`}
          >
            Contact
          </button>
        </nav>

        {/* Zone 3: Primary functional actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onOpenSearch}
            className="text-stone-600 hover:text-[#451A03] p-2 rounded-lg hover:bg-stone-200/50 transition-colors"
            title="Search traditional snacks"
            aria-label="Search snacks"
          >
            <Search className="w-5 h-5" />
          </button>

          {isAdmin && (
            <button
              onClick={() => handleNav('admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#451A03] text-amber-100 hover:bg-[#361502] text-xs font-semibold shadow-xs transition-colors border border-amber-900/40"
              title="Admin Panel"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Admin Panel</span>
              <span className="sm:hidden">Admin</span>
            </button>
          )}

          {user ? (
            <button
              onClick={() => handleNav('profile')}
              className="flex items-center gap-2 text-stone-700 hover:text-[#451A03] p-1.5 rounded-lg hover:bg-stone-200/50 transition-colors"
              title={`Account (${user.name})`}
            >
              <User className="w-5 h-5" />
              <span className="hidden lg:inline text-xs font-medium max-w-[100px] truncate">
                {user.name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="text-stone-700 hover:text-[#451A03] p-2 rounded-lg hover:bg-stone-200/50 transition-colors text-xs font-medium flex items-center gap-1"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          <button
            onClick={openDrawer}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-[#451A03] text-[#FEF3C7] hover:bg-[#361502] transition-colors shadow-sm"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold">Cart</span>
            {itemCount > 0 && (
              <span className="bg-[#D97706] text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center leading-tight">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-[#FAF7F2] px-4 pt-3 pb-5 space-y-2">
          <button
            onClick={() => handleNav('catalog')}
            className={`block w-full text-left py-2.5 px-3 text-sm font-medium rounded-lg transition-colors ${
              currentView === 'catalog'
                ? 'bg-amber-100 text-amber-950 font-semibold'
                : 'text-stone-800 hover:bg-amber-50'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => handleNav('contact')}
            className={`block w-full text-left py-2.5 px-3 text-sm font-medium rounded-lg transition-colors ${
              currentView === 'contact'
                ? 'bg-amber-100 text-amber-950 font-semibold'
                : 'text-stone-800 hover:bg-amber-50'
            }`}
          >
            Contact
          </button>
          {isAdmin && (
            <button
              onClick={() => handleNav('admin')}
              className="flex items-center gap-2 w-full text-left py-2.5 px-3 text-sm font-bold text-amber-950 bg-amber-100/80 rounded-lg hover:bg-amber-200 transition-colors"
            >
              <Shield className="w-4 h-4 text-amber-800" />
              <span>Admin Panel</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
