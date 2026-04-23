import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Package } from 'lucide-react';
import type { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';
import { useCart } from '../../contexts/CartContext';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { settings } = useTheme();
  const { addItem } = useCart();

  const image = product.images?.[0];
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
    toast.success(`${product.name} added to quote cart`);
  };

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image.url}
            alt={image.alt || product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <Package size={40} className="text-slate-300" />
          </div>
        )}
        {product.is_featured && (
          <div
            className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Star size={10} fill="currentColor" />
            À la une
          </div>
        )}
        {hasDiscount && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold text-white bg-red-500">
            -{discountPct}%
          </div>
        )}
        {product.stock_qty === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white/90 text-slate-900 text-sm font-semibold px-4 py-1.5 rounded-full">
              Épuisé
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        {product.category && (
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-secondary)' }}>
            {product.category.name}
          </span>
        )}
        <h3
          className="font-semibold text-sm mt-1 leading-snug line-clamp-2 group-hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-text)' }}
        >
          {product.name}
        </h3>
        {product.short_description && (
          <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {product.short_description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
              {formatCurrency(product.price, settings.currency)}
            </span>
            {hasDiscount && (
              <span className="ml-2 text-sm line-through" style={{ color: 'var(--color-text-muted)' }}>
                {formatCurrency(product.compare_at_price!, settings.currency)}
              </span>
            )}
          </div>
          {product.stock_qty > 0 && (
            <button
              onClick={handleAddToCart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-90 hover:shadow-sm active:scale-95 text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <ShoppingCart size={13} />
              Ajouter
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
