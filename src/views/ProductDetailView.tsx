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
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onCheckoutDirect: () => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product: initialProduct,
  onBack,
  onSelectProduct,
  onCheckoutDirect,
}) => {
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product>(initialProduct);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    initialProduct.variants && initialProduct.variants.length > 0 ? initialProduct.variants[0].id : undefined
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setProduct(initialProduct);
    setSelectedVariantId(
      initialProduct.variants && initialProduct.variants.length > 0
        ? initialProduct.variants[0].id
        : undefined
    );
    setActiveImageIndex(0);
    setQuantity(1);

    // Fetch full fresh product details & related products
    api.getProductBySlug(initialProduct.slug || initialProduct.id).then((res) => {
      if (res.success) {
        if (res.product) setProduct(res.product);
        if (res.relatedProducts) setRelatedProducts(res.relatedProducts);
      }
    });
  }, [initialProduct]);

  const effectiveVariants: ProductVariant[] = React.useMemo(() => {
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

  const selectedVariant = React.useMemo(() => {
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
  const isLowStock = currentStock > 0 && currentStock <= product.lowStockThreshold;

  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    await addToCart(product.id, selectedVariant?.id, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) return;
    await addToCart(product.id, selectedVariant?.id, quantity);
    onCheckoutDirect();
  };

  const images = product.images && product.images.length > 0
    ? product.images
    : ['/src/assets/images/hero_pindivantalu_traditional_1790935769601.jpg'];

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Gallery Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="h-56 sm:h-72 md:h-80 lg:aspect-4/3 lg:h-auto w-full bg-[#FAF6EE] rounded-2xl overflow-hidden border border-amber-300/40 shadow-md relative group flex items-center justify-center">
            {/* Ambient warm radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.2),transparent_75%)] pointer-events-none" />
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/25 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-orange-400/20 rounded-full blur-2xl pointer-events-none" />

            <img
              src={images[activeImageIndex] || images[0]}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full w-auto h-auto object-contain p-2 sm:p-4 group-hover:scale-102 transition-transform duration-500"
            />

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
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    activeImageIndex === idx
                      ? 'border-[#78350F] ring-2 ring-amber-200'
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
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
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

            {product.campaignOffer && (
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-lg text-xs font-bold border border-amber-200 animate-pulse">
                  Campaign Offer: {product.campaignOffer}
                </span>
              </div>
            )}

            {/* Price Box */}
            <div className="p-4 bg-white rounded-xl border border-stone-200/80 flex items-baseline justify-between shadow-2xs">
              <div className="flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-3xl font-bold text-stone-900">
                  ₹{currentPrice}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-stone-400 line-through">
                    ₹{regularPrice}
                  </span>
                )}
                {hasDiscount && (
                  <span className="text-xs font-semibold text-[#15803D] font-sans ml-1">
                    Save ₹{regularPrice - currentPrice}
                  </span>
                )}
              </div>

              {/* Stock Status */}
              <div>
                {isOutOfStock ? (
                  <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded">
                    Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Low Stock
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded">
                    In Stock (Fresh Batch)
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {product.description}
            </p>

            {/* Package Size / Variants (250g, 500g, 1kg) */}
            {effectiveVariants.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Select Packaging Size (250g, 500g, 1kg)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {effectiveVariants.map((v) => {
                    const vPrice = v.salePrice ?? v.price;
                    const isSelected = selectedVariantId === v.id || (selectedVariant && selectedVariant.id === v.id);
                    const vOut = v.stockQuantity <= 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={vOut}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#78350F] bg-amber-50/80 ring-2 ring-[#78350F] shadow-xs'
                            : 'border-stone-200 bg-white hover:border-amber-300 hover:bg-stone-50'
                        } ${vOut ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <div className="text-xs font-bold text-stone-900">{v.weight}</div>
                        <div className="text-xs font-mono font-bold text-amber-900 mt-0.5">
                          ₹{vPrice}
                        </div>
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
                    onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                    disabled={quantity >= currentStock}
                    className="p-1.5 text-stone-600 hover:text-stone-900 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
                    isOutOfStock
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : added
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
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="w-full py-3 px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-semibold text-xs sm:text-sm shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
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

      {/* Product Details Specs (Ingredients, Allergens, Storage) */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 space-y-6">
        <h3 className="font-display text-xl font-bold text-stone-900 border-b border-stone-100 pb-3">
          Ingredients & Preparation Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
          {/* Ingredients */}
          <div className="space-y-2">
            <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
              Ingredients
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {product.ingredients && product.ingredients.length > 0 ? (
                product.ingredients.map((ing, i) => (
                  <span
                    key={i}
                    className="bg-stone-100 text-stone-700 px-2.5 py-1 rounded text-xs"
                  >
                    {ing}
                  </span>
                ))
              ) : (
                <span className="text-stone-500">Pure traditional kitchen ingredients.</span>
              )}
            </div>
          </div>

          {/* Allergens & Spice */}
          <div className="space-y-2">
            <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
              Allergen Notice
            </h4>
            {product.allergens && product.allergens.length > 0 ? (
              <p className="text-stone-600">
                Contains: <strong className="text-stone-800">{product.allergens.join(', ')}</strong>.
              </p>
            ) : (
              <p className="text-stone-500">No common allergens listed.</p>
            )}
            <p className="text-stone-500 pt-1">
              Dietary: <strong className="text-emerald-800 font-semibold">100% Pure Vegetarian</strong>
            </p>
          </div>

          {/* Storage instructions */}
          <div className="space-y-2">
            <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
              Storage & Freshness
            </h4>
            <p className="text-stone-600">
              {product.storageInstructions || 'Store in an airtight container in a dry place.'}
            </p>
            <p className="text-stone-500">
              Shelf Life: <strong>{product.shelfLife || '45-60 Days'}</strong> from dispatch date.
            </p>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl font-bold text-stone-900">
              You May Also Love
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onSelect={(selected) => onSelectProduct(selected)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
