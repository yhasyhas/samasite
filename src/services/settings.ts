import { supabase } from '../lib/supabase';
import type { SiteSettings } from '../types';

export async function getSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .maybeSingle();
  return { data: data as SiteSettings | null, error };
}

export async function updateSettings(settings: Partial<SiteSettings>) {
  const { data: existing } = await supabase.from('site_settings').select('id').maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('site_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .maybeSingle();
    return { data: data as SiteSettings | null, error };
  }

  const { data, error } = await supabase
    .from('site_settings')
    .insert(settings)
    .select()
    .maybeSingle();
  return { data: data as SiteSettings | null, error };
}
