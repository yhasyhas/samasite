import { supabase } from '../lib/supabase';
import type { Promotion } from '../types';

export async function getPromotions(activeOnly = false) {
  let query = supabase.from('promotions').select('*').order('created_at', { ascending: false });
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  return { data: data as Promotion[] | null, error };
}

export async function createPromotion(promotion: Partial<Promotion>) {
  const { data, error } = await supabase
    .from('promotions')
    .insert(promotion)
    .select()
    .maybeSingle();
  return { data: data as Promotion | null, error };
}

export async function updatePromotion(id: string, promotion: Partial<Promotion>) {
  const { data, error } = await supabase
    .from('promotions')
    .update(promotion)
    .eq('id', id)
    .select()
    .maybeSingle();
  return { data: data as Promotion | null, error };
}

export async function deletePromotion(id: string) {
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  return { error };
}
