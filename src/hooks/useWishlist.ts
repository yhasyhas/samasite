import { useState, useEffect, useCallback } from 'react';
import type { Product } from '../types';

const STORAGE_KEY = 'samasite_wishlist';

function loadWishlist(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

function saveWishlist(items: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useWishlist() {
  const [items, setItems] = useState<Product[]>(loadWishlist);

  useEffect(() => {
    saveWishlist(items);
  }, [items]);

  const isWished = useCallback(
    (productId: string) => items.some((i) => i.id === productId),
    [items]
  );

  const toggleWish = useCallback((product: Product) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === product.id);
      if (exists) {
        return prev.filter((i) => i.id !== product.id);
      }
      return [...prev, product];
    });
  }, []);

  const removeWish = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  }, []);

  const clearWishlist = useCallback(() => {
    setItems([]);
  }, []);

  return { items, isWished, toggleWish, removeWish, clearWishlist, count: items.length };
}