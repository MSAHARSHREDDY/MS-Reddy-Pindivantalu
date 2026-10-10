import React, { useState, useEffect } from 'react';
import { Search, Loader2, ArrowUpDown, RefreshCw, X, ArrowLeft } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { api } from '../services/api';

interface CatalogViewProps {
  initialSearch?: string;
  categories?: Category[];
  onSelectProduct: (product: Product) => void;
  onBack?: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  initialSearch,
  categories = [],
  onSelectProduct,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch || '');
  const [sortOption, setSortOption] = useState<string>('popularity');
  const [page, setPage] = useState<number>(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.getProducts({
        search: searchTerm.trim() || undefined,
        sort: sortOption,
        page,
        limit: 24,
      });

      if (res.success) {
        setProducts(res.products);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [sortOption, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(1);
    // Fetch immediately after clear
    api.getProducts({ sort: sortOption, page: 1, limit: 24 }).then((res) => {
      if (res.success) {
        setProducts(res.products);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages || 1);
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {onBack && (
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-50 hover:text-amber-900 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}

      {/* Header and Controls */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-stone-200">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
              Traditional Snacks & Savories
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Explore freshly made Telugu Pindi Vantalu, crispy Murukulu, and spicy Andhra Mixtures.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchProducts}
              disabled={loading}
              className="p-2.5 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-600 transition-colors shadow-2xs"
              title="Refresh Products"
              aria-label="Refresh Products"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs text-stone-600 bg-white border border-stone-200 px-3.5 py-2.5 rounded-xl shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
              <label htmlFor="catalog-sort" className="font-medium">Sort by:</label>
              <select
                id="catalog-sort"
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-semibold text-stone-900 focus:outline-none cursor-pointer"
              >
                <option value="popularity">Popularity / Featured</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clean Search Bar */}
        <div className="w-full">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by snack name, ingredients, or taste..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-amber-800 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-20 top-2.5 text-stone-400 hover:text-stone-700 p-0.5"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1.5 px-3.5 py-1.5 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-stone-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700" />
          <p className="text-xs font-medium">Fetching freshly prepared snacks from kitchen...</p>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
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
      ) : (
        <div className="py-20 bg-white rounded-2xl border border-stone-200 text-center p-8 space-y-3">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-2xl">
            🔍
          </div>
          <h3 className="font-display text-xl font-bold text-stone-800">
            No traditional snacks found
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            We couldn't find any items matching "{searchTerm}". Try another search term or reset.
          </p>
          <button
            onClick={handleClearSearch}
            className="px-4 py-2 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] text-xs font-semibold rounded-lg shadow-sm transition-colors mt-2"
          >
            Show All Snacks
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pt-6 border-t border-stone-200 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-700 disabled:opacity-30 hover:bg-stone-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs font-mono tabular-nums text-stone-600 px-2">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-700 disabled:opacity-30 hover:bg-stone-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
