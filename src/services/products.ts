import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export async function getProducts(filters?: {
  categoryId?: string;
  search?: string;
  featured?: boolean;
  active?: boolean;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('products')
    .select('*, category:categories(id,name,slug)', { count: 'exact' });

  if (filters?.active !== false) query = query.eq('is_active', true);
  if (filters?.featured) query = query.eq('is_featured', true);
  if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,short_description.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
  }
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1);

  query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query;
  return { data: data as Product[] | null, error, count };
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(id,name,slug)')
    .eq('slug', slug)
    .maybeSingle();
  return { data: data as Product | null, error };
}

export async function getProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(id,name,slug)')
    .eq('id', id)
    .maybeSingle();
  return { data: data as Product | null, error };
}

export async function createProduct(product: Partial<Product>) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .maybeSingle();
  return { data: data as Product | null, error };
}

export async function updateProduct(id: string, product: Partial<Product>) {
  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
    .select()
    .maybeSingle();
  return { data: data as Product | null, error };
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  return { error };
}
