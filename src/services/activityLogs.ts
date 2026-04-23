import { supabase } from '../lib/supabase';
import type { ActivityLog } from '../types';

export async function logActivity(log: {
  action: ActivityLog['action'];
  entity_type: ActivityLog['entity_type'];
  entity_id?: string;
  details?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: log.action,
    entity_type: log.entity_type,
    entity_id: log.entity_id || null,
    details: log.details || {},
  });
}

export async function getActivityLogs(limit = 50, offset = 0) {
  const { data, error, count } = await supabase
    .from('activity_logs')
    .select('*, profile:profiles(id,full_name,email,role)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  return { data: data as ActivityLog[] | null, error, count };
}
