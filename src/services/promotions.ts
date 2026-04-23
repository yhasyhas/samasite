import { supabase } from '../lib/supabase';
import type { Promotion } from '../types';

export async function getPromotions(activeOnly = false) {
  const { data, error } = await supabase
    .from('promotions')
    .select('*, links:promotion_links(*, product:products(id,name), category:categories(id,name))')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };

  const typedData = data as (Promotion & { links?: any[] })[] | null;

  if (activeOnly && typedData) {
    const now = new Date();
    return {
      data: typedData.filter((p) => {
        if (!p.is_active) return false;
        if (p.starts_at && new Date(p.starts_at) > now) return false;
        if (p.ends_at && new Date(p.ends_at) < now) return false;
        return true;
      }),
      error,
    };
  }
  return { data: typedData, error };
}

export async function createPromotion(
  promotion: Partial<Promotion>,
  linkIds?: { productIds?: string[]; categoryIds?: string[] }
) {
  const { data, error } = await supabase
    .from('promotions')
    .insert(promotion)
    .select()
    .maybeSingle();

  if (error || !data) return { data: null, error };

  // Insertion des liens promotion ↔ produits
  if (linkIds?.productIds?.length) {
    await supabase.from('promotion_links').insert(
      linkIds.productIds.map((pid) => ({ promotion_id: data.id, product_id: pid }))
    );
  }
  // Insertion des liens promotion ↔ catégories
  if (linkIds?.categoryIds?.length) {
    await supabase.from('promotion_links').insert(
      linkIds.categoryIds.map((cid) => ({ promotion_id: data.id, category_id: cid }))
    );
  }

  return { data: data as Promotion, error: null };
}

export async function updatePromotion(
  id: string,
  promotion: Partial<Promotion>,
  linkIds?: { productIds?: string[]; categoryIds?: string[] }
) {
  const { data, error } = await supabase
    .from('promotions')
    .update(promotion)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error || !data) return { data: null, error };

  // On supprime les anciens liens et on réinsère les nouveaux
  await supabase.from('promotion_links').delete().eq('promotion_id', id);

  if (linkIds?.productIds?.length) {
    await supabase.from('promotion_links').insert(
      linkIds.productIds.map((pid) => ({ promotion_id: id, product_id: pid }))
    );
  }
  if (linkIds?.categoryIds?.length) {
    await supabase.from('promotion_links').insert(
      linkIds.categoryIds.map((cid) => ({ promotion_id: id, category_id: cid }))
    );
  }

  return { data: data as Promotion, error: null };
}

export async function deletePromotion(id: string) {
  // promotion_links est supprimé en cascade (ON DELETE CASCADE)
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  return { error };
}

// import { supabase } from '../lib/supabase';
// import type { Promotion } from '../types';

// export async function getPromotions(activeOnly = false) {
//   let query = supabase.from('promotions').select('*').order('created_at', { ascending: false });
//   if (activeOnly) query = query.eq('is_active', true);
//   const { data, error } = await query;
//   return { data: data as Promotion[] | null, error };
// }

// export async function createPromotion(promotion: Partial<Promotion>) {
//   const { data, error } = await supabase
//     .from('promotions')
//     .insert(promotion)
//     .select()
//     .maybeSingle();
//   return { data: data as Promotion | null, error };
// }

// export async function updatePromotion(id: string, promotion: Partial<Promotion>) {
//   const { data, error } = await supabase
//     .from('promotions')
//     .update(promotion)
//     .eq('id', id)
//     .select()
//     .maybeSingle();
//   return { data: data as Promotion | null, error };
// }

// export async function deletePromotion(id: string) {
//   const { error } = await supabase.from('promotions').delete().eq('id', id);
//   return { error };
// }
