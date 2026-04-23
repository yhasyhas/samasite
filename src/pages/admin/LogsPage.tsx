import React, { useEffect, useState, useCallback } from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { getActivityLogs } from '../../services/activityLogs';
import { Skeleton } from '../../components/ui/Skeleton';
import type { ActivityLog } from '../../types';

const ACTION_COLORS: Record<string, string> = {
  create: '#10b981',
  update: '#3b82f6',
  delete: '#ef4444',
  login: '#8b5cf6',
  logout: '#64748b',
  status_change: '#f59e0b',
  export: '#06b6d4',
  theme_change: '#ec4899',
};

export function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await getActivityLogs(PAGE_SIZE, page * PAGE_SIZE);
    setLogs(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Journaux d'activité</h1>
          <p className="text-sm text-slate-500 mt-0.5">Suivi des actions admin en temps réel</p>
        </div>
        <div className="text-sm text-slate-500">{total} total entries</div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Action</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Entité</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Utilisateur</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Détails</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                ))
              : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white capitalize"
                        style={{ backgroundColor: ACTION_COLORS[log.action] || '#64748b' }}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-slate-700">{log.entity_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 text-xs">{log.profile?.full_name || log.profile?.email || 'System'}</p>
                      {log.profile?.role && (
                        <p className="text-xs text-slate-400 capitalize">{log.profile.role.replace(/_/g, ' ')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 font-mono">
                        {Object.keys(log.details || {}).length > 0
                          ? Object.entries(log.details)
                              .slice(0, 2)
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(', ')
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && logs.length === 0 && (
          <div className="text-center py-16">
            <Activity size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 font-medium">Aucun journal d'activité pour le moment</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Affichage de {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm text-slate-600">Page {page + 1} de {totalPages}</span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
