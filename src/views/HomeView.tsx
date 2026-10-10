import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Clock, Award, Leaf } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';

interface HomeViewProps {
  products: Product[];
  categories: Category[];
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (categorySlug: string) => void;
  onExploreAll: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  products,
  categories,
  onSelectProduct,
  onSelectCategory,
  onExploreAll,
}) => {
  const featuredProducts = products.filter((p) => p.isFeatured || p.isBestSeller).slice(0, 6);
  const mixtures = products.filter((p) => p.categoryId === 'cat_mixtures' || p.slug.includes('mixture')).slice(0, 4);

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#2D1808] text-amber-50">
        <div className="absolute inset-0 z-0 opacity-40">
          <img
            src="/src/assets/images/hero_pindivantalu_traditional_1790935769601.jpg"
            alt="Traditional Telugu Pindi Vantalu"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2D1808] via-[#2D1808]/85 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 md:py-32 lg:py-36">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Authentic Homemade Telugu Sahadeep Reddy's PindiVantalu</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#FEF3C7] leading-tight text-balance">
              Taste the Tradition with Sahadeep Reddy's.
            </h1>

            <p className="text-sm sm:text-base text-amber-100/80 leading-relaxed font-normal">
              Heirloom recipes prepared fresh with pure stone-ground rice flours, crunchy roasted lentils, and cold-pressed oils. Crispy Murukulu, zesty Andhra Mixtures, and savory Chekkalu shipped straight to your doorstep.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={onExploreAll}
                className="px-6 py-3.5 bg-[#D97706] hover:bg-[#B45309] text-white font-semibold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 group"
              >
                <span>Shop Fresh Batches</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Quality Pillars */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-amber-800/60 text-xs text-amber-200/90 font-medium">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Cold-Pressed Oils</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Heirloom Telugu Taste</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Made Fresh to Order</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured / Fresh Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
              Fresh Homemade Traditional Snacks
            </h2>
          </div>
          <button
            onClick={onExploreAll}
            className="text-xs font-semibold text-[#78350F] hover:text-[#451A03] hover:underline flex items-center gap-1"
          >
            <span>Browse Full Store</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {products.slice(0, 9).map((product) => {
            const cat = categories.find((c) => c.id === product.categoryId);
            return (
              <ProductCard
                key={product.id}
                product={product}
                categoryName={cat?.name}
                onSelect={onSelectProduct}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
};
