import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, User, Phone, Mail, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { getOrderById, updateOrder } from '../../services/orders';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../lib/utils';
import { StatusBadge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Order } from '../../types';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['pending','processing','ready','shipped','delivered','cancelled'];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { settings } = useTheme();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getOrderById(id).then(({ data }) => { setOrder(data); setLoading(false); });
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    const { data } = await updateOrder(order.id, { status: newStatus as Order['status'] });
    if (data) setOrder(data);
    toast.success('Statut mis à jour');
  };

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );

  if (!order) return (
    <div className="p-6 text-center">
      <p className="text-slate-500">Commande introuvable</p>
      <Link to="/admin/orders" className="text-sm text-slate-900 underline mt-2 block">Retour aux commandes</Link>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/orders" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{order.order_number}</h1>
          <p className="text-sm text-slate-500">{format(new Date(order.created_at), 'MMMM d, yyyy HH:mm')}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <StatusBadge status={order.status} type="order" />
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">Client</h3>
          </div>
          <p className="text-sm font-medium text-slate-900">{order.customer_name}</p>
          {order.customer_phone && <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Phone size={10} />{order.customer_phone}</p>}
          {order.customer_email && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail size={10} />{order.customer_email}</p>}
          {order.customer_address && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={10} />{order.customer_address}</p>}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Infos commande</h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Source</span><span className="capitalize font-medium">{order.source.replace(/_/g, ' ')}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={order.status} type="order" /></div>
            <div className="flex justify-between"><span className="text-slate-500">Créée</span><span>{format(new Date(order.created_at), 'MMM d, yyyy')}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Total</h3>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(order.total_amount, settings.currency)}</p>
          {order.notes && <p className="text-xs text-slate-500 mt-2 italic">Note: {order.notes}</p>}
        </div>
      </div>

      {/* Order items */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">Articles de la commande</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Article</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Prix Unitaire</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Qty</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(order.items || []).map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                      {item.product?.images?.[0] ? (
                        <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package size={12} className="text-slate-300" /></div>
                      )}
                    </div>
                    <span className="font-medium text-slate-900">{item.product?.name || 'Deleted product'}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(item.unit_price, settings.currency)}</td>
                <td className="px-5 py-3 text-right text-slate-600">{item.quantity}</td>
                <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatCurrency(item.total_price, settings.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200">
              <td colSpan={3} className="px-5 py-3 text-right font-semibold text-slate-900">Total</td>
              <td className="px-5 py-3 text-right font-bold text-slate-900 text-base">{formatCurrency(order.total_amount, settings.currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
