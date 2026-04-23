import { supabase } from '../lib/supabase';
import type { Promotion } from '../types';

/* ============================================================
   HELPERS INTERNES : Application / Restauration des prix
   ============================================================ */

async function getAffectedProductIds(
  applicableTo: string,
  productIds?: string[],
  categoryIds?: string[]
): Promise<string[]> {
  if (applicableTo === 'specific_products' && productIds?.length) {
    return productIds;
  }
  if (applicableTo === 'specific_categories' && categoryIds?.length) {
    const { data } = await supabase
      .from('products')
      .select('id')
      .in('category_id', categoryIds)
      .eq('is_active', true);
    return data?.map((p) => p.id) || [];
  }
  if (applicableTo === 'all') {
    const { data } = await supabase
      .from('products')
      .select('id')
      .eq('is_active', true);
    return data?.map((p) => p.id) || [];
  }
  return [];
}

async function applyDiscountToProducts(
  productIds: string[],
  type: 'percentage' | 'fixed_amount',
  value: number
) {
  if (!productIds.length) return;

  const { data: products } = await supabase
    .from('products')
    .select('id, price, compare_at_price')
    .in('id', productIds);

  if (!products?.length) return;

  for (const p of products) {
    const basePrice = p.compare_at_price ?? p.price;
    let newPrice: number;

    if (type === 'percentage') {
      newPrice = Math.round(basePrice * (1 - value / 100));
    } else {
      newPrice = Math.max(0, basePrice - value);
    }

    // Si pas encore de prix de référence, on le crée à partir du prix actuel
    const newCompareAt = p.compare_at_price ?? p.price;

    await supabase
      .from('products')
      .update({ price: newPrice, compare_at_price: newCompareAt })
      .eq('id', p.id);
  }
}

async function restoreProductPrices(productIds: string[]) {
  if (!productIds.length) return;

  const { data: products } = await supabase
    .from('products')
    .select('id, price, compare_at_price')
    .in('id', productIds);

  if (!products?.length) return;

  for (const p of products) {
    if (p.compare_at_price) {
      await supabase
        .from('products')
        .update({ price: p.compare_at_price, compare_at_price: null })
        .eq('id', p.id);
    }
  }
}

function isCurrentlyActive(promo: Partial<Promotion>): boolean {
  const now = new Date();
  const start = promo.starts_at ? new Date(promo.starts_at) : null;
  const end = promo.ends_at ? new Date(promo.ends_at) : null;
  return (
    promo.is_active !== false &&
    (!start || now >= start) &&
    (!end || now <= end)
  );
}

/* ============================================================
   CRUD PUBLIC
   ============================================================ */

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

  // Insertion des liens
  if (linkIds?.productIds?.length) {
    await supabase.from('promotion_links').insert(
      linkIds.productIds.map((pid) => ({ promotion_id: data.id, product_id: pid }))
    );
  }
  if (linkIds?.categoryIds?.length) {
    await supabase.from('promotion_links').insert(
      linkIds.categoryIds.map((cid) => ({ promotion_id: data.id, category_id: cid }))
    );
  }

  // Application automatique des prix si la promo est active maintenant
  if (isCurrentlyActive(data)) {
    const affectedIds = await getAffectedProductIds(
      data.applicable_to,
      linkIds?.productIds,
      linkIds?.categoryIds
    );
    await applyDiscountToProducts(affectedIds, data.type, data.value);
  }

  return { data: data as Promotion, error: null };
}

export async function updatePromotion(
  id: string,
  promotion: Partial<Promotion>,
  linkIds?: { productIds?: string[]; categoryIds?: string[] }
) {
  // 1. Récupérer l'ancienne promo pour restaurer les anciens prix
  const { data: oldPromo } = await supabase
    .from('promotions')
    .select('*, links:promotion_links(*)')
    .eq('id', id)
    .maybeSingle();

  if (oldPromo) {
    const oldProductIds =
      oldPromo.links?.filter((l: any) => l.product_id).map((l: any) => l.product_id) || [];
    const oldCategoryIds =
      oldPromo.links?.filter((l: any) => l.category_id).map((l: any) => l.category_id) || [];
    const oldAffectedIds = await getAffectedProductIds(
      oldPromo.applicable_to,
      oldProductIds,
      oldCategoryIds
    );
    await restoreProductPrices(oldAffectedIds);
  }

  // 2. Mettre à jour la promo
  const { data, error } = await supabase
    .from('promotions')
    .update(promotion)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error || !data) return { data: null, error };

  // 3. Recréer les liens
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

  // 4. Réappliquer les nouveaux prix si la promo reste active
  if (isCurrentlyActive(data)) {
    const newAffectedIds = await getAffectedProductIds(
      data.applicable_to,
      linkIds?.productIds,
      linkIds?.categoryIds
    );
    await applyDiscountToProducts(newAffectedIds, data.type, data.value);
  }

  return { data: data as Promotion, error: null };
}

export async function deletePromotion(id: string) {
  // 1. Récupérer les infos avant suppression pour restaurer les prix
  const { data: promo } = await supabase
    .from('promotions')
    .select('*, links:promotion_links(*)')
    .eq('id', id)
    .maybeSingle();

  const productIds =
    promo?.links?.filter((l: any) => l.product_id).map((l: any) => l.product_id) || [];
  const categoryIds =
    promo?.links?.filter((l: any) => l.category_id).map((l: any) => l.category_id) || [];
  const affectedIds = await getAffectedProductIds(
    promo?.applicable_to || 'all',
    productIds,
    categoryIds
  );

  // 2. Supprimer (cascade sur promotion_links)
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) return { error };

  // 3. Restaurer les prix de base
  await restoreProductPrices(affectedIds);

  return { error: null };
}

// import { supabase } from '../lib/supabase';
// import type { Promotion } from '../types';

// export async function getPromotions(activeOnly = false) {
//   const { data, error } = await supabase
//     .from('promotions')
//     .select('*, links:promotion_links(*, product:products(id,name), category:categories(id,name))')
//     .order('created_at', { ascending: false });

//   if (error) return { data: null, error };

//   const typedData = data as (Promotion & { links?: any[] })[] | null;

//   if (activeOnly && typedData) {
//     const now = new Date();
//     return {
//       data: typedData.filter((p) => {
//         if (!p.is_active) return false;
//         if (p.starts_at && new Date(p.starts_at) > now) return false;
//         if (p.ends_at && new Date(p.ends_at) < now) return false;
//         return true;
//       }),
//       error,
//     };
//   }
//   return { data: typedData, error };
// }

// export async function createPromotion(
//   promotion: Partial<Promotion>,
//   linkIds?: { productIds?: string[]; categoryIds?: string[] }
// ) {
//   const { data, error } = await supabase
//     .from('promotions')
//     .insert(promotion)
//     .select()
//     .maybeSingle();

//   if (error || !data) return { data: null, error };

//   // Insertion des liens promotion ↔ produits
//   if (linkIds?.productIds?.length) {
//     await supabase.from('promotion_links').insert(
//       linkIds.productIds.map((pid) => ({ promotion_id: data.id, product_id: pid }))
//     );
//   }
//   // Insertion des liens promotion ↔ catégories
//   if (linkIds?.categoryIds?.length) {
//     await supabase.from('promotion_links').insert(
//       linkIds.categoryIds.map((cid) => ({ promotion_id: data.id, category_id: cid }))
//     );
//   }

//   return { data: data as Promotion, error: null };
// }

// export async function updatePromotion(
//   id: string,
//   promotion: Partial<Promotion>,
//   linkIds?: { productIds?: string[]; categoryIds?: string[] }
// ) {
//   const { data, error } = await supabase
//     .from('promotions')
//     .update(promotion)
//     .eq('id', id)
//     .select()
//     .maybeSingle();

//   if (error || !data) return { data: null, error };

//   // On supprime les anciens liens et on réinsère les nouveaux
//   await supabase.from('promotion_links').delete().eq('promotion_id', id);

//   if (linkIds?.productIds?.length) {
//     await supabase.from('promotion_links').insert(
//       linkIds.productIds.map((pid) => ({ promotion_id: id, product_id: pid }))
//     );
//   }
//   if (linkIds?.categoryIds?.length) {
//     await supabase.from('promotion_links').insert(
//       linkIds.categoryIds.map((cid) => ({ promotion_id: id, category_id: cid }))
//     );
//   }

//   return { data: data as Promotion, error: null };
// }

// export async function deletePromotion(id: string) {
//   // promotion_links est supprimé en cascade (ON DELETE CASCADE)
//   const { error } = await supabase.from('promotions').delete().eq('id', id);
//   return { error };
// }

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
