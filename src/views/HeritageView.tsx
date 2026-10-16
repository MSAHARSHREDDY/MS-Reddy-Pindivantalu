import React from 'react';
import { Award, Leaf, ShieldCheck, Heart, Sparkles, ArrowRight } from 'lucide-react';

interface HeritageViewProps {
  onShopNow: () => void;
}

export const HeritageView: React.FC<HeritageViewProps> = ({ onShopNow }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Editorial Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
          Rooted in Heirloom Telugu Kitchens
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-stone-900 leading-tight">
          The Sacred Art of Pindi Vantalu
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          In Telugu culture, "Pindi Vantalu" literally translates to savory and sweet delicacies sculpted from artisanal flours. For generations, festive kitchens across Andhra Pradesh and Telangana gathered grandmothers, aunts, and mothers to hand-roll, press, and slow-fry these timeless snacks.
        </p>
      </div>

      {/* Hero Visual */}
      <div className="aspect-16/9 rounded-2xl overflow-hidden shadow-lg border border-stone-200">
        <img
          src="/src/assets/images/hero_pindivantalu_traditional_1790935769601.jpg"
          alt="Traditional Telugu snacks platter"
          className="w-full h-full object-cover"
        />
      </div>

      {/* 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900">
            <Leaf className="w-5 h-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-stone-900">
            100% Cold-Pressed Oils
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            We never use recycled or industrial palm oils. Every batch is slow-fried in pure cold-pressed groundnut and sunflower oils, ensuring zero trans-fats and that light, clean golden crunch.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-stone-900">
            Stone-Ground Flours
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Our rice and roasted lentils (chana dal, urad dal) are stone-ground in traditional mills to preserve natural aroma, fiber, and structural crispness without starch additives.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-stone-900">
            Small Fresh Batches
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            No dusty warehouse inventory. Batches are prepared in small quantities and packed immediately in multi-layer moisture-lock pouches to reach you as crisp as if just lifted from the pan.
          </p>
        </div>
      </div>

      {/* CTA Box */}
      <div className="bg-[#FAF2E8] border border-amber-200 rounded-2xl p-8 sm:p-10 text-center space-y-4">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#451A03]">
          Bring Home the Warmth of Andhra Traditions
        </h2>
        <p className="text-xs sm:text-sm text-stone-700 max-w-xl mx-auto leading-relaxed">
          Order for your family tea-time or gift festival hampers to your loved ones anywhere across India.
        </p>
        <button
          onClick={onShopNow}
          className="px-6 py-3 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] text-xs font-semibold rounded-xl shadow-md transition-colors inline-flex items-center gap-2"
        >
          <span>Shop Homemade Snacks</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
