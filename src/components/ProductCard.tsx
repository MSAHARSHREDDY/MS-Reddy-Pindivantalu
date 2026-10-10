import React, { useState, useMemo } from 'react';
import { ShoppingBag, Check, Sparkles } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
  categoryName?: string;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, categoryName, onSelect }) => {
  const { addToCart } = useCart();

  const effectiveVariants: ProductVariant[] = useMemo(() => {
    const list = [...(product.variants || [])];
    const defaultP = product.basePrice || 199;

    // Ensure 250g exists
    if (!list.some((v) => v.weight.toLowerCase() === '250g')) {
      list.push({
        id: `${product.id}_250g`,
        weight: '250g',
        price: Math.round(defaultP * 0.55),
        salePrice: (product.salePrice && product.salePrice < product.basePrice)
          ? Math.round(product.salePrice * 0.55)
          : undefined,
        stockQuantity: 20,
        sku: `${product.sku || 'PV'}-250G`,
      });
    }
    // Ensure 500g exists
    if (!list.some((v) => v.weight.toLowerCase() === '500g')) {
      list.push({
        id: `${product.id}_500g`,
        weight: '500g',
        price: defaultP,
        salePrice: (product.salePrice && product.salePrice < product.basePrice)
          ? product.salePrice
          : undefined,
        stockQuantity: 20,
        sku: `${product.sku || 'PV'}-500G`,
      });
    }
    // Ensure 1kg exists
    if (!list.some((v) => v.weight.toLowerCase() === '1kg')) {
      list.push({
        id: `${product.id}_1kg`,
        weight: '1kg',
        price: Math.round(defaultP * 1.9),
        salePrice: (product.salePrice && product.salePrice < product.basePrice)
          ? Math.round(product.salePrice * 1.9)
          : undefined,
        stockQuantity: 10,
        sku: `${product.sku || 'PV'}-1KG`,
      });
    }

    const sortWeights: Record<string, number> = { '250g': 1, '500g': 2, '1kg': 3 };
    return list.sort(
      (a, b) =>
        (sortWeights[a.weight.toLowerCase()] || 99) -
        (sortWeights[b.weight.toLowerCase()] || 99)
    );
  }, [product]);

  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Default to the standard pack matching product weight (or 500g)
  const selectedVariant = useMemo(() => {
    if (selectedVariantId) {
      const found = effectiveVariants.find((v) => v.id === selectedVariantId);
      if (found) return found;
    }
    return (
      effectiveVariants.find((v) => v.weight.toLowerCase() === (product.weight || '500g').toLowerCase()) ||
      effectiveVariants.find((v) => v.weight.toLowerCase() === '500g') ||
      effectiveVariants[0]
    );
  }, [effectiveVariants, selectedVariantId, product.weight]);

  const regularPrice = selectedVariant ? selectedVariant.price : product.basePrice;
  const currentPrice = selectedVariant
    ? (selectedVariant.salePrice && selectedVariant.salePrice < selectedVariant.price ? selectedVariant.salePrice : selectedVariant.price)
    : (product.salePrice && product.salePrice < product.basePrice ? product.salePrice : product.basePrice);
  const hasDiscount = regularPrice > currentPrice;
  const discountPercent = hasDiscount ? Math.round(((regularPrice - currentPrice) / regularPrice) * 100) : 0;

  const currentStock = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;
  const isOutOfStock = currentStock <= 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    await addToCart(product.id, selectedVariant?.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const imageSrc = product.images && product.images[0]
    ? product.images[0]
    : '/src/assets/images/hero_pindivantalu_traditional_1790935769601.jpg';

  return (
    <div
      onClick={() => onSelect(product)}
      className="ambient-product-card group relative flex flex-col bg-white rounded-2xl border border-stone-200/90 overflow-hidden cursor-pointer"
    >
      {/* Ambient warm radial glow behind product frame */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-amber-400/20 via-orange-300/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:from-amber-400/35 transition-all duration-500" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-gradient-to-tr from-amber-500/15 via-yellow-400/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:from-amber-500/25 transition-all duration-500" />

      {/* Product Image Frame with Ambient Ting Shimmer - Properly fitted without gaps */}
      <div className="relative h-44 sm:h-52 w-full bg-[#FAF6EE] overflow-hidden">
        {/* Soft Radial Center Light Aura */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.18),transparent_70%)] pointer-events-none" />

        {!imgError ? (
          <img
            src={imageSrc}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400 p-4">
            <span className="font-display text-lg text-amber-900 font-semibold">{product.name}</span>
          </div>
        )}

        {/* Ambient Ting Light-Sweep Reflection */}
        <div className="ambient-ting-sheen" />

        {isOutOfStock && (
          <div className="absolute inset-0 bg-stone-900/65 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="bg-stone-900 text-stone-200 text-xs font-semibold px-3 py-1 rounded">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between relative z-10 bg-white">
        <div>
          {/* Metadata */}
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
            <span>{categoryName || 'Traditional Snacks'}</span>
          </div>

          <h3 className="font-display font-bold text-stone-900 text-base mt-1 line-clamp-1 group-hover:text-[#78350F] transition-colors">
            {product.name}
          </h3>

          {product.campaignOffer && (
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded border border-amber-200">
                {product.campaignOffer}
              </span>
            </div>
          )}

          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Packaging Grams Selector (250g, 500g, 1kg) */}
        {effectiveVariants.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1" onClick={(e) => e.stopPropagation()}>
            {effectiveVariants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVariantId(v.id)}
                className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                  selectedVariantId === v.id
                    ? 'border-amber-700 bg-amber-50 text-amber-950 font-bold shadow-xs ring-1 ring-amber-700/30'
                    : 'border-stone-200 text-stone-600 hover:border-amber-300 hover:bg-stone-50'
                }`}
              >
                {v.weight}
              </button>
            ))}
          </div>
        )}

        {/* Price and Action Baseline */}
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
              <span className="text-base font-bold text-stone-900 group-hover:text-[#78350F] transition-colors">
                ₹{currentPrice}
              </span>
              {hasDiscount && (
                <span className="text-xs text-stone-400 line-through">
                  ₹{regularPrice}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              isOutOfStock
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                : added
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] shadow-sm hover:shadow-md hover:shadow-amber-900/20 active:scale-95'
            }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
