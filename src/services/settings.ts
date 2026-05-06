import { supabase } from '../lib/supabase';
import type { SiteSettings } from '../types';

export async function getSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.error('[getSettings] Erreur:', error);
  }
  
  return { data: data as SiteSettings | null, error };
}

export async function updateSettings(newSettings: Partial<SiteSettings>) {
  // 1. Récupère TOUTES les lignes (pas juste une)
  const { data: allRows } = await supabase
    .from('site_settings')
    .select('id')
    .order('updated_at', { ascending: false });

  // 2. S'il y a plusieurs lignes, on supprime les vieilles (garde la plus récente)
  if (allRows && allRows.length > 1) {
    const keepId = allRows[0].id;
    const idsToDelete = allRows.slice(1).map(r => r.id);
    
    await supabase
      .from('site_settings')
      .delete()
      .in('id', idsToDelete);
    
    console.warn('[updateSettings] Nettoyage de', idsToDelete.length, 'lignes dupliquées');
  }

  // 3. Update la ligne restante (ou insère si vide)
  const existingId = allRows?.[0]?.id;

  if (existingId) {
    const { data, error } = await supabase
      .from('site_settings')
      .update({ ...newSettings, updated_at: new Date().toISOString() })
      .eq('id', existingId)
      .select()
      .single();

    if (error) {
      console.error('[updateSettings] Update error:', error);
      return { data: null, error };
    }

    return { data: data as SiteSettings, error: null };
  }

  // 4. Aucune ligne → INSERT
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