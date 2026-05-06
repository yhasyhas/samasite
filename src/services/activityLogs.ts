import { supabase } from '../lib/supabase';
import type { ActivityLog } from '../types';

/* ============================================================
   FORMATTEUR DE DIFF (harmonisation)
   ============================================================ */

function formatDiffValue(val: unknown): string | number | boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Si c'est du HTML, on indique juste la longueur + aperçu texte
    if (val.includes('<') && val.includes('>')) {
      const textOnly = val.replace(/<[^>]*>/g, '').trim();
      return textOnly.length > 60 ? textOnly.slice(0, 60) + '...' : textOnly || '(HTML)';
    }
    return val.length > 100 ? val.slice(0, 100) + '...' : val;
  }
  if (Array.isArray(val)) {
    // Tableau d'images ou autre
    if (val.length === 0) return '0 élément';
    if (typeof val[0] === 'object' && val[0] !== null && 'url' in val[0]) {
      return `${val.length} image${val.length > 1 ? 's' : ''}`;
    }
    return `${val.length} élément${val.length > 1 ? 's' : ''}`;
  }
  if (typeof val === 'object') {
    return JSON.stringify(val).slice(0, 80) + (JSON.stringify(val).length > 80 ? '...' : '');
  }
  return String(val);
}

/* ============================================================
   LOG SIMPLE
   ============================================================ */

export async function logActivity(log: {
  action: ActivityLog['action'];
  entity_type: ActivityLog['entity_type'];
  entity_id?: string;
  details?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const enrichedDetails = {
    ...log.details,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    platform: typeof navigator !== 'undefined' ? navigator.platform : null,
    language: typeof navigator !== 'undefined' ? navigator.language : null,
  };

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: log.action,
    entity_type: log.entity_type,
    entity_id: log.entity_id || null,
    details: enrichedDetails,
  });
}

/* ============================================================
   LOG AVEC DIFF (avant / après) — HARMONISÉ
   ============================================================ */

// export async function logActivityWithDiff<T extends Record<string, unknown>>(
//   log: {
//     action: ActivityLog['action'];
//     entity_type: ActivityLog['entity_type'];
//     entity_id?: string;
//   },
//   before: T | null,
//   after: T | null,
//   sensitiveFields: string[] = ['password', 'token', 'secret', 'api_key']
// ) {
//   const diff: Record<string, { before: unknown; after: unknown }> = {};

//   if (before && after) {
//     const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
//     for (const key of allKeys) {
//       if (sensitiveFields.includes(key)) continue;
      
//       const beforeVal = before[key];
//       const afterVal = after[key];
      
//       if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
//         diff[key] = {
//           before: formatDiffValue(beforeVal),
//           after: formatDiffValue(afterVal),
//         };
//       }
//     }
//   }

//   return logActivity({
//     ...log,
//     details: {
//       diff: Object.keys(diff).length > 0 ? diff : undefined,
//       summary: Object.keys(diff).length > 0 
//         ? `Champs modifiés : ${Object.keys(diff).join(', ')}` 
//         : 'Aucun changement détecté',
//     },
//   });
// }

export async function logActivityWithDiff(
  log: {
    action: ActivityLog['action'];
    entity_type: ActivityLog['entity_type'];
    entity_id?: string;
  },
  before: object | null,
  after: object | null,
  sensitiveFields: string[] = ['password', 'token', 'secret', 'api_key']
) {
  const diff: Record<string, { before: unknown; after: unknown }> = {};

  const beforeRec = before as unknown as Record<string, unknown> | null;
  const afterRec = after as unknown as Record<string, unknown> | null;

  if (beforeRec && afterRec) {
    const allKeys = new Set([...Object.keys(beforeRec), ...Object.keys(afterRec)]);
    for (const key of allKeys) {
      if (sensitiveFields.includes(key)) continue;

      const beforeVal = beforeRec[key];
      const afterVal = afterRec[key];

      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        diff[key] = {
          before: formatDiffValue(beforeVal),
          after: formatDiffValue(afterVal),
        };
      }
    }
  }

  return logActivity({
    ...log,
    details: {
      diff: Object.keys(diff).length > 0 ? diff : undefined,
      summary: Object.keys(diff).length > 0
        ? `Champs modifiés : ${Object.keys(diff).join(', ')}`
        : 'Aucun changement détecté',
    },
  });
}

/* ============================================================
   GET LOGS (avec filtres avancés)
   ============================================================ */

export interface LogFilters {
  action?: string;
  entity_type?: string;
  user_id?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getActivityLogs(options?: {
  limit?: number;
  offset?: number;
  filters?: LogFilters;
}) {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from('activity_logs')
    .select('*, profile:profiles(id,full_name,email,role)', { count: 'exact' })
    .order('created_at', { ascending: false });

  const f = options?.filters;
  if (f?.action) query = query.eq('action', f.action);
  if (f?.entity_type) query = query.eq('entity_type', f.entity_type);
  if (f?.user_id) query = query.eq('user_id', f.user_id);
  if (f?.dateFrom) query = query.gte('created_at', `${f.dateFrom}T00:00:00`);
  if (f?.dateTo) query = query.lte('created_at', `${f.dateTo}T23:59:59`);
  if (f?.search?.trim()) {
    const s = f.search.trim();
    query = query.or(`action.ilike.%${s}%,entity_type.ilike.%${s}%,profile.full_name.ilike.%${s}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  return { data: data as ActivityLog[] | null, error, count };
}

/* ============================================================
   EXPORT CSV
   ============================================================ */

export function exportLogsToCSV(logs: ActivityLog[], filename = 'journal-activite.csv') {
  const headers = ['Date', 'Action', 'Entité', 'ID Entité', 'Utilisateur', 'Rôle', 'Détails'];
  const rows = logs.map((log) => [
    new Date(log.created_at).toLocaleString('fr-FR'),
    log.action,
    log.entity_type,
    log.entity_id || '',
    log.profile?.full_name || log.profile?.email || 'Système',
    log.profile?.role || '',
    JSON.stringify(log.details || {}),
  ]);

  const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const csv = [headers.join(';'), ...rows.map((r) => r.map((c) => escape(String(c))).join(';'))].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}