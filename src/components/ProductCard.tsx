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

    // Process and enrich variants
    const processedList = list.map((v) => {
      let vOrig = v.originalPrice;
      if (!vOrig && product.originalBasePrice && product.originalBasePrice > product.basePrice) {
        if (v.weight.toLowerCase() === '250g') vOrig = Math.round(product.originalBasePrice * 0.55);
        else if (v.weight.toLowerCase() === '1kg') vOrig = Math.round(product.originalBasePrice * 1.9);
        else vOrig = product.originalBasePrice;
      }
      return { ...v, originalPrice: vOrig };
    });

    // Ensure 250g exists
    if (!processedList.some((v) => v.weight.toLowerCase() === '250g')) {
      const origVarP = product.originalBasePrice ? Math.round(product.originalBasePrice * 0.55) : undefined;
      processedList.push({
        id: `${product.id}_250g`,
        weight: '250g',
        price: Math.round(defaultP * 0.55),
        originalPrice: origVarP,
        salePrice: (product.salePrice && product.salePrice < product.basePrice)
          ? Math.round(product.salePrice * 0.55)
          : undefined,
        stockQuantity: 20,
        sku: `${product.sku || 'PV'}-250G`,
      });
    }
    // Ensure 500g exists
    if (!processedList.some((v) => v.weight.toLowerCase() === '500g')) {
      processedList.push({
        id: `${product.id}_500g`,
        weight: '500g',
        price: defaultP,
        originalPrice: product.originalBasePrice,
        salePrice: (product.salePrice && product.salePrice < product.basePrice)
          ? product.salePrice
          : undefined,
        stockQuantity: 20,
        sku: `${product.sku || 'PV'}-500G`,
      });
    }
    // Ensure 1kg exists
    if (!processedList.some((v) => v.weight.toLowerCase() === '1kg')) {
      const origVarP = product.originalBasePrice ? Math.round(product.originalBasePrice * 1.9) : undefined;
      processedList.push({
        id: `${product.id}_1kg`,
        weight: '1kg',
        price: Math.round(defaultP * 1.9),
        originalPrice: origVarP,
        salePrice: (product.salePrice && product.salePrice < product.basePrice)
          ? Math.round(product.salePrice * 1.9)
          : undefined,
        stockQuantity: 10,
        sku: `${product.sku || 'PV'}-1KG`,
      });
    }

    const sortWeights: Record<string, number> = { '250g': 1, '500g': 2, '1kg': 3 };
    return processedList.sort(
      (a, b) =>
        (sortWeights[a.weight.toLowerCase()] || 99) -
        (sortWeights[b.weight.toLowerCase()] || 99)
    );
  }, [product]);

  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Default variant based on product base price
  const basePriceDefaultVariant = useMemo(() => {
    if (!effectiveVariants || effectiveVariants.length === 0) return undefined;
    // 1. Direct price match with basePrice
    const exact = effectiveVariants.find((v) => v.price === product.basePrice);
    if (exact) return exact;
    // 2. Direct weight match with product.weight
    if (product.weight) {
      const matchWeight = effectiveVariants.find(
        (v) => v.weight.toLowerCase().trim() === product.weight.toLowerCase().trim()
      );
      if (matchWeight) return matchWeight;
    }
    // 3. Closest price to basePrice
    const sortedByDiff = [...effectiveVariants].sort(
      (a, b) => Math.abs(a.price - product.basePrice) - Math.abs(b.price - product.basePrice)
    );
    return sortedByDiff[0] || effectiveVariants[0];
  }, [effectiveVariants, product.basePrice, product.weight]);

  // Default to the variant matching base price, or user's explicit selection
  const selectedVariant = useMemo(() => {
    if (selectedVariantId) {
      const found = effectiveVariants.find((v) => v.id === selectedVariantId);
      if (found) return found;
    }
    return basePriceDefaultVariant || effectiveVariants[0];
  }, [effectiveVariants, selectedVariantId, basePriceDefaultVariant]);

  const currentPrice = selectedVariant
    ? (selectedVariant.salePrice && selectedVariant.salePrice < selectedVariant.price ? selectedVariant.salePrice : selectedVariant.price)
    : (product.salePrice && product.salePrice < product.basePrice ? product.salePrice : product.basePrice);

  // Detect campaign offer percentage from badge if present (e.g. "10% OFF" -> 10)
  const campaignMatch = product.campaignOffer ? product.campaignOffer.match(/(\d+)\s*%/i) : null;
  const campaignPct = campaignMatch ? parseInt(campaignMatch[1], 10) : 0;

  let computedRegularPrice = selectedVariant
    ? (selectedVariant.originalPrice && selectedVariant.originalPrice > currentPrice
        ? selectedVariant.originalPrice
        : (selectedVariant.salePrice && selectedVariant.price > selectedVariant.salePrice
            ? selectedVariant.price
            : (product.originalBasePrice && product.originalBasePrice > currentPrice
                ? (selectedVariant.weight.toLowerCase() === '250g'
                    ? Math.round(product.originalBasePrice * 0.55)
                    : selectedVariant.weight.toLowerCase() === '1kg'
                    ? Math.round(product.originalBasePrice * 1.9)
                    : product.originalBasePrice)
                : currentPrice)))
    : (product.originalBasePrice && product.originalBasePrice > currentPrice
        ? product.originalBasePrice
        : (product.salePrice && product.basePrice > product.salePrice
            ? product.basePrice
            : currentPrice));

  // If product has a campaign offer but regular price wasn't higher, derive regular price dynamically
  if (product.campaignOffer && computedRegularPrice <= currentPrice) {
    const pctToUse = campaignPct > 0 ? campaignPct : 10;
    computedRegularPrice = Math.max(currentPrice + 1, Math.round(currentPrice / (1 - pctToUse / 100)));
  }

  const regularPrice = computedRegularPrice;
  const hasDiscount = regularPrice > currentPrice || Boolean(product.campaignOffer);
  const discountPercent = regularPrice > currentPrice
    ? Math.round(((regularPrice - currentPrice) / regularPrice) * 100)
    : (campaignPct > 0 ? campaignPct : 10);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await addToCart(product.id, selectedVariant?.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  // Fetch only images provided by the backend API / database (no local static bundle image)
  const imageSrc = product.images && product.images.length > 0 ? product.images[0] : '';

  return (
    <div
      onClick={() => onSelect(product)}
      className="product-card-continuous-border ambient-product-card group relative flex flex-col p-[2.5px] rounded-2xl cursor-pointer"
    >
      <div className="relative flex flex-col w-full h-full bg-white rounded-[13.5px] overflow-hidden">
        {/* Ambient warm radial glow behind product frame */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-amber-400/20 via-orange-300/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:from-amber-400/35 transition-all duration-500" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-gradient-to-tr from-amber-500/15 via-yellow-400/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:from-amber-500/25 transition-all duration-500" />

        {/* Product Image Frame - Flush with card, seamless white background, no gaps */}
        <div className="relative aspect-square w-full bg-white overflow-hidden flex items-center justify-center p-0">
          {!imgError && imageSrc ? (
            <img
              src={imageSrc}
              alt={product.name}
              title={product.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400 p-4">
              <span className="font-display text-base sm:text-lg text-amber-900 font-semibold">{product.name}</span>
            </div>
          )}

          {/* Top Discount Badge Over Image */}
          {hasDiscount && (
            <div className="absolute top-2.5 left-2.5 z-20">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold shadow-sm tracking-wide uppercase">
                {discountPercent}% OFF
              </span>
            </div>
          )}

          {/* Ambient Ting Light-Sweep Reflection */}
          <div className="ambient-ting-sheen" />
        </div>

        {/* Card Content - Flush below image with zero gap */}
        <div className="px-3 pt-2 pb-3 sm:px-4 sm:pt-2.5 sm:pb-3.5 flex flex-col justify-between relative z-10 bg-white">
          {(product.campaignOffer || hasDiscount) && (
            <div className="mb-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 text-amber-900 text-[10px] font-bold rounded-md border border-amber-300 shadow-2xs">
                <Sparkles className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                <span className="truncate max-w-[170px]">{product.campaignOffer || `${discountPercent}% Special Offer`}</span>
                {discountPercent > 0 && !product.campaignOffer?.includes(`${discountPercent}%`) && (
                  <span className="bg-amber-600 text-white text-[9px] px-1 py-0.2 rounded font-extrabold ml-0.5">
                    {discountPercent}% OFF
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Packaging Grams Selector (250g, 500g, 1kg) */}
          {effectiveVariants.length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5" onClick={(e) => e.stopPropagation()}>
              {effectiveVariants.map((v) => {
                const isSelected = selectedVariant?.id === v.id;
                const vPrice = v.salePrice && v.salePrice < v.price ? v.salePrice : v.price;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'border-amber-700 bg-amber-100/90 text-amber-950 font-bold shadow-xs ring-2 ring-amber-700/40'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-amber-400 hover:bg-stone-50'
                    }`}
                  >
                    <span>{v.weight}</span>
                    <span className="ml-1 opacity-75 font-mono text-[9px]">₹{vPrice}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Price and Action Baseline */}
          <div className="mt-2.5 pt-2 sm:pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
                <span className="text-base sm:text-lg font-bold text-stone-900 group-hover:text-[#78350F] transition-colors">
                  ₹{currentPrice}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-stone-400 line-through decoration-rose-500/80 decoration-2">
                    ₹{regularPrice}
                  </span>
                )}
                {hasDiscount && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded font-sans hidden xs:inline">
                    Save ₹{regularPrice - currentPrice}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                added
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
    </div>
  );
};
