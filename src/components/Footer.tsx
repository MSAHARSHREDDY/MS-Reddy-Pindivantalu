import React from 'react';
import { StoreSettings } from '../types';

interface FooterProps {
  settings?: StoreSettings | null;
  onNavigate?: (view: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-[#1f1005] text-amber-100/90 py-8 border-t border-[#3d1904] relative">
      {/* Top ambient warm light bar */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <span className="font-display text-lg font-bold text-[#FEF3C7] tracking-tight">
            Sahadeep Reddy's
          </span>
          <span className="text-amber-500/40 hidden sm:inline">|</span>
          <p className="text-amber-200/70">
            © {new Date().getFullYear()} Sahadeep Reddy's. All rights reserved.
          </p>
        </div>

        <div className="text-amber-300/80 text-[11px] font-medium">
          Fresh Homemade Authentic Telugu Snacks & Sweets
        </div>
      </div>
    </footer>
  );
};
