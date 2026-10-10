import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { api } from '../services/api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onViewCatalogWithSearch: (term: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onViewCatalogWithSearch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchTerm('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.getProducts({ search: searchTerm.trim(), limit: 6 });
        if (res.success && res.products) {
          setResults(res.products);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-stone-200 z-10">
        {/* Search Input Bar */}
        <div className="p-4 flex items-center gap-3 border-b border-stone-200 bg-[#FAF7F2]">
          <Search className="w-5 h-5 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchTerm.trim()) {
                onClose();
                onViewCatalogWithSearch(searchTerm.trim());
              }
            }}
            placeholder="Search Andhra Mixture, Butter Murukulu, Chekkalu, ingredients..."
            className="flex-1 bg-transparent text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 px-2 py-1 bg-stone-200/60 rounded"
          >
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-4">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-stone-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
              <span className="text-xs">Searching fresh snacks...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-1">
                Matching Traditional Snacks ({results.length})
              </p>
              {results.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    onClose();
                    onSelectProduct(product);
                  }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-amber-50/70 transition-colors cursor-pointer group"
                >
                  <img
                    src={product.images[0] || '/src/assets/images/hero_pindivantalu_traditional_1790935769601.jpg'}
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-contain bg-stone-100 shrink-0 p-1"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-stone-900 truncate group-hover:text-[#78350F]">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-stone-500 truncate">
                      {product.weight} · ₹{product.basePrice}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-[#78350F] group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}

              <button
                onClick={() => {
                  onClose();
                  onViewCatalogWithSearch(searchTerm.trim());
                }}
                className="w-full text-center py-2.5 mt-2 text-xs font-semibold text-[#78350F] hover:text-[#451A03] hover:underline"
              >
                View all results for "{searchTerm}" →
              </button>
            </div>
          ) : searchTerm ? (
            <div className="py-8 text-center text-stone-500">
              <p className="text-xs font-medium">No snacks found matching "{searchTerm}".</p>
              <p className="text-[11px] text-stone-400 mt-1">Try searching for Murukulu, Mixture, or Chekkalu.</p>
            </div>
          ) : (
            <div className="py-4 space-y-3">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Popular Searches
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Andhra Mixture', 'Butter Murukulu', 'Pappu Chekkalu', 'Gavvalu', 'Spicy', 'Sesame'].map(
                  (tag) => (
                    <button
                      key={tag}
                      onClick={() => setSearchTerm(tag)}
                      className="text-xs px-2.5 py-1 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 text-stone-700 rounded-md transition-colors"
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
