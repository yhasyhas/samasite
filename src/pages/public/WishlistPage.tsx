import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight, Trash2 } from 'lucide-react';
import { useWishlist } from '../../hooks/useWishlist';
import { ProductCard } from '../../components/public/ProductCard';
import { useTheme } from '../../contexts/ThemeContext';

export function WishlistPage() {
  const { items, clearWishlist } = useWishlist();
  const { settings } = useTheme();

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '80vh' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              Mes favoris
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {items.length} article{items.length !== 1 ? 's' : ''} enregistré{items.length !== 1 ? 's' : ''}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearWishlist}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-red-50"
              style={{ color: 'var(--color-error)' }}
            >
              <Trash2 size={14} />
              Tout supprimer
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Aucun favori pour le moment
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Parcourez le catalogue et cliquez sur le cœur pour sauvegarder vos produits préférés.
            </p>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Parcourir le catalogue
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}