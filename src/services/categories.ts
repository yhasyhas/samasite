import { supabase } from '../lib/supabase';
import type { Category } from '../types';

export async function getCategories(activeOnly = true) {
  let query = supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  return { data: data as Category[] | null, error };
}

export async function getCategoryBySlug(slug: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  return { data: data as Category | null, error };
}

export async function createCategory(category: Partial<Category>) {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .maybeSingle();
  return { data: data as Category | null, error };
}

export async function updateCategory(id: string, category: Partial<Category>) {
  const { data, error } = await supabase
    .from('categories')
    .update(category)
    .eq('id', id)
    .select()
    .maybeSingle();
  return { data: data as Category | null, error };
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  return { error };
}
