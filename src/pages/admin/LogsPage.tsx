import React, { useEffect, useState, useCallback } from 'react';
import { Activity, ChevronLeft, ChevronRight, Search, Download, Filter, X, Eye, Calendar, ArrowRight, Check, XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getActivityLogs, exportLogsToCSV, type LogFilters } from '../../services/activityLogs';
import { supabase } from '../../lib/supabase';
import { Skeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import type { ActivityLog } from '../../types';

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  create: { bg: '#dcfce7', text: '#15803d' },
  update: { bg: '#dbeafe', text: '#1d4ed8' },
  delete: { bg: '#fee2e2', text: '#b91c1c' },
  login: { bg: '#f3e8ff', text: '#7c3aed' },
  logout: { bg: '#f1f5f9', text: '#475569' },
  status_change: { bg: '#fef3c7', text: '#b45309' },
  export: { bg: '#ccfbf1', text: '#0f766e' },
  theme_change: { bg: '#fce7f3', text: '#be185d' },
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  login: 'Connexion',
  logout: 'Déconnexion',
  status_change: 'Changement statut',
  export: 'Export',
  theme_change: 'Thème',
};

const ENTITY_LABELS: Record<string, string> = {
  product: 'Produit',
  order: 'Commande',
  category: 'Catégorie',
  promotion: 'Promotion',
  user: 'Utilisateur',
  quote: 'Devis',
  setting: 'Paramètre',
};

/* ============================================================
   RENDU HARMONISÉ DES VALEURS DE DIFF
   ============================================================ */

function DiffValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="italic text-slate-300 text-xs">(vide)</span>;
  }
  if (typeof value === 'boolean') {
    return value
      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-semibold"><Check size={10} /> Oui</span>
      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold"><XIcon size={10} /> Non</span>;
  }
  if (typeof value === 'number') {
    return <span className="font-mono text-slate-700 text-xs">{value.toLocaleString('fr-FR')}</span>;
  }
  if (typeof value === 'string') {
    // Si c'est une indication d'images
    if (value.includes('image') || value.includes('élément')) {
      return <span className="text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded">{value}</span>;
    }
    // Texte normal
    if (value.length > 80) {
      return <span className="text-xs text-slate-600" title={value}>{value.slice(0, 80)}...</span>;
    }
    return <span className="text-xs text-slate-700">{value}</span>;
  }
  return <span className="text-xs text-slate-500 font-mono">{JSON.stringify(value).slice(0, 60)}</span>;
}

export function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<LogFilters>({});
  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await getActivityLogs({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      filters,
    });
    setLogs(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('activity_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleExport = () => {
    if (logs.length === 0) return;
    exportLogsToCSV(logs, `journal-activite-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const handleExportAll = async () => {
    const { data } = await getActivityLogs({ limit: 1000, offset: 0, filters });
    if (data && data.length > 0) {
      exportLogsToCSV(data, `journal-activite-complet-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    }
  };

  const todayCount = logs.filter(
    (l) => new Date(l.created_at).toDateString() === new Date().toDateString()
  ).length;

  const actionBreakdown = logs.slice(0, 10).reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const FilterBadge = ({ label, onClear }: { label: string; onClear: () => void }) => (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-xs text-slate-700">
      {label}
      <button onClick={onClear} className="hover:text-red-600"><X size={12} /></button>
    </span>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Journaux d'activité</h1>
          <p className="text-sm text-slate-500 mt-0.5">Suivi des actions admin en temps réel</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm transition-colors ${showFilters ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <Filter size={14} /> Filtres
          </button>
          <button onClick={handleExport} disabled={logs.length === 0} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-40">
            <Download size={14} /> Exporter page
          </button>
          <button onClick={handleExportAll} className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm hover:bg-slate-800 transition-colors">
            <Download size={14} /> Exporter tout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-500 mb-1">Total enregistré</p>
          <p className="text-xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-500 mb-1">Actions aujourd'hui</p>
          <p className="text-xl font-bold text-slate-900">{todayCount}</p>
        </div>
        {Object.entries(actionBreakdown).slice(0, 2).map(([action, count]) => (
          <div key={action} className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-xs text-slate-500 mb-1">{ACTION_LABELS[action] || action}</p>
            <p className="text-xl font-bold" style={{ color: ACTION_COLORS[action]?.text || '#64748b' }}>{count}</p>
          </div>
        ))}
      </div>

      {/* Active filters */}
      {(filters.action || filters.entity_type || filters.search || filters.dateFrom || filters.dateTo) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">Filtres actifs :</span>
          {filters.action && <FilterBadge label={`Action: ${ACTION_LABELS[filters.action] || filters.action}`} onClear={() => setFilters({ ...filters, action: undefined })} />}
          {filters.entity_type && <FilterBadge label={`Entité: ${ENTITY_LABELS[filters.entity_type] || filters.entity_type}`} onClear={() => setFilters({ ...filters, entity_type: undefined })} />}
          {filters.search && <FilterBadge label={`Recherche: ${filters.search}`} onClear={() => setFilters({ ...filters, search: undefined })} />}
          {filters.dateFrom && <FilterBadge label={`Du: ${filters.dateFrom}`} onClear={() => setFilters({ ...filters, dateFrom: undefined })} />}
          {filters.dateTo && <FilterBadge label={`Au: ${filters.dateTo}`} onClear={() => setFilters({ ...filters, dateTo: undefined })} />}
          <button onClick={() => { setFilters({}); setPage(0); }} className="text-xs text-red-600 hover:underline ml-auto">Tout effacer</button>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Action</label>
            <select value={filters.action || ''} onChange={(e) => { setPage(0); setFilters({ ...filters, action: e.target.value || undefined }); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
              <option value="">Toutes</option>
              {Object.keys(ACTION_LABELS).map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Entité</label>
            <select value={filters.entity_type || ''} onChange={(e) => { setPage(0); setFilters({ ...filters, entity_type: e.target.value || undefined }); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
              <option value="">Toutes</option>
              {Object.keys(ENTITY_LABELS).map((e) => <option key={e} value={e}>{ENTITY_LABELS[e]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Recherche</label>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={filters.search || ''} onChange={(e) => { setPage(0); setFilters({ ...filters, search: e.target.value || undefined }); }} placeholder="Action, entité, utilisateur..." className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Date début</label>
            <input type="date" value={filters.dateFrom || ''} onChange={(e) => { setPage(0); setFilters({ ...filters, dateFrom: e.target.value || undefined }); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Date fin</label>
            <input type="date" value={filters.dateTo || ''} onChange={(e) => { setPage(0); setFilters({ ...filters, dateTo: e.target.value || undefined }); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Action</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Entité</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Utilisateur</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Date</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Détail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                ))
              : logs.map((log) => {
                  const style = ACTION_COLORS[log.action] || { bg: '#f1f5f9', text: '#64748b' };
                  const hasDiff = !!log.details?.diff && Object.keys(log.details.diff as object).length > 0;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize" style={{ backgroundColor: style.bg, color: style.text }}>
                          {ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-slate-700 font-medium">{ENTITY_LABELS[log.entity_type] || log.entity_type}</span>
                        {log.entity_id && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{log.entity_id.slice(0, 8)}...</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 text-xs">{log.profile?.full_name || log.profile?.email || 'Système'}</p>
                        {log.profile?.role && <p className="text-[10px] text-slate-400 capitalize">{log.profile.role.replace(/_/g, ' ')}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1"><Calendar size={10} />{format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasDiff && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">Modifié</span>}
                          <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Eye size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!loading && logs.length === 0 && (
          <div className="text-center py-16">
            <Activity size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 font-medium">Aucun journal d'activité pour le moment</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">Affichage de {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} sur {total}</p>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all"><ChevronLeft size={14} /></button>
            <span className="text-sm text-slate-600">Page {page + 1} sur {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Détail de l'action" size="lg">
        {selectedLog && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize" style={{ backgroundColor: ACTION_COLORS[selectedLog.action]?.bg || '#f1f5f9', color: ACTION_COLORS[selectedLog.action]?.text || '#64748b' }}>
                {ACTION_LABELS[selectedLog.action] || selectedLog.action}
              </span>
              <span className="text-sm text-slate-500">{format(new Date(selectedLog.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Entité</p>
                <p className="font-medium text-slate-900">{ENTITY_LABELS[selectedLog.entity_type] || selectedLog.entity_type}</p>
                {selectedLog.entity_id && <p className="text-[10px] font-mono text-slate-400 mt-0.5">{selectedLog.entity_id}</p>}
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Utilisateur</p>
                <p className="font-medium text-slate-900">{selectedLog.profile?.full_name || 'Système'}</p>
                <p className="text-[10px] text-slate-400">{selectedLog.profile?.email}</p>
              </div>
            </div>

            {/* DIFF TABLE HARMONISÉ */}
            {selectedLog.details?.diff && Object.keys(selectedLog.details.diff as object).length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <ArrowRight size={13} className="text-amber-500" />
                  Changements détectés
                </p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-3 py-2 font-semibold text-slate-600 w-1/4">Champ</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600 w-3/8">Avant</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600 w-3/8">Après</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(selectedLog.details.diff as Record<string, { before: unknown; after: unknown }>).map(([key, val]) => (
                        <tr key={key}>
                          <td className="px-3 py-2.5 font-medium text-slate-700 capitalize align-top">{key.replace(/_/g, ' ')}</td>
                          <td className="px-3 py-2.5 align-top bg-red-50/30">
                            <DiffValue value={val.before} />
                          </td>
                          <td className="px-3 py-2.5 align-top bg-green-50/30">
                            <DiffValue value={val.after} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Détails (JSON)</p>
                <pre className="bg-slate-900 text-slate-300 text-xs p-4 rounded-xl overflow-x-auto">{JSON.stringify(selectedLog.details || {}, null, 2)}</pre>
              </div>
            )}

            {selectedLog.details?.user_agent && (
              <div className="text-xs text-slate-400 border-t border-slate-100 pt-3">
                <p>User-Agent : {String(selectedLog.details.user_agent)}</p>
                <p>Platform : {String(selectedLog.details.platform)}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// import React, { useEffect, useState, useCallback } from 'react';
// import { Activity, ChevronLeft, ChevronRight, Search, Download, Filter, X, Eye, Calendar, ArrowRight } from 'lucide-react';
// import { format } from 'date-fns';
// import { fr } from 'date-fns/locale';
// import { getActivityLogs, exportLogsToCSV, type LogFilters } from '../../services/activityLogs';
// import { supabase } from '../../lib/supabase';
// import { Skeleton } from '../../components/ui/Skeleton';
// import { Modal } from '../../components/ui/Modal';
// import type { ActivityLog } from '../../types';

// const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
//   create: { bg: '#dcfce7', text: '#15803d' },
//   update: { bg: '#dbeafe', text: '#1d4ed8' },
//   delete: { bg: '#fee2e2', text: '#b91c1c' },
//   login: { bg: '#f3e8ff', text: '#7c3aed' },
//   logout: { bg: '#f1f5f9', text: '#475569' },
//   status_change: { bg: '#fef3c7', text: '#b45309' },
//   export: { bg: '#ccfbf1', text: '#0f766e' },
//   theme_change: { bg: '#fce7f3', text: '#be185d' },
// };

// const ACTION_LABELS: Record<string, string> = {
//   create: 'Création',
//   update: 'Modification',
//   delete: 'Suppression',
//   login: 'Connexion',
//   logout: 'Déconnexion',
//   status_change: 'Changement statut',
//   export: 'Export',
//   theme_change: 'Thème',
// };

// const ENTITY_LABELS: Record<string, string> = {
//   product: 'Produit',
//   order: 'Commande',
//   category: 'Catégorie',
//   promotion: 'Promotion',
//   user: 'Utilisateur',
//   quote: 'Devis',
//   setting: 'Paramètre',
// };

// export function LogsPage() {
//   const [logs, setLogs] = useState<ActivityLog[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(0);
//   const [total, setTotal] = useState(0);
//   const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
//   const [showFilters, setShowFilters] = useState(false);

//   const [filters, setFilters] = useState<LogFilters>({});
//   const PAGE_SIZE = 25;

//   const load = useCallback(async () => {
//     setLoading(true);
//     const { data, count } = await getActivityLogs({
//       limit: PAGE_SIZE,
//       offset: page * PAGE_SIZE,
//       filters,
//     });
//     setLogs(data || []);
//     setTotal(count || 0);
//     setLoading(false);
//   }, [page, filters]);

//   useEffect(() => { load(); }, [load]);

//   useEffect(() => {
//     const channel = supabase
//       .channel('activity_logs_realtime')
//       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => { load(); })
//       .subscribe();
//     return () => { supabase.removeChannel(channel); };
//   }, [load]);

//   const totalPages = Math.ceil(total / PAGE_SIZE);

//   const handleExport = () => {
//     if (logs.length === 0) return;
//     exportLogsToCSV(logs, `journal-activite-${format(new Date(), 'yyyy-MM-dd')}.csv`);
//   };

//   const handleExportAll = async () => {
//     const { data } = await getActivityLogs({ limit: 1000, offset: 0, filters });
//     if (data && data.length > 0) {
//       exportLogsToCSV(data, `journal-activite-complet-${format(new Date(), 'yyyy-MM-dd')}.csv`);
//     }
//   };

//   const todayCount = logs.filter(
//     (l) => new Date(l.created_at).toDateString() === new Date().toDateString()
//   ).length;

//   const actionBreakdown = logs.slice(0, 10).reduce((acc, log) => {
//     acc[log.action] = (acc[log.action] || 0) + 1;
//     return acc;
//   }, {} as Record<string, number>);

//   const FilterBadge = ({ label, onClear }: { label: string; onClear: () => void }) => (
//     <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-xs text-slate-700">
//       {label}
//       <button onClick={onClear} className="hover:text-red-600"><X size={12} /></button>
//     </span>
//   );

//   return (
//     <div className="p-6">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Journaux d'activité</h1>
//           <p className="text-sm text-slate-500 mt-0.5">Suivi des actions admin en temps réel</p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => setShowFilters(!showFilters)}
//             className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm transition-colors ${showFilters ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'}`}
//           >
//             <Filter size={14} /> Filtres
//           </button>
//           <button onClick={handleExport} disabled={logs.length === 0} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-40">
//             <Download size={14} /> Exporter page
//           </button>
//           <button onClick={handleExportAll} className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm hover:bg-slate-800 transition-colors">
//             <Download size={14} /> Exporter tout
//           </button>
//         </div>
//       </div>

//       {/* Stats */}
//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
//         <div className="bg-white rounded-xl border border-slate-200 p-3">
//           <p className="text-xs text-slate-500 mb-1">Total enregistré</p>
//           <p className="text-xl font-bold text-slate-900">{total}</p>
//         </div>
//         <div className="bg-white rounded-xl border border-slate-200 p-3">
//           <p className="text-xs text-slate-500 mb-1">Actions aujourd'hui</p>
//           <p className="text-xl font-bold text-slate-900">{todayCount}</p>
//         </div>
//         {Object.entries(actionBreakdown).slice(0, 2).map(([action, count]) => (
//           <div key={action} className="bg-white rounded-xl border border-slate-200 p-3">
//             <p className="text-xs text-slate-500 mb-1">{ACTION_LABELS[action] || action}</p>
//             <p className="text-xl font-bold" style={{ color: ACTION_COLORS[action]?.text || '#64748b' }}>{count}</p>
//           </div>
//         ))}
//       </div>

//       {/* Active filters */}
//       {(filters.action || filters.entity_type || filters.search || filters.dateFrom || filters.dateTo) && (
//         <div className="flex flex-wrap items-center gap-2 mb-4">
//           <span className="text-xs text-slate-500">Filtres actifs :</span>
//           {filters.action && <FilterBadge label={`Action: ${ACTION_LABELS[filters.action] || filters.action}`} onClear={() => setFilters({ ...filters, action: undefined })} />}
//           {filters.entity_type && <FilterBadge label={`Entité: ${ENTITY_LABELS[filters.entity_type] || filters.entity_type}`} onClear={() => setFilters({ ...filters, entity_type: undefined })} />}
//           {filters.search && <FilterBadge label={`Recherche: ${filters.search}`} onClear={() => setFilters({ ...filters, search: undefined })} />}
//           {filters.dateFrom && <FilterBadge label={`Du: ${filters.dateFrom}`} onClear={() => setFilters({ ...filters, dateFrom: undefined })} />}
//           {filters.dateTo && <FilterBadge label={`Au: ${filters.dateTo}`} onClear={() => setFilters({ ...filters, dateTo: undefined })} />}
//           <button onClick={() => { setFilters({}); setPage(0); }} className="text-xs text-red-600 hover:underline ml-auto">Tout effacer</button>
//         </div>
//       )}

//       {/* Filters panel */}
//       {showFilters && (
//         <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
//           <div>
//             <label className="text-xs font-medium text-slate-500 mb-1 block">Action</label>
//             <select value={filters.action || ''} onChange={(e) => { setPage(0); setFilters({ ...filters, action: e.target.value || undefined }); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
//               <option value="">Toutes</option>
//               {Object.keys(ACTION_LABELS).map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
//             </select>
//           </div>
//           <div>
//             <label className="text-xs font-medium text-slate-500 mb-1 block">Entité</label>
//             <select value={filters.entity_type || ''} onChange={(e) => { setPage(0); setFilters({ ...filters, entity_type: e.target.value || undefined }); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
//               <option value="">Toutes</option>
//               {Object.keys(ENTITY_LABELS).map((e) => <option key={e} value={e}>{ENTITY_LABELS[e]}</option>)}
//             </select>
//           </div>
//           <div>
//             <label className="text-xs font-medium text-slate-500 mb-1 block">Recherche</label>
//             <div className="relative">
//               <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
//               <input type="text" value={filters.search || ''} onChange={(e) => { setPage(0); setFilters({ ...filters, search: e.target.value || undefined }); }} placeholder="Action, entité, utilisateur..." className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
//             </div>
//           </div>
//           <div>
//             <label className="text-xs font-medium text-slate-500 mb-1 block">Date début</label>
//             <input type="date" value={filters.dateFrom || ''} onChange={(e) => { setPage(0); setFilters({ ...filters, dateFrom: e.target.value || undefined }); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//           </div>
//           <div>
//             <label className="text-xs font-medium text-slate-500 mb-1 block">Date fin</label>
//             <input type="date" value={filters.dateTo || ''} onChange={(e) => { setPage(0); setFilters({ ...filters, dateTo: e.target.value || undefined }); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//           </div>
//         </div>
//       )}

//       {/* Table */}
//       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//         <table className="w-full text-sm">
//           <thead>
//             <tr className="border-b border-slate-100 bg-slate-50">
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Action</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Entité</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Utilisateur</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Date</th>
//               <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Détail</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {loading
//               ? Array.from({ length: 10 }).map((_, i) => (
//                   <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
//                 ))
//               : logs.map((log) => {
//                   const style = ACTION_COLORS[log.action] || { bg: '#f1f5f9', text: '#64748b' };
//                   const hasDiff = !!log.details?.diff && Object.keys(log.details.diff as object).length > 0;
//                   return (
//                     <tr key={log.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
//                       <td className="px-4 py-3">
//                         <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize" style={{ backgroundColor: style.bg, color: style.text }}>
//                           {ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3">
//                         <span className="capitalize text-slate-700 font-medium">{ENTITY_LABELS[log.entity_type] || log.entity_type}</span>
//                         {log.entity_id && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{log.entity_id.slice(0, 8)}...</p>}
//                       </td>
//                       <td className="px-4 py-3">
//                         <p className="font-medium text-slate-900 text-xs">{log.profile?.full_name || log.profile?.email || 'Système'}</p>
//                         {log.profile?.role && <p className="text-[10px] text-slate-400 capitalize">{log.profile.role.replace(/_/g, ' ')}</p>}
//                       </td>
//                       <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
//                         <div className="flex items-center gap-1"><Calendar size={10} />{format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</div>
//                       </td>
//                       <td className="px-4 py-3 text-right">
//                         <div className="flex items-center justify-end gap-2">
//                           {hasDiff && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">Modifié</span>}
//                           <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Eye size={14} /></button>
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })}
//           </tbody>
//         </table>
//         {!loading && logs.length === 0 && (
//           <div className="text-center py-16">
//             <Activity size={36} className="mx-auto mb-3 text-slate-200" />
//             <p className="text-slate-500 font-medium">Aucun journal d'activité pour le moment</p>
//           </div>
//         )}
//       </div>

//       {/* Pagination */}
//       {totalPages > 1 && (
//         <div className="flex items-center justify-between mt-4">
//           <p className="text-sm text-slate-500">Affichage de {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} sur {total}</p>
//           <div className="flex items-center gap-2">
//             <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all"><ChevronLeft size={14} /></button>
//             <span className="text-sm text-slate-600">Page {page + 1} sur {totalPages}</span>
//             <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all"><ChevronRight size={14} /></button>
//           </div>
//         </div>
//       )}

//       {/* Detail Modal */}
//       <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Détail de l'action" size="lg">
//         {selectedLog && (
//           <div className="space-y-4">
//             <div className="flex items-center gap-3">
//               <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize" style={{ backgroundColor: ACTION_COLORS[selectedLog.action]?.bg || '#f1f5f9', color: ACTION_COLORS[selectedLog.action]?.text || '#64748b' }}>
//                 {ACTION_LABELS[selectedLog.action] || selectedLog.action}
//               </span>
//               <span className="text-sm text-slate-500">{format(new Date(selectedLog.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</span>
//             </div>

//             <div className="grid grid-cols-2 gap-3 text-sm">
//               <div className="bg-slate-50 rounded-lg p-3">
//                 <p className="text-xs text-slate-500 mb-1">Entité</p>
//                 <p className="font-medium text-slate-900">{ENTITY_LABELS[selectedLog.entity_type] || selectedLog.entity_type}</p>
//                 {selectedLog.entity_id && <p className="text-[10px] font-mono text-slate-400 mt-0.5">{selectedLog.entity_id}</p>}
//               </div>
//               <div className="bg-slate-50 rounded-lg p-3">
//                 <p className="text-xs text-slate-500 mb-1">Utilisateur</p>
//                 <p className="font-medium text-slate-900">{selectedLog.profile?.full_name || 'Système'}</p>
//                 <p className="text-[10px] text-slate-400">{selectedLog.profile?.email}</p>
//               </div>
//             </div>

//             {/* DIFF TABLE */}
//             {selectedLog.details?.diff && Object.keys(selectedLog.details.diff as object).length > 0 ? (
//               <div>
//                 <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
//                   <ArrowRight size={13} className="text-amber-500" />
//                   Changements détectés
//                 </p>
//                 <div className="border border-slate-200 rounded-xl overflow-hidden">
//                   <table className="w-full text-xs">
//                     <thead>
//                       <tr className="bg-slate-50 border-b border-slate-200">
//                         <th className="text-left px-3 py-2 font-semibold text-slate-600">Champ</th>
//                         <th className="text-left px-3 py-2 font-semibold text-slate-600">Avant</th>
//                         <th className="text-left px-3 py-2 font-semibold text-slate-600">Après</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                       {Object.entries(selectedLog.details.diff as Record<string, { before: unknown; after: unknown }>).map(([key, val]) => (
//                         <tr key={key}>
//                           <td className="px-3 py-2 font-medium text-slate-700 capitalize">{key.replace(/_/g, ' ')}</td>
//                           <td className="px-3 py-2 text-slate-500 line-through decoration-red-400">
//                             {val.before === null || val.before === undefined || val.before === '' ? <span className="italic text-slate-300">(vide)</span> : String(val.before)}
//                           </td>
//                           <td className="px-3 py-2 text-slate-900 font-medium">
//                             {val.after === null || val.after === undefined || val.after === '' ? <span className="italic text-slate-300">(vide)</span> : String(val.after)}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             ) : (
//               <div>
//                 <p className="text-xs font-medium text-slate-500 mb-2">Détails (JSON)</p>
//                 <pre className="bg-slate-900 text-slate-300 text-xs p-4 rounded-xl overflow-x-auto">{JSON.stringify(selectedLog.details || {}, null, 2)}</pre>
//               </div>
//             )}

//             {selectedLog.details?.user_agent && (
//               <div className="text-xs text-slate-400 border-t border-slate-100 pt-3">
//                 <p>User-Agent : {String(selectedLog.details.user_agent)}</p>
//                 <p>Platform : {String(selectedLog.details.platform)}</p>
//               </div>
//             )}
//           </div>
//         )}
//       </Modal>
//     </div>
//   );
// }

// import React, { useEffect, useState, useCallback } from 'react';
// import { Activity, ChevronLeft, ChevronRight, Search, Download, Filter, X, Eye, Calendar } from 'lucide-react';
// import { format } from 'date-fns';
// import { fr } from 'date-fns/locale';
// import { getActivityLogs, exportLogsToCSV, type LogFilters } from '../../services/activityLogs';
// import { supabase } from '../../lib/supabase';
// import { Skeleton } from '../../components/ui/Skeleton';
// import { Modal } from '../../components/ui/Modal';
// import type { ActivityLog } from '../../types';

// const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
//   create: { bg: '#dcfce7', text: '#15803d' },
//   update: { bg: '#dbeafe', text: '#1d4ed8' },
//   delete: { bg: '#fee2e2', text: '#b91c1c' },
//   login: { bg: '#f3e8ff', text: '#7c3aed' },
//   logout: { bg: '#f1f5f9', text: '#475569' },
//   status_change: { bg: '#fef3c7', text: '#b45309' },
//   export: { bg: '#ccfbf1', text: '#0f766e' },
//   theme_change: { bg: '#fce7f3', text: '#be185d' },
// };

// const ACTION_LABELS: Record<string, string> = {
//   create: 'Création',
//   update: 'Modification',
//   delete: 'Suppression',
//   login: 'Connexion',
//   logout: 'Déconnexion',
//   status_change: 'Changement statut',
//   export: 'Export',
//   theme_change: 'Thème',
// };

// const ENTITY_LABELS: Record<string, string> = {
//   product: 'Produit',
//   order: 'Commande',
//   category: 'Catégorie',
//   promotion: 'Promotion',
//   user: 'Utilisateur',
//   quote: 'Devis',
//   setting: 'Paramètre',
// };

// export function LogsPage() {
//   const [logs, setLogs] = useState<ActivityLog[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(0);
//   const [total, setTotal] = useState(0);
//   const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
//   const [showFilters, setShowFilters] = useState(false);

//   const [filters, setFilters] = useState<LogFilters>({});
//   const PAGE_SIZE = 25;

//   const load = useCallback(async () => {
//     setLoading(true);
//     const { data, count } = await getActivityLogs({
//       limit: PAGE_SIZE,
//       offset: page * PAGE_SIZE,
//       filters,
//     });
//     setLogs(data || []);
//     setTotal(count || 0);
//     setLoading(false);
//   }, [page, filters]);

//   useEffect(() => { load(); }, [load]);

//   // Realtime auto-refresh
//   useEffect(() => {
//     const channel = supabase
//       .channel('activity_logs_realtime')
//       .on(
//         'postgres_changes',
//         { event: 'INSERT', schema: 'public', table: 'activity_logs' },
//         () => {
//           load();
//         }
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [load]);

//   const totalPages = Math.ceil(total / PAGE_SIZE);

//   const handleExport = () => {
//     if (logs.length === 0) return;
//     exportLogsToCSV(logs, `journal-activite-${format(new Date(), 'yyyy-MM-dd')}.csv`);
//   };

//   const handleExportAll = async () => {
//     const { data } = await getActivityLogs({ limit: 1000, offset: 0, filters });
//     if (data && data.length > 0) {
//       exportLogsToCSV(data, `journal-activite-complet-${format(new Date(), 'yyyy-MM-dd')}.csv`);
//     }
//   };

//   const todayCount = logs.filter(
//     (l) => new Date(l.created_at).toDateString() === new Date().toDateString()
//   ).length;

//   const actionBreakdown = logs.slice(0, 10).reduce((acc, log) => {
//     acc[log.action] = (acc[log.action] || 0) + 1;
//     return acc;
//   }, {} as Record<string, number>);

//   const FilterBadge = ({ label, onClear }: { label: string; onClear: () => void }) => (
//     <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-xs text-slate-700">
//       {label}
//       <button onClick={onClear} className="hover:text-red-600"><X size={12} /></button>
//     </span>
//   );

//   return (
//     <div className="p-6">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Journaux d'activité</h1>
//           <p className="text-sm text-slate-500 mt-0.5">Suivi des actions admin en temps réel</p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => setShowFilters(!showFilters)}
//             className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm transition-colors ${
//               showFilters ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'
//             }`}
//           >
//             <Filter size={14} />
//             Filtres
//           </button>
//           <button
//             onClick={handleExport}
//             disabled={logs.length === 0}
//             className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-40"
//           >
//             <Download size={14} />
//             Exporter page
//           </button>
//           <button
//             onClick={handleExportAll}
//             className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm hover:bg-slate-800 transition-colors"
//           >
//             <Download size={14} />
//             Exporter tout
//           </button>
//         </div>
//       </div>

//       {/* Stats mini cards */}
//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
//         <div className="bg-white rounded-xl border border-slate-200 p-3">
//           <p className="text-xs text-slate-500 mb-1">Total enregistré</p>
//           <p className="text-xl font-bold text-slate-900">{total}</p>
//         </div>
//         <div className="bg-white rounded-xl border border-slate-200 p-3">
//           <p className="text-xs text-slate-500 mb-1">Actions aujourd'hui</p>
//           <p className="text-xl font-bold text-slate-900">{todayCount}</p>
//         </div>
//         {Object.entries(actionBreakdown).slice(0, 2).map(([action, count]) => (
//           <div key={action} className="bg-white rounded-xl border border-slate-200 p-3">
//             <p className="text-xs text-slate-500 mb-1">{ACTION_LABELS[action] || action}</p>
//             <p className="text-xl font-bold" style={{ color: ACTION_COLORS[action]?.text || '#64748b' }}>
//               {count}
//             </p>
//           </div>
//         ))}
//       </div>

//       {/* Active filters display */}
//       {(filters.action || filters.entity_type || filters.search || filters.dateFrom || filters.dateTo) && (
//         <div className="flex flex-wrap items-center gap-2 mb-4">
//           <span className="text-xs text-slate-500">Filtres actifs :</span>
//           {filters.action && (
//             <FilterBadge label={`Action: ${ACTION_LABELS[filters.action] || filters.action}`} onClear={() => setFilters({ ...filters, action: undefined })} />
//           )}
//           {filters.entity_type && (
//             <FilterBadge label={`Entité: ${ENTITY_LABELS[filters.entity_type] || filters.entity_type}`} onClear={() => setFilters({ ...filters, entity_type: undefined })} />
//           )}
//           {filters.search && (
//             <FilterBadge label={`Recherche: ${filters.search}`} onClear={() => setFilters({ ...filters, search: undefined })} />
//           )}
//           {filters.dateFrom && (
//             <FilterBadge label={`Du: ${filters.dateFrom}`} onClear={() => setFilters({ ...filters, dateFrom: undefined })} />
//           )}
//           {filters.dateTo && (
//             <FilterBadge label={`Au: ${filters.dateTo}`} onClear={() => setFilters({ ...filters, dateTo: undefined })} />
//           )}
//           <button
//             onClick={() => { setFilters({}); setPage(0); }}
//             className="text-xs text-red-600 hover:underline ml-auto"
//           >
//             Tout effacer
//           </button>
//         </div>
//       )}

//       {/* Filters panel */}
//       {showFilters && (
//         <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
//           <div>
//             <label className="text-xs font-medium text-slate-500 mb-1 block">Action</label>
//             <select
//               value={filters.action || ''}
//               onChange={(e) => { setPage(0); setFilters({ ...filters, action: e.target.value || undefined }); }}
//               className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
//             >
//               <option value="">Toutes</option>
//               {Object.keys(ACTION_LABELS).map((a) => (
//                 <option key={a} value={a}>{ACTION_LABELS[a]}</option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="text-xs font-medium text-slate-500 mb-1 block">Entité</label>
//             <select
//               value={filters.entity_type || ''}
//               onChange={(e) => { setPage(0); setFilters({ ...filters, entity_type: e.target.value || undefined }); }}
//               className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
//             >
//               <option value="">Toutes</option>
//               {Object.keys(ENTITY_LABELS).map((e) => (
//                 <option key={e} value={e}>{ENTITY_LABELS[e]}</option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="text-xs font-medium text-slate-500 mb-1 block">Recherche</label>
//             <div className="relative">
//               <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
//               <input
//                 type="text"
//                 value={filters.search || ''}
//                 onChange={(e) => { setPage(0); setFilters({ ...filters, search: e.target.value || undefined }); }}
//                 placeholder="Action, entité, utilisateur..."
//                 className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2"
//               />
//             </div>
//           </div>
//           <div>
//             <label className="text-xs font-medium text-slate-500 mb-1 block">Date début</label>
//             <input
//               type="date"
//               value={filters.dateFrom || ''}
//               onChange={(e) => { setPage(0); setFilters({ ...filters, dateFrom: e.target.value || undefined }); }}
//               className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
//             />
//           </div>
//           <div>
//             <label className="text-xs font-medium text-slate-500 mb-1 block">Date fin</label>
//             <input
//               type="date"
//               value={filters.dateTo || ''}
//               onChange={(e) => { setPage(0); setFilters({ ...filters, dateTo: e.target.value || undefined }); }}
//               className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
//             />
//           </div>
//         </div>
//       )}

//       {/* Table */}
//       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//         <table className="w-full text-sm">
//           <thead>
//             <tr className="border-b border-slate-100 bg-slate-50">
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Action</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Entité</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Utilisateur</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Date</th>
//               <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Détail</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {loading
//               ? Array.from({ length: 10 }).map((_, i) => (
//                   <tr key={i}>
//                     {Array.from({ length: 5 }).map((_, j) => (
//                       <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
//                     ))}
//                   </tr>
//                 ))
//               : logs.map((log) => {
//                   const style = ACTION_COLORS[log.action] || { bg: '#f1f5f9', text: '#64748b' };
//                   return (
//                     <tr key={log.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
//                       <td className="px-4 py-3">
//                         <span
//                           className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
//                           style={{ backgroundColor: style.bg, color: style.text }}
//                         >
//                           {ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3">
//                         <span className="capitalize text-slate-700 font-medium">
//                           {ENTITY_LABELS[log.entity_type] || log.entity_type}
//                         </span>
//                         {log.entity_id && (
//                           <p className="text-[10px] text-slate-400 font-mono mt-0.5">{log.entity_id.slice(0, 8)}...</p>
//                         )}
//                       </td>
//                       <td className="px-4 py-3">
//                         <p className="font-medium text-slate-900 text-xs">{log.profile?.full_name || log.profile?.email || 'Système'}</p>
//                         {log.profile?.role && (
//                           <p className="text-[10px] text-slate-400 capitalize">{log.profile.role.replace(/_/g, ' ')}</p>
//                         )}
//                       </td>
//                       <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
//                         <div className="flex items-center gap-1">
//                           <Calendar size={10} />
//                           {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
//                         </div>
//                       </td>
//                       <td className="px-4 py-3 text-right">
//                         <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
//                           <Eye size={14} />
//                         </button>
//                       </td>
//                     </tr>
//                   );
//                 })}
//           </tbody>
//         </table>

//         {!loading && logs.length === 0 && (
//           <div className="text-center py-16">
//             <Activity size={36} className="mx-auto mb-3 text-slate-200" />
//             <p className="text-slate-500 font-medium">Aucun journal d'activité pour le moment</p>
//           </div>
//         )}
//       </div>

//       {/* Pagination */}
//       {totalPages > 1 && (
//         <div className="flex items-center justify-between mt-4">
//           <p className="text-sm text-slate-500">
//             Affichage de {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} sur {total}
//           </p>
//           <div className="flex items-center gap-2">
//             <button
//               disabled={page === 0}
//               onClick={() => setPage((p) => p - 1)}
//               className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all"
//             >
//               <ChevronLeft size={14} />
//             </button>
//             <span className="text-sm text-slate-600">Page {page + 1} sur {totalPages}</span>
//             <button
//               disabled={page >= totalPages - 1}
//               onClick={() => setPage((p) => p + 1)}
//               className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all"
//             >
//               <ChevronRight size={14} />
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Detail Modal */}
//       <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Détail de l'action" size="md">
//         {selectedLog && (
//           <div className="space-y-4">
//             <div className="flex items-center gap-3">
//               <span
//                 className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize"
//                 style={{
//                   backgroundColor: ACTION_COLORS[selectedLog.action]?.bg || '#f1f5f9',
//                   color: ACTION_COLORS[selectedLog.action]?.text || '#64748b',
//                 }}
//               >
//                 {ACTION_LABELS[selectedLog.action] || selectedLog.action}
//               </span>
//               <span className="text-sm text-slate-500">
//                 {format(new Date(selectedLog.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
//               </span>
//             </div>

//             <div className="grid grid-cols-2 gap-3 text-sm">
//               <div className="bg-slate-50 rounded-lg p-3">
//                 <p className="text-xs text-slate-500 mb-1">Entité</p>
//                 <p className="font-medium text-slate-900">
//                   {ENTITY_LABELS[selectedLog.entity_type] || selectedLog.entity_type}
//                 </p>
//                 {selectedLog.entity_id && (
//                   <p className="text-[10px] font-mono text-slate-400 mt-0.5">{selectedLog.entity_id}</p>
//                 )}
//               </div>
//               <div className="bg-slate-50 rounded-lg p-3">
//                 <p className="text-xs text-slate-500 mb-1">Utilisateur</p>
//                 <p className="font-medium text-slate-900">{selectedLog.profile?.full_name || 'Système'}</p>
//                 <p className="text-[10px] text-slate-400">{selectedLog.profile?.email}</p>
//               </div>
//             </div>

//             <div>
//               <p className="text-xs font-medium text-slate-500 mb-2">Détails (JSON)</p>
//               <pre className="bg-slate-900 text-slate-300 text-xs p-4 rounded-xl overflow-x-auto">
//                 {JSON.stringify(selectedLog.details || {}, null, 2)}
//               </pre>
//             </div>

//             {selectedLog.details?.user_agent && (
//               <div className="text-xs text-slate-400 border-t border-slate-100 pt-3">
//                 <p>User-Agent : {String(selectedLog.details.user_agent)}</p>
//                 <p>Platform : {String(selectedLog.details.platform)}</p>
//               </div>
//             )}
//           </div>
//         )}
//       </Modal>
//     </div>
//   );
// }

// import React, { useEffect, useState, useCallback } from 'react';
// import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
// import { format } from 'date-fns';
// import { getActivityLogs } from '../../services/activityLogs';
// import { Skeleton } from '../../components/ui/Skeleton';
// import type { ActivityLog } from '../../types';

// const ACTION_COLORS: Record<string, string> = {
//   create: '#10b981',
//   update: '#3b82f6',
//   delete: '#ef4444',
//   login: '#8b5cf6',
//   logout: '#64748b',
//   status_change: '#f59e0b',
//   export: '#06b6d4',
//   theme_change: '#ec4899',
// };

// export function LogsPage() {
//   const [logs, setLogs] = useState<ActivityLog[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(0);
//   const [total, setTotal] = useState(0);
//   const PAGE_SIZE = 25;

//   const load = useCallback(async () => {
//     setLoading(true);
//     const { data, count } = await getActivityLogs(PAGE_SIZE, page * PAGE_SIZE);
//     setLogs(data || []);
//     setTotal(count || 0);
//     setLoading(false);
//   }, [page]);

//   useEffect(() => { load(); }, [load]);

//   const totalPages = Math.ceil(total / PAGE_SIZE);

//   return (
//     <div className="p-6">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Journaux d'activité</h1>
//           <p className="text-sm text-slate-500 mt-0.5">Suivi des actions admin en temps réel</p>
//         </div>
//         <div className="text-sm text-slate-500">{total} total entries</div>
//       </div>

//       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//         <table className="w-full text-sm">
//           <thead>
//             <tr className="border-b border-slate-100 bg-slate-50">
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Action</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Entité</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Utilisateur</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Détails</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Date</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {loading
//               ? Array.from({ length: 10 }).map((_, i) => (
//                   <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
//                 ))
//               : logs.map((log) => (
//                   <tr key={log.id} className="hover:bg-slate-50 transition-colors">
//                     <td className="px-4 py-3">
//                       <span
//                         className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white capitalize"
//                         style={{ backgroundColor: ACTION_COLORS[log.action] || '#64748b' }}
//                       >
//                         {log.action.replace(/_/g, ' ')}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3">
//                       <span className="capitalize text-slate-700">{log.entity_type}</span>
//                     </td>
//                     <td className="px-4 py-3">
//                       <p className="font-medium text-slate-900 text-xs">{log.profile?.full_name || log.profile?.email || 'System'}</p>
//                       {log.profile?.role && (
//                         <p className="text-xs text-slate-400 capitalize">{log.profile.role.replace(/_/g, ' ')}</p>
//                       )}
//                     </td>
//                     <td className="px-4 py-3">
//                       <span className="text-xs text-slate-500 font-mono">
//                         {Object.keys(log.details || {}).length > 0
//                           ? Object.entries(log.details)
//                               .slice(0, 2)
//                               .map(([k, v]) => `${k}: ${String(v)}`)
//                               .join(', ')
//                           : '—'}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 text-xs text-slate-500">
//                       {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
//                     </td>
//                   </tr>
//                 ))}
//           </tbody>
//         </table>

//         {!loading && logs.length === 0 && (
//           <div className="text-center py-16">
//             <Activity size={36} className="mx-auto mb-3 text-slate-200" />
//             <p className="text-slate-500 font-medium">Aucun journal d'activité pour le moment</p>
//           </div>
//         )}
//       </div>

//       {totalPages > 1 && (
//         <div className="flex items-center justify-between mt-4">
//           <p className="text-sm text-slate-500">
//             Affichage de {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
//           </p>
//           <div className="flex items-center gap-2">
//             <button
//               disabled={page === 0}
//               onClick={() => setPage((p) => p - 1)}
//               className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all"
//             >
//               <ChevronLeft size={14} />
//             </button>
//             <span className="text-sm text-slate-600">Page {page + 1} de {totalPages}</span>
//             <button
//               disabled={page >= totalPages - 1}
//               onClick={() => setPage((p) => p + 1)}
//               className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all"
//             >
//               <ChevronRight size={14} />
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
