import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { StoreSettings } from '../types';

interface PromotionalBannerProps {
  settings?: StoreSettings | null;
}

export const PromotionalBanner: React.FC<PromotionalBannerProps> = ({ settings }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !settings?.bannerNotice?.enabled) {
    return null;
  }

  return (
    <div className="bg-[#78350F] text-[#FEF3C7] text-xs font-medium py-2 px-4 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex-1 flex items-center justify-center gap-2 text-center truncate">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="truncate">{settings.bannerNotice.text}</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="ml-3 text-amber-200/80 hover:text-white p-0.5 rounded transition-colors shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
