import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Clock,
  Sparkles,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Product, Category, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { ProductCard } from '../components/ProductCard';
import { api } from '../services/api';

interface ProductDetailViewProps {
  product: Product;
  allProducts?: Product[];
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onCheckoutDirect: () => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product: initialProduct,
  allProducts,
  onBack,
  onSelectProduct,
  onCheckoutDirect,
}) => {
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product>(initialProduct);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setProduct(initialProduct);
    setSelectedVariantId(undefined);
    setActiveImageIndex(0);
    setQuantity(1);

    // Fetch full fresh product details & related products
    api.getProductBySlug(initialProduct.slug || initialProduct.id).then((res) => {
      if (res.success) {
        if (res.product) setProduct(res.product);
        if (res.relatedProducts && res.relatedProducts.length > 0) {
          setRelatedProducts(res.relatedProducts);
        } else if (allProducts && allProducts.length > 0) {
          setRelatedProducts(allProducts.filter((p) => p.id !== initialProduct.id).slice(0, 4));
        } else {
          api.getProducts({ limit: 8 }).then((pRes) => {
            if (pRes.success && pRes.products) {
              setRelatedProducts(pRes.products.filter((p: Product) => p.id !== initialProduct.id).slice(0, 4));
            }
          });
        }
      }
    });
  }, [initialProduct, allProducts]);

  const effectiveVariants: ProductVariant[] = React.useMemo(() => {
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

  const basePriceDefaultVariant = React.useMemo(() => {
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

  const selectedVariant = React.useMemo(() => {
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

  const handleAddToCart = async () => {
    await addToCart(product.id, selectedVariant?.id, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = async () => {
    await addToCart(product.id, selectedVariant?.id, quantity);
    onCheckoutDirect();
  };

  // Fetch only images returned by backend API
  const images = product.images && product.images.length > 0
    ? product.images
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#78350F] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Snacks</span>
      </button>

      {/* Contiguous Purchase Module & Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Gallery Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-square w-full bg-stone-100 rounded-2xl overflow-hidden border border-stone-200/90 shadow-md relative group flex items-center justify-center p-0">
            {/* Ambient warm radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.15),transparent_75%)] pointer-events-none" />
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-orange-400/15 rounded-full blur-2xl pointer-events-none" />

            {(images[activeImageIndex] || images[0]) ? (
              <img
                src={images[activeImageIndex] || images[0]}
                alt={product.name}
                title={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-stone-50">
                <span className="font-display text-xl sm:text-2xl font-bold text-amber-900">{product.name}</span>
                <span className="text-xs text-stone-400 mt-1">Authentic Andhra Homemade Delicacy</span>
              </div>
            )}

            {/* Ambient Ting Sheen */}
            <div className="ambient-ting-sheen" />
          </div>

          {/* Thumbnail row if multiple images exist */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 bg-white transition-all shrink-0 p-0 cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-[#78350F] ring-2 ring-amber-300'
                      : 'border-stone-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Purchase Module */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Zero-Pill Unboxed Metadata */}
            <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
              <span>SKU: {selectedVariant?.sku || product.sku}</span>
              <span aria-hidden="true">·</span>
              <span>Authentic Andhra Savory</span>
              {product.spiceLevel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-800 font-semibold">{product.spiceLevel} Spice</span>
                </>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 leading-tight">
              {product.name}
            </h1>

            {(product.campaignOffer || hasDiscount) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 text-amber-950 text-xs font-bold border border-amber-300 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>{product.campaignOffer || `${discountPercent}% Special Offer`}</span>
                  {discountPercent > 0 && !product.campaignOffer?.includes(`${discountPercent}%`) && (
                    <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-extrabold ml-1">
                      {discountPercent}% OFF
                    </span>
                  )}
                </span>
                {hasDiscount && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    Instant Savings of ₹{regularPrice - currentPrice}
                  </span>
                )}
              </div>
            )}

            {/* Price Box */}
            <div className="p-4 bg-white rounded-xl border border-stone-200/90 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 shadow-2xs">
              <div className="flex items-baseline gap-2.5 font-mono tabular-nums flex-wrap">
                <span className="text-3xl sm:text-4xl font-extrabold text-stone-900">
                  ₹{currentPrice}
                </span>
                {hasDiscount && (
                  <span className="text-base sm:text-lg text-stone-400 line-through decoration-rose-500/80 decoration-2 font-semibold">
                    ₹{regularPrice}
                  </span>
                )}
                {hasDiscount && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md font-sans">
                    {discountPercent}% OFF (Save ₹{regularPrice - currentPrice})
                  </span>
                )}
              </div>
              <div className="text-[11px] text-stone-500 font-medium">
                Inclusive of all taxes · Fresh batch guarantee
              </div>
            </div>

            {/* Package Size / Variants (250g, 500g, 1kg) */}
            {effectiveVariants.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Select Packaging Size (250g, 500g, 1kg)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {effectiveVariants.map((v) => {
                    const vPrice = v.salePrice && v.salePrice < v.price ? v.salePrice : v.price;
                    const vOrig = v.originalPrice && v.originalPrice > vPrice
                      ? v.originalPrice
                      : (v.salePrice && v.price > v.salePrice ? v.price : undefined);
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#78350F] bg-amber-50/80 ring-2 ring-[#78350F] shadow-xs'
                            : 'border-stone-200 bg-white hover:border-amber-300 hover:bg-stone-50'
                        }`}
                      >
                        <div className="text-xs font-bold text-stone-900">{v.weight}</div>
                        <div className="flex items-center justify-center gap-1 font-mono font-bold mt-0.5">
                          <span className="text-xs text-amber-950">₹{vPrice}</span>
                          {vOrig && (
                            <span className="text-[10px] text-stone-400 line-through decoration-rose-400 font-normal">
                              ₹{vOrig}
                            </span>
                          )}
                        </div>
                        {vOrig && (
                          <div className="text-[9px] font-bold text-emerald-700 mt-0.5">
                            Save ₹{vOrig - vPrice}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Stepper and Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-stone-200">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-stone-300 rounded-xl bg-white px-2 py-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="p-1.5 text-stone-600 hover:text-stone-900 disabled:opacity-30"
                  >
                    -
                  </button>
                  <span className="px-3 text-sm font-bold font-mono tabular-nums text-stone-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-1.5 text-stone-600 hover:text-stone-900"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
                    added
                      ? 'bg-emerald-700 text-white'
                      : 'bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7]'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to Your Cart</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full py-3 px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-semibold text-xs sm:text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Buy Now (Instant Checkout)</span>
              </button>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-stone-200 text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>100% Homemade Taste</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Shelf Life: {product.shelfLife || '45-60 Days'}</span>
            </div>
          </div>
        </div>
      </div>



      {/* Related Products - Always mentioned for every product */}
      <div className="space-y-6 pt-6 border-t border-stone-200">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl font-bold text-stone-900">
            You May Also Love
          </h3>
          <span className="text-xs font-semibold text-amber-800">
            Authentic Traditional Snacks
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {(relatedProducts.length > 0
            ? relatedProducts
            : (allProducts || []).filter((p) => p.id !== product.id).slice(0, 4)
          ).map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onSelect={(selected) => onSelectProduct(selected)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
