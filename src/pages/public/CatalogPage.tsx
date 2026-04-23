import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { ProductCard } from '../../components/public/ProductCard';
import { ProductCardSkeleton } from '../../components/ui/Skeleton';
import { getProducts } from '../../services/products';
import { getCategories } from '../../services/categories';
import type { Product, Category } from '../../types';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'price_asc', label: 'Prix : croissant' },
  { value: 'price_desc', label: 'Prix : décroissant' },
  { value: 'name_asc', label: 'Nom A-Z' },
];

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');
  const PAGE_SIZE = 12;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data, count } = await getProducts({
      search: search || undefined,
      categoryId: categoryId || undefined,
      active: true,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });

    let sorted = [...(data || [])];
    if (sort === 'price_asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'name_asc') sorted.sort((a, b) => a.name.localeCompare(b.name));

    setProducts(sorted);
    setTotalCount(count || 0);
    setLoading(false);
  }, [search, categoryId, sort, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    getCategories(true).then(({ data }) => setCategories(data || []));
  }, []);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    setSearchParams(params);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '80vh' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Catalogue de produits</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {loading ? 'Loading...' : `${totalCount} product${totalCount !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Search + Sort bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher produits..."
              value={search}
              onChange={(e) => updateParam('search', e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
            {search && (
              <button
                onClick={() => updateParam('search', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="appearance-none pl-4 pr-8 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors sm:hidden"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <SlidersHorizontal size={15} />
            Filtres
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar filters */}
          <aside
            className={`${showFilters ? 'block' : 'hidden'} sm:block w-full sm:w-56 shrink-0`}
          >
            <div
              className="rounded-2xl p-4 sticky top-24"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Catégories</h3>
              <div className="space-y-1">
                <button
                  onClick={() => updateParam('category', '')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${!categoryId ? 'font-semibold' : 'hover:bg-black/5'}`}
                  style={{
                    color: !categoryId ? 'var(--color-primary)' : 'var(--color-text)',
                    backgroundColor: !categoryId ? 'var(--color-primary)' + '15' : 'transparent',
                  }}
                >
                  Tous les produits
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => updateParam('category', cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${categoryId === cat.id ? 'font-semibold' : 'hover:bg-black/5'}`}
                    style={{
                      color: categoryId === cat.id ? 'var(--color-primary)' : 'var(--color-text)',
                      backgroundColor: categoryId === cat.id ? 'var(--color-primary)' + '15' : 'transparent',
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Search size={40} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Aucun produit trouvé</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Essayez de modifier vos filtres ou votre recherche</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => updateParam('page', String(page - 1))}
                      className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 transition-all"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      Précédent
                    </button>
                    <span className="text-sm px-3" style={{ color: 'var(--color-text-muted)' }}>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => updateParam('page', String(page + 1))}
                      className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 transition-all"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
