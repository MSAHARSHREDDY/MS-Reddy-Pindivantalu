import React from 'react';
import { StoreSettings } from '../types';
import { ShieldCheck, Truck, RotateCcw, Lock, FileText, Phone, Mail, MapPin, Sparkles } from 'lucide-react';

interface FooterProps {
  settings?: StoreSettings | null;
  onNavigate?: (view: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate }) => {
  return (
    <footer className="bg-[#1a0c03] text-amber-100/90 border-t border-[#3d1904] relative">
      {/* Top ambient warm light bar */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* 1. Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold text-[#FEF3C7] tracking-tight">
                Sahadeep Reddy's
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                EST. 2026
              </span>
            </div>
            <p className="text-xs text-amber-200/75 leading-relaxed">
              Authentic handcrafted Telugu Pindi Vantalu, crispy Murukulu, savory Andhra Mixtures, and traditional sweets made with pure cold-pressed oils, stone-ground flours, and heirloom family recipes.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-amber-300/80">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>100% Homemade · Zero Preservatives · Daily Fresh Batches</span>
            </div>
          </div>

          {/* 2. Quick Navigation Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FEF3C7]">
              Quick Links
            </h3>
            <ul className="space-y-2 text-xs text-amber-200/80">
              <li>
                <button
                  onClick={() => onNavigate?.('catalog')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Browse Snacks Catalog
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('heritage')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Our Telugu Culinary Heritage
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('track')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Track Order Timeline
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('catalog')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Festive & Gift Packs
                </button>
              </li>
            </ul>
          </div>

          {/* 3. POLICIES COLUMN (Requested - separate pages with separate URLs) */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#FEF3C7]">
                Policies
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-amber-200/80">
              <li>
                <button
                  onClick={() => onNavigate?.('policy-refund')}
                  className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer text-left group"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400/80 group-hover:text-amber-300 transition-colors shrink-0" />
                  <span className="group-hover:underline">Return & Refund Policy</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('policy-delivery')}
                  className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer text-left group"
                >
                  <Truck className="w-3.5 h-3.5 text-amber-400/80 group-hover:text-amber-300 transition-colors shrink-0" />
                  <span className="group-hover:underline">Delivery Policy</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('policy-privacy')}
                  className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer text-left group"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400/80 group-hover:text-amber-300 transition-colors shrink-0" />
                  <span className="group-hover:underline">Privacy Policy</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('policy-terms')}
                  className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer text-left group"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400/80 group-hover:text-amber-300 transition-colors shrink-0" />
                  <span className="group-hover:underline">Terms and Conditions</span>
                </button>
              </li>
            </ul>
          </div>

          {/* 4. Customer Support & Kitchen Contact */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FEF3C7]">
              Customer Support
            </h3>
            <ul className="space-y-2 text-xs text-amber-200/80">
              <li className="flex items-start gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <a href="tel:+919182693953" className="hover:underline hover:text-white font-mono font-bold">
                      +919182693953
                    </a>
                    <span>,</span>
                    <a href="tel:+919849397359" className="hover:underline hover:text-white font-mono font-bold">
                      9849397359
                    </a>
                  </div>
                  <span className="text-[11px] text-amber-300/70 block mt-0.5">(9 AM – 8 PM IST)</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span>Miyapur, HMT Swarnapuri Colony, Hyderabad - 502032</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with separate policy page links */}
        <div className="mt-12 pt-6 border-t border-amber-900/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-amber-300/70">
          <p>
            © {new Date().getFullYear()} Sahadeep Reddy's PindiVantalu. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-[11px] flex-wrap justify-center">
            <button
              onClick={() => onNavigate?.('policy-refund')}
              className="hover:text-white hover:underline cursor-pointer"
            >
              Return & Refund
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate?.('policy-delivery')}
              className="hover:text-white hover:underline cursor-pointer"
            >
              Delivery
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate?.('policy-privacy')}
              className="hover:text-white hover:underline cursor-pointer"
            >
              Privacy
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate?.('policy-terms')}
              className="hover:text-white hover:underline cursor-pointer"
            >
              Terms & Conditions
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
