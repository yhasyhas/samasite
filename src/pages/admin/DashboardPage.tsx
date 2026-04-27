import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Package, MessageSquare, TrendingUp,
  Clock, CheckCircle, AlertTriangle, ArrowRight, BarChart3
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid
} from 'recharts';
import { format, subDays } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../lib/utils';
import { StatusBadge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Order, QuoteRequest } from '../../types';

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  newQuotes: number;
  revenueByDay: { date: string; revenue: number; orders: number }[];
  recentOrders: Order[];
  recentQuotes: QuoteRequest[];
}

export function DashboardPage() {
  const { settings } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [ordersRes, productsRes, quotesRes] = await Promise.all([
        supabase.from('orders').select('id,total_amount,status,created_at,customer_name,customer_phone,order_number').order('created_at', { ascending: false }),
        supabase.from('products').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('quote_requests').select('id,full_name,phone,status,created_at').order('created_at', { ascending: false }),
      ]);

      const orders = ordersRes.data || [];
      const quotes = quotesRes.data || [];

      const totalRevenue = orders
        .filter((o) => o.status === 'delivered')
        .reduce((sum: number, o: { total_amount: number }) => sum + (o.total_amount || 0), 0);

      const pendingOrders = orders.filter((o: { status: string }) => o.status === 'pending').length;
      const newQuotes = quotes.filter((q: { status: string }) => q.status === 'new').length;

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayStr = format(date, 'yyyy-MM-dd');
        const dayOrders = orders.filter((o: { created_at: string }) => o.created_at.startsWith(dayStr));
        return {
          date: format(date, 'MMM d'),
          revenue: dayOrders.reduce((sum: number, o: { total_amount: number }) => sum + (o.total_amount || 0), 0),
          orders: dayOrders.length,
        };
      });

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        pendingOrders,
        totalProducts: productsRes.count || 0,
        newQuotes,
        revenueByDay: last7Days,
        recentOrders: orders.slice(0, 5) as Order[],
        recentQuotes: quotes.slice(0, 5) as QuoteRequest[],
      });
      setLoading(false);
    }
    load();
  }, []);

  const statCards = stats
    ? [
        { label: 'Chiffre affaires total', value: formatCurrency(stats.totalRevenue, settings.currency), icon: TrendingUp, color: '#10b981', sub: 'Commandes livrées' },
        { label: 'Total des commandes', value: String(stats.totalOrders), icon: ShoppingCart, color: '#3b82f6', sub: `${stats.pendingOrders} En attente` },
        { label: 'Produits', value: String(stats.totalProducts), icon: Package, color: '#f59e0b', sub: 'Produits actifs' },
        { label: 'Nouveaux devis', value: String(stats.newQuotes), icon: MessageSquare, color: '#8b5cf6', sub: 'En attente de validation' },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-sm text-slate-500 mt-0.5">Bon retour, {settings.store_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/orders"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <ShoppingCart size={14} />
            Voir les commandes
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))
          : statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-slate-500 font-medium">{card.label}</p>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.color + '15' }}>
                    <card.icon size={18} style={{ color: card.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
              </div>
            ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Chiffre d'affaires des 7 derniers jours</h2>
            <BarChart3 size={16} className="text-slate-400" />
          </div>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats?.revenueByDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(v: number) => [formatCurrency(v, settings.currency), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0f172a" strokeWidth={2} fill="#0f172a" fillOpacity={0.06} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Commandes par jour</h2>
          </div>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats?.revenueByDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Bar dataKey="orders" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Commandes récentes</h2>
            <Link to="/admin/orders" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              : stats?.recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{order.order_number}</p>
                      <p className="text-xs text-slate-400 truncate">{order.customer_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(order.total_amount, settings.currency)}
                      </span>
                      <StatusBadge status={order.status} type="order" />
                    </div>
                  </Link>
                ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Demandes de devis récentes</h2>
            <Link to="/admin/quotes" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              : stats?.recentQuotes.map((quote) => (
                  <Link
                    key={quote.id}
                    to={`/admin/quotes`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{quote.full_name}</p>
                      <p className="text-xs text-slate-400">{quote.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {quote.status === 'new' && <Clock size={13} className="text-blue-500" />}
                      {quote.status === 'converted' && <CheckCircle size={13} className="text-green-500" />}
                      {quote.status === 'processing' && <AlertTriangle size={13} className="text-yellow-500" />}
                      <StatusBadge status={quote.status} type="quote" />
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// import React, { useEffect, useState } from 'react';
// import { Link } from 'react-router-dom';
// import {
//   ShoppingCart, Package, MessageSquare, TrendingUp,
//   Clock, CheckCircle, AlertTriangle, ArrowRight, BarChart3
// } from 'lucide-react';
// import {
//   AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid
// } from 'recharts';
// import { format, subDays } from 'date-fns';
// import { supabase } from '../../lib/supabase';
// import { useTheme } from '../../contexts/ThemeContext';
// import { formatCurrency } from '../../lib/utils';
// import { StatusBadge } from '../../components/ui/Badge';
// import { Skeleton } from '../../components/ui/Skeleton';
// import type { Order, QuoteRequest } from '../../types';

// interface Stats {
//   totalRevenue: number;
//   totalOrders: number;
//   pendingOrders: number;
//   totalProducts: number;
//   newQuotes: number;
//   revenueByDay: { date: string; revenue: number; orders: number }[];
//   recentOrders: Order[];
//   recentQuotes: QuoteRequest[];
// }

// export function DashboardPage() {
//   const { settings } = useTheme();
//   const [stats, setStats] = useState<Stats | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     async function load() {
//       const [ordersRes, productsRes, quotesRes] = await Promise.all([
//         supabase.from('orders').select('id,total_amount,status,created_at,customer_name,customer_phone,order_number').order('created_at', { ascending: false }),
//         supabase.from('products').select('id', { count: 'exact' }).eq('is_active', true),
//         supabase.from('quote_requests').select('id,full_name,phone,status,created_at').order('created_at', { ascending: false }),
//       ]);

//       const orders = ordersRes.data || [];
//       const quotes = quotesRes.data || [];

//       const totalRevenue = orders
//         .filter((o) => o.status === 'delivered')
//         .reduce((sum: number, o: { total_amount: number }) => sum + (o.total_amount || 0), 0);

//       const pendingOrders = orders.filter((o: { status: string }) => o.status === 'pending').length;
//       const newQuotes = quotes.filter((q: { status: string }) => q.status === 'new').length;

//       const last7Days = Array.from({ length: 7 }, (_, i) => {
//         const date = subDays(new Date(), 6 - i);
//         const dayStr = format(date, 'yyyy-MM-dd');
//         const dayOrders = orders.filter((o: { created_at: string }) => o.created_at.startsWith(dayStr));
//         return {
//           date: format(date, 'MMM d'),
//           revenue: dayOrders.reduce((sum: number, o: { total_amount: number }) => sum + (o.total_amount || 0), 0),
//           orders: dayOrders.length,
//         };
//       });

//       setStats({
//         totalRevenue,
//         totalOrders: orders.length,
//         pendingOrders,
//         totalProducts: productsRes.count || 0,
//         newQuotes,
//         revenueByDay: last7Days,
//         recentOrders: orders.slice(0, 5) as Order[],
//         recentQuotes: quotes.slice(0, 5) as QuoteRequest[],
//       });
//       setLoading(false);
//     }
//     load();
//   }, []);

//   const statCards = stats
//     ? [
//         { label: 'Chiffre affaires total', value: formatCurrency(stats.totalRevenue, settings.currency), icon: TrendingUp, color: '#10b981', sub: 'Commandes livrées' },
//         { label: 'Total des commandes', value: String(stats.totalOrders), icon: ShoppingCart, color: '#3b82f6', sub: `${stats.pendingOrders} En attente` },
//         { label: 'Produits', value: String(stats.totalProducts), icon: Package, color: '#f59e0b', sub: 'Produits actifs' },
//         { label: 'Nouveaux devis', value: String(stats.newQuotes), icon: MessageSquare, color: '#8b5cf6', sub: 'En attente de validation' },
//       ]
//     : [];

//   return (
//     <div className="p-6 space-y-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
//           <p className="text-sm text-slate-500 mt-0.5">Bon retour, {settings.store_name}</p>
//         </div>
//         <div className="flex items-center gap-2">
//           <Link
//             to="/admin/orders"
//             className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
//           >
//             <ShoppingCart size={14} />
//             Voir les commandes
//           </Link>
//         </div>
//       </div>

//       {/* Stat cards */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         {loading
//           ? Array.from({ length: 4 }).map((_, i) => (
//               <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200">
//                 <Skeleton className="h-4 w-24 mb-3" />
//                 <Skeleton className="h-8 w-32" />
//               </div>
//             ))
//           : statCards.map((card) => (
//               <div key={card.label} className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-sm transition-shadow">
//                 <div className="flex items-start justify-between mb-3">
//                   <p className="text-sm text-slate-500 font-medium">{card.label}</p>
//                   <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.color + '15' }}>
//                     <card.icon size={18} style={{ color: card.color }} />
//                   </div>
//                 </div>
//                 <p className="text-2xl font-bold text-slate-900">{card.value}</p>
//                 <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
//               </div>
//             ))}
//       </div>

//       {/* Charts */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200">
//           <div className="flex items-center justify-between mb-4">
//             <h2 className="font-semibold text-slate-900">Chiffre d'affaires des 7 derniers jours</h2>
//             <BarChart3 size={16} className="text-slate-400" />
//           </div>
//           {loading ? (
//             <Skeleton className="h-48 w-full" />
//           ) : (
//             <ResponsiveContainer width="100%" height={180}>
//               <AreaChart data={stats?.revenueByDay || []}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                 <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
//                 <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50}
//                   tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
//                 <Tooltip
//                   contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
//                   formatter={(v: number) => [formatCurrency(v, settings.currency), 'Revenue']}
//                 />
//                 <Area type="monotone" dataKey="revenue" stroke="#0f172a" strokeWidth={2} fill="#0f172a" fillOpacity={0.06} />
//               </AreaChart>
//             </ResponsiveContainer>
//           )}
//         </div>

//         <div className="bg-white rounded-2xl p-5 border border-slate-200">
//           <div className="flex items-center justify-between mb-4">
//             <h2 className="font-semibold text-slate-900">Commandes par jour</h2>
//           </div>
//           {loading ? (
//             <Skeleton className="h-48 w-full" />
//           ) : (
//             <ResponsiveContainer width="100%" height={180}>
//               <BarChart data={stats?.revenueByDay || []}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                 <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
//                 <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={20} />
//                 <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
//                 <Bar dataKey="orders" fill="#0f172a" radius={[4, 4, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           )}
//         </div>
//       </div>

//       {/* Recent activity */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//         <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//           <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
//             <h2 className="font-semibold text-slate-900">Commandes récentes</h2>
//             <Link to="/admin/orders" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
//               View all <ArrowRight size={12} />
//             </Link>
//           </div>
//           <div className="divide-y divide-slate-100">
//             {loading
//               ? Array.from({ length: 4 }).map((_, i) => (
//                   <div key={i} className="px-5 py-3 flex items-center gap-3">
//                     <Skeleton className="h-4 w-24" />
//                     <Skeleton className="h-4 flex-1" />
//                     <Skeleton className="h-5 w-16 rounded-full" />
//                   </div>
//                 ))
//               : stats?.recentOrders.map((order) => (
//                   <Link
//                     key={order.id}
//                     to={`/admin/orders/${order.id}`}
//                     className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
//                   >
//                     <div className="min-w-0">
//                       <p className="text-sm font-medium text-slate-900">{order.order_number}</p>
//                       <p className="text-xs text-slate-400 truncate">{order.customer_name}</p>
//                     </div>
//                     <div className="flex items-center gap-3">
//                       <span className="text-sm font-semibold text-slate-900">
//                         {formatCurrency(order.total_amount, settings.currency)}
//                       </span>
//                       <StatusBadge status={order.status} type="order" />
//                     </div>
//                   </Link>
//                 ))}
//           </div>
//         </div>

//         <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//           <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
//             <h2 className="font-semibold text-slate-900">Demandes de devis récentes</h2>
//             <Link to="/admin/quotes" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
//               Voir tout <ArrowRight size={12} />
//             </Link>
//           </div>
//           <div className="divide-y divide-slate-100">
//             {loading
//               ? Array.from({ length: 4 }).map((_, i) => (
//                   <div key={i} className="px-5 py-3 flex items-center gap-3">
//                     <Skeleton className="h-4 w-24" />
//                     <Skeleton className="h-4 flex-1" />
//                     <Skeleton className="h-5 w-16 rounded-full" />
//                   </div>
//                 ))
//               : stats?.recentQuotes.map((quote) => (
//                   <Link
//                     key={quote.id}
//                     to={`/admin/quotes`}
//                     className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
//                   >
//                     <div className="min-w-0">
//                       <p className="text-sm font-medium text-slate-900">{quote.full_name}</p>
//                       <p className="text-xs text-slate-400">{quote.phone}</p>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       {quote.status === 'new' && <Clock size={13} className="text-blue-500" />}
//                       {quote.status === 'converted' && <CheckCircle size={13} className="text-green-500" />}
//                       {quote.status === 'processing' && <AlertTriangle size={13} className="text-yellow-500" />}
//                       <StatusBadge status={quote.status} type="quote" />
//                     </div>
//                   </Link>
//                 ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
