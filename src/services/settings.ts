import { supabase } from '../lib/supabase';
import type { SiteSettings } from '../types';

export async function getSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .maybeSingle();
  
  if (error) {
    console.error('[getSettings] Erreur:', error);
  }
  
  return { data: data as SiteSettings | null, error };
}

export async function updateSettings(newSettings: Partial<SiteSettings>) {
  // 1. On récupère l'ID de la ligne existante
  const { data: existing } = await supabase
    .from('site_settings')
    .select('id')
    .maybeSingle();

  // 2. Si une ligne existe → UPDATE forcé (single() détecte si 0 row touché)
  if (existing?.id) {
    const { data, error } = await supabase
      .from('site_settings')
      .update({ ...newSettings, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single(); // ⚠️ .single() = erreur explicite si RLS bloque ou si 0 row

    if (error) {
      console.error('[updateSettings] Update error:', error);
      return { data: null, error };
    }

    return { data: data as SiteSettings, error: null };
  }

  // 3. Si aucune ligne → INSERT (création première fois)
  const { data, error } = await supabase
    .from('site_settings')
    .insert({ ...newSettings })
    .select()
    .single();

  if (error) {
    console.error('[updateSettings] Insert error:', error);
    return { data: null, error };
  }

  return { data: data as SiteSettings, error: null };
}

// import { supabase } from '../lib/supabase';
// import type { SiteSettings } from '../types';

// export async function getSettings() {
//   const { data, error } = await supabase
//     .from('site_settings')
//     .select('*')
//     .maybeSingle();
//   return { data: data as SiteSettings | null, error };
// }

// export async function updateSettings(settings: Partial<SiteSettings>) {
//   const { data: existing } = await supabase.from('site_settings').select('id').maybeSingle();

//   if (existing) {
//     const { data, error } = await supabase
//       .from('site_settings')
//       .update({ ...settings, updated_at: new Date().toISOString() })
//       .eq('id', existing.id)
//       .select()
//       .maybeSingle();
//     return { data: data as SiteSettings | null, error };
//   }

//   const { data, error } = await supabase
//     .from('site_settings')
//     .insert(settings)
//     .select()
//     .maybeSingle();
//   return { data: data as SiteSettings | null, error };
// }
