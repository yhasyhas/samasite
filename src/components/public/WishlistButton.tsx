import React from 'react';
import { Heart } from 'lucide-react';
import type { Product } from '../../types';
import { useWishlist } from '../../hooks/useWishlist';
import { toast } from 'sonner';

interface WishlistButtonProps {
  product: Product;
  size?: number;
  className?: string;
}

export function WishlistButton({ product, size = 18, className = '' }: WishlistButtonProps) {
  const { isWished, toggleWish } = useWishlist();
  const active = isWished(product.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWish(product);
    if (!active) {
      toast.success('Ajouté aux favoris ❤️');
    } else {
      toast('Retiré des favoris', { icon: '🗑️' });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-110 ${className}`}
      style={{
        width: size + 8,
        height: size + 8,
        color: active ? '#ef4444' : 'var(--color-text-muted)',
      }}
      title={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Heart size={size} fill={active ? '#ef4444' : 'transparent'} strokeWidth={active ? 0 : 2} />
    </button>
  );
}