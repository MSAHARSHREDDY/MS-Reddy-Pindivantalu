import React from 'react';
import { ShieldCheck, ArrowLeft, Phone, MapPin, Sparkles, Printer, RotateCcw, Truck, Lock, FileText } from 'lucide-react';
import { Policy } from '../constants/policies';

interface PolicyViewProps {
  policy: Policy;
  onNavigate: (view: string, param?: string) => void;
  onExploreProducts: () => void;
}

export const PolicyView: React.FC<PolicyViewProps> = ({
  policy,
  onNavigate,
  onExploreProducts,
}) => {
  const getPolicyIcon = (id: string) => {
    switch (id) {
      case 'policy-refund':
        return RotateCcw;
      case 'policy-delivery':
        return Truck;
      case 'policy-privacy':
        return Lock;
      case 'policy-terms':
      default:
        return FileText;
    }
  };

  const IconComponent = getPolicyIcon(policy.id);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb Navigation & Print Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-amber-800 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home & Store</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Official Policy Document • Last Updated: {policy.lastUpdated}</span>
            </span>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer shadow-sm"
              title="Print policy"
            >
              <Printer className="w-3.5 h-3.5 text-stone-500" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Header Card */}
        <div className="bg-gradient-to-br from-[#2D1204] via-[#451A03] to-[#1A0C03] text-amber-100 rounded-3xl p-6 sm:p-10 shadow-xl border border-amber-900/40 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center">
                <IconComponent className="w-6 h-6 text-amber-300" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[#FEF3C7] tracking-tight">
                {policy.title}
              </h1>
              <p className="text-xs sm:text-sm text-amber-200/80 max-w-xl leading-relaxed">
                {policy.subtitle} — Sahadeep Reddy's PindiVantalu artisanal kitchen standards.
              </p>
            </div>
            <div className="shrink-0">
              <button
                onClick={onExploreProducts}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-lg cursor-pointer"
              >
                Browse Snacks Store
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Card Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-stone-200/80 space-y-8">
          <div className="border-b border-stone-100 pb-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Store Commitment & Compliance</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
              {policy.subtitle}
            </p>
          </div>

          <div className="space-y-6">
            {policy.sections.map((sec, idx: number) => (
              <div
                key={idx}
                className="bg-stone-50/80 rounded-2xl p-5 sm:p-6 border border-stone-200/70 hover:border-amber-300 transition-all shadow-2xs"
              >
                <h2 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-2 uppercase tracking-wider mb-3">
                  <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                  <span>{sec.title}</span>
                </h2>
                <div className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line font-sans pl-4 border-l-2 border-amber-500/30 space-y-3">
                  <p>{sec.content}</p>
                  {sec.list && sec.list.length > 0 && (
                    <ul className="list-disc list-inside space-y-1.5 pt-2 text-stone-700">
                      {sec.list.map((item, itemIdx: number) => (
                        <li key={itemIdx} className="text-xs sm:text-sm">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Customer Support Footer Box */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="font-display text-sm sm:text-base font-bold text-amber-900">
                Have questions regarding our {policy.title.toLowerCase()}?
              </h3>
              <p className="text-xs text-stone-600">
                Our customer support team is available Monday through Saturday to assist you directly by phone.
              </p>
              <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-amber-900 font-medium pt-1">
                <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Miyapur, HMT Swarnapuri Colony, Hyderabad - 502032</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <a
                href="tel:+919182693953"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-800 text-white text-xs font-semibold hover:bg-amber-900 transition-colors shadow-md font-mono"
              >
                <Phone className="w-4 h-4 text-amber-200" />
                <span>+919182693953</span>
              </a>
              <a
                href="tel:+919849397359"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs font-mono"
              >
                <Phone className="w-4 h-4 text-amber-700" />
                <span>9849397359</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
