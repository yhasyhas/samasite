import React, { useEffect, useState, useCallback } from 'react';
import { Search, MessageSquare, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { getQuotes, updateQuote } from '../../services/quotes';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../lib/utils';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import type { QuoteRequest } from '../../types';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['new', 'processing', 'converted', 'closed'];

export function QuotesPage() {
  const { settings } = useTheme();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getQuotes({ search: search || undefined, status: statusFilter || undefined });
    setQuotes(data || []);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (quote: QuoteRequest, newStatus: string) => {
    await updateQuote(quote.id, { status: newStatus as QuoteRequest['status'] });
    load();
    toast.success('Status updated');
    if (selectedQuote?.id === quote.id) setSelectedQuote({ ...selectedQuote, status: newStatus as QuoteRequest['status'] });
  };

  const totalValue = (items: QuoteRequest['items']) =>
    (items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Demandes de devis</h1>
          <p className="text-sm text-slate-500 mt-0.5">{quotes.length} demandes</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Nom, téléphone..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Articles</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Valeur estimée</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Date</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                  ))
                : quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{quote.full_name}</p>
                        <p className="text-xs text-slate-400">{quote.phone}</p>
                        {quote.email && <p className="text-xs text-slate-400">{quote.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{(quote.items || []).length} article{(quote.items || []).length !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {totalValue(quote.items) > 0 ? formatCurrency(totalValue(quote.items), settings.currency) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <select value={quote.status} onChange={(e) => handleStatusChange(quote, e.target.value)}
                            className="appearance-none text-xs pr-5 py-1 pl-2 rounded-lg border border-slate-200 bg-white focus:outline-none cursor-pointer">
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(quote.created_at), 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button onClick={() => setSelectedQuote(quote)} className="text-xs text-slate-900 underline">Voir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!loading && quotes.length === 0 && (
          <div className="text-center py-16">
            <MessageSquare size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 font-medium">Aucune demande de devis</p>
          </div>
        )}
      </div>

      {/* Quote Detail Modal */}
      <Modal isOpen={!!selectedQuote} onClose={() => setSelectedQuote(null)} title="Quote Request Detail" size="lg">
        {selectedQuote && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Client</p>
                <p className="text-sm font-semibold text-slate-900">{selectedQuote.full_name}</p>
                <p className="text-xs text-slate-600">{selectedQuote.phone}</p>
                {selectedQuote.email && <p className="text-xs text-slate-600">{selectedQuote.email}</p>}
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Status & Date</p>
                <StatusBadge status={selectedQuote.status} type="quote" />
                <p className="text-xs text-slate-600 mt-1">{format(new Date(selectedQuote.created_at), 'MMM d, yyyy HH:mm')}</p>
              </div>
            </div>

            {selectedQuote.message && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Message</p>
                <p className="text-sm text-slate-700">{selectedQuote.message}</p>
              </div>
            )}

            {(selectedQuote.items || []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Articles demandés</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Produit</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Qty</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Prix</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedQuote.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-slate-900">{item.product_name}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatCurrency(item.price * item.quantity, settings.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td colSpan={2} className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Total</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          {formatCurrency(totalValue(selectedQuote.items), settings.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Mettre à jour le statut</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selectedQuote, s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedQuote.status === s ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
