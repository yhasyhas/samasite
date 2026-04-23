import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { getCategoryBySlug } from '../../services/categories';
import { getProducts } from '../../services/products';
import { ProductCard } from '../../components/public/ProductCard';
import { ProductCardSkeleton } from '../../components/ui/Skeleton';
import type { Category, Product } from '../../types';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getCategoryBySlug(slug).then(async ({ data: cat }) => {
      setCategory(cat);
      if (cat) {
        const { data } = await getProducts({ categoryId: cat.id, active: true });
        setProducts(data || []);
      }
      setLoading(false);
    });
  }, [slug]);

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '80vh' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center gap-1.5 text-sm mb-6">
          <Link to="/" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Accueil</Link>
          <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
          <Link to="/catalog" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Catalogue</Link>
          <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
          <span style={{ color: 'var(--color-text)' }}>{category?.name || slug}</span>
        </nav>

        {category && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>{category.name}</h1>
            {category.description && (
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>{category.description}</p>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Aucun produit dans cette catégorie</h3>
            <Link to="/catalog" className="inline-flex items-center mt-4 text-sm hover:underline" style={{ color: 'var(--color-primary)' }}>
              Voir tous les produits
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
