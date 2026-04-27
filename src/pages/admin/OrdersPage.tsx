import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, ShoppingCart, ChevronDown, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getOrders, createOrder, updateOrder } from '../../services/orders';
import { getProducts } from '../../services/products';
import { logActivity, logActivityWithDiff } from '../../services/activityLogs';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/utils';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Order, Product, OrderItem } from '../../types';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['pending','processing','ready','shipped','delivered','cancelled'];
const SOURCE_OPTIONS = ['phone','website_quote','whatsapp','email','in_store','other'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  processing: 'En traitement',
  ready: 'Prête',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export function OrdersPage() {
  const { settings } = useTheme();
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    customer_address: '', source: 'phone', notes: '', status: 'pending',
  });
  const [orderItems, setOrderItems] = useState<{ product_id: string; quantity: number; unit_price: number; product?: Product }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getOrders({ search: search || undefined, status: statusFilter || undefined });
    setOrders(data || []);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getProducts({ active: true, limit: 200 }).then(({ data }) => setProducts(data || []));
  }, []);

  const openCreate = () => {
    setSelectedOrder(null);
    setForm({ customer_name: '', customer_phone: '', customer_email: '', customer_address: '', source: 'phone', notes: '', status: 'pending' });
    setOrderItems([]);
    setShowModal(true);
  };

  const addItem = () => { setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_price: 0 }]); };
  const updateItem = (idx: number, field: string, value: string | number) => {
    const updated = [...orderItems];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'product_id') {
      const product = products.find((p) => p.id === value);
      if (product) { updated[idx].unit_price = product.price; updated[idx].product = product; }
    }
    setOrderItems(updated);
  };
  const removeItem = (idx: number) => { setOrderItems(orderItems.filter((_, i) => i !== idx)); };
  const totalAmount = orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  const handleSave = async () => {
    if (!form.customer_name.trim() || !form.customer_phone.trim()) { toast.error('Nom du client et téléphone requis'); return; }
    setSaving(true);
    const items: Partial<OrderItem>[] = orderItems.map((item) => ({
      product_id: item.product_id || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
    }));

    const { data, error } = await createOrder(
      { ...form, total_amount: totalAmount, created_by: profile?.id, order_number: '' },
      items
    );
    if (error || !data) { toast.error('Échec de la création de la commande'); setSaving(false); return; }
    await logActivity({ action: 'create', entity_type: 'order', entity_id: data.id, details: { customer: form.customer_name } });
    toast.success('Commande créée');
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleStatusChange = async (order: Order, newStatus: string) => {
    await updateOrder(order.id, { status: newStatus as Order['status'] });
    
    // 🔥 DIFF TRACKING
    await logActivityWithDiff(
      { action: 'status_change', entity_type: 'order', entity_id: order.id },
      { status: order.status },
      { status: newStatus }
    );
    
    load();
    toast.success('Statut mis à jour');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commandes</h1>
          <p className="text-sm text-slate-500 mt-0.5">{orders.length} commandes</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
          <Plus size={15} /> Nouvelle Commande
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Rechercher par nom, téléphone, n° commande..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Commande #</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Source</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Date</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                  ))
                : orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">{order.order_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{order.customer_name}</p>
                        <p className="text-xs text-slate-400">{order.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs capitalize text-slate-600">{order.source.replace(/_/g, ' ')}</span></td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(order.total_amount, settings.currency)}</td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <select value={order.status} onChange={(e) => handleStatusChange(order, e.target.value)} className="appearance-none text-xs pr-5 py-1 pl-2 rounded-lg border border-slate-200 bg-white focus:outline-none cursor-pointer">
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(order.created_at), 'dd MMM yyyy', { locale: fr })}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Link to={`/admin/orders/${order.id}`} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Eye size={14} /></Link>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!loading && orders.length === 0 && (
          <div className="text-center py-16"><ShoppingCart size={40} className="mx-auto mb-3 text-slate-200" /><p className="text-slate-500 font-medium">Aucune commande trouvée</p></div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouvelle commande" size="2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Nom du client *</label>
              <input type="text" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Téléphone *</label>
              <input type="tel" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
              <input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Source</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2">
                {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 block mb-1">Adresse</label>
              <input type="text" value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Articles de la commande</label>
              <button onClick={addItem} className="text-xs text-slate-900 underline flex items-center gap-1"><Plus size={12} /> Ajouter un article</button>
            </div>
            <div className="space-y-2">
              {orderItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select value={item.product_id} onChange={(e) => updateItem(idx, 'product_id', e.target.value)} className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2">
                    <option value="">Sélectionner un produit</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price, settings.currency)})</option>)}
                  </select>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-16 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 text-center" />
                  <input type="number" min="0" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="w-28 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2" />
                  <button onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:text-red-600">✕</button>
                </div>
              ))}
            </div>
            {orderItems.length > 0 && <div className="mt-3 text-right font-semibold text-slate-900 text-sm">Total: {formatCurrency(totalAmount, settings.currency)}</div>}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
              {saving ? 'Création...' : 'Créer la commande'}
            </button>
            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Annuler</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// import React, { useEffect, useState, useCallback } from 'react';
// import { Plus, Search, ShoppingCart, ChevronDown, Eye } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import { format } from 'date-fns';
// import { getOrders, createOrder, updateOrder } from '../../services/orders';
// import { getProducts } from '../../services/products';
// import { logActivity } from '../../services/activityLogs';
// import { useTheme } from '../../contexts/ThemeContext';
// import { useAuth } from '../../contexts/AuthContext';
// import { formatCurrency } from '../../lib/utils';
// import { StatusBadge } from '../../components/ui/Badge';
// import { Modal } from '../../components/ui/Modal';
// import { Skeleton } from '../../components/ui/Skeleton';
// import type { Order, Product, OrderItem } from '../../types';
// import { toast } from 'sonner';

// const STATUS_OPTIONS = ['pending','processing','ready','shipped','delivered','cancelled'];
// const SOURCE_OPTIONS = ['phone','website_quote','whatsapp','email','in_store','other'];

// export function OrdersPage() {
//   const { settings } = useTheme();
//   const { profile } = useAuth();
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [statusFilter, setStatusFilter] = useState('');
//   const [showModal, setShowModal] = useState(false);
//   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
//   const [products, setProducts] = useState<Product[]>([]);
//   const [saving, setSaving] = useState(false);

//   const [form, setForm] = useState({
//     customer_name: '', customer_phone: '', customer_email: '',
//     customer_address: '', source: 'phone', notes: '', status: 'pending',
//   });
//   const [orderItems, setOrderItems] = useState<{ product_id: string; quantity: number; unit_price: number; product?: Product }[]>([]);

//   const load = useCallback(async () => {
//     setLoading(true);
//     const { data } = await getOrders({ search: search || undefined, status: statusFilter || undefined });
//     setOrders(data || []);
//     setLoading(false);
//   }, [search, statusFilter]);

//   useEffect(() => { load(); }, [load]);

//   useEffect(() => {
//     getProducts({ active: true, limit: 200 }).then(({ data }) => setProducts(data || []));
//   }, []);

//   const openCreate = () => {
//     setSelectedOrder(null);
//     setForm({ customer_name: '', customer_phone: '', customer_email: '', customer_address: '', source: 'phone', notes: '', status: 'pending' });
//     setOrderItems([]);
//     setShowModal(true);
//   };

//   const addItem = () => {
//     setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_price: 0 }]);
//   };

//   const updateItem = (idx: number, field: string, value: string | number) => {
//     const updated = [...orderItems];
//     updated[idx] = { ...updated[idx], [field]: value };
//     if (field === 'product_id') {
//       const product = products.find((p) => p.id === value);
//       if (product) {
//         updated[idx].unit_price = product.price;
//         updated[idx].product = product;
//       }
//     }
//     setOrderItems(updated);
//   };

//   const removeItem = (idx: number) => {
//     setOrderItems(orderItems.filter((_, i) => i !== idx));
//   };

//   const totalAmount = orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

//   const handleSave = async () => {
//     if (!form.customer_name.trim() || !form.customer_phone.trim()) {
//       toast.error('Nom du client et téléphone requis');
//       return;
//     }
//     setSaving(true);
//     const items: Partial<OrderItem>[] = orderItems.map((item) => ({
//       product_id: item.product_id || null,
//       quantity: item.quantity,
//       unit_price: item.unit_price,
//       total_price: item.unit_price * item.quantity,
//     }));

//     const { data, error } = await createOrder(
//       { ...form, total_amount: totalAmount, created_by: profile?.id, order_number: '' },
//       items
//     );
//     if (error || !data) { toast.error('Échec de la création de la commande'); setSaving(false); return; }
//     await logActivity({ action: 'create', entity_type: 'order', entity_id: data.id, details: { customer: form.customer_name } });
//     toast.success('Commande créée');
//     setSaving(false);
//     setShowModal(false);
//     load();
//   };

//   const handleStatusChange = async (order: Order, newStatus: string) => {
//     await updateOrder(order.id, { status: newStatus as Order['status'] });
//     await logActivity({ action: 'status_change', entity_type: 'order', entity_id: order.id, details: { from: order.status, to: newStatus } });
//     load();
//     toast.success('Statut mis à jour');
//   };

//   return (
//     <div className="p-6">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Commandes</h1>
//           <p className="text-sm text-slate-500 mt-0.5">{orders.length} commandes</p>
//         </div>
//         <button
//           onClick={openCreate}
//           className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
//         >
//           <Plus size={15} />
//           Nouvelle Commande
//         </button>
//       </div>

//       <div className="flex flex-col sm:flex-row gap-3 mb-5">
//         <div className="relative flex-1">
//           <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//           <input type="text" placeholder="Search by name, phone, order#..." value={search} onChange={(e) => setSearch(e.target.value)}
//             className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
//         </div>
//         <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
//           className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
//           <option value="">Tous les statuts</option>
//           {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
//         </select>
//       </div>

//       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead>
//               <tr className="border-b border-slate-100 bg-slate-50">
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Commande #</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Client</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Source</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Total</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Date</th>
//                 <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {loading
//                 ? Array.from({ length: 5 }).map((_, i) => (
//                     <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
//                   ))
//                 : orders.map((order) => (
//                     <tr key={order.id} className="hover:bg-slate-50 transition-colors">
//                       <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">{order.order_number}</td>
//                       <td className="px-4 py-3">
//                         <p className="font-medium text-slate-900">{order.customer_name}</p>
//                         <p className="text-xs text-slate-400">{order.customer_phone}</p>
//                       </td>
//                       <td className="px-4 py-3">
//                         <span className="text-xs capitalize text-slate-600">{order.source.replace(/_/g, ' ')}</span>
//                       </td>
//                       <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(order.total_amount, settings.currency)}</td>
//                       <td className="px-4 py-3">
//                         <div className="relative inline-block">
//                           <select
//                             value={order.status}
//                             onChange={(e) => handleStatusChange(order, e.target.value)}
//                             className="appearance-none text-xs pr-5 py-1 pl-2 rounded-lg border border-slate-200 bg-white focus:outline-none cursor-pointer"
//                           >
//                             {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
//                           </select>
//                           <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
//                         </div>
//                       </td>
//                       <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(order.created_at), 'MMM d, yyyy')}</td>
//                       <td className="px-4 py-3">
//                         <div className="flex justify-end">
//                           <Link to={`/admin/orders/${order.id}`} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
//                             <Eye size={14} />
//                           </Link>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//             </tbody>
//           </table>
//         </div>
//         {!loading && orders.length === 0 && (
//           <div className="text-center py-16">
//             <ShoppingCart size={40} className="mx-auto mb-3 text-slate-200" />
//             <p className="text-slate-500 font-medium">Aucune commande trouvée</p>
//           </div>
//         )}
//       </div>

//       {/* Create Order Modal */}
//       <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Order" size="2xl">
//         <div className="space-y-4">
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Nom du client *</label>
//               <input type="text" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Téléphone *</label>
//               <input type="tel" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
//               <input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Source</label>
//               <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2">
//                 {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
//               </select>
//             </div>
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Adresse</label>
//               <input type="text" value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//             </div>
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
//               <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none" />
//             </div>
//           </div>

//           <div>
//             <div className="flex items-center justify-between mb-2">
//               <label className="text-sm font-medium text-slate-700">Articles de la commande</label>
//               <button onClick={addItem} className="text-xs text-slate-900 underline flex items-center gap-1">
//                 <Plus size={12} /> Ajouter un article
//               </button>
//             </div>
//             <div className="space-y-2">
//               {orderItems.map((item, idx) => (
//                 <div key={idx} className="flex items-center gap-2">
//                   <select
//                     value={item.product_id}
//                     onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
//                     className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//                   >
//                     <option value="">Sélectionner un produit</option>
//                     {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price, settings.currency)})</option>)}
//                   </select>
//                   <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
//                     className="w-16 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 text-center" />
//                   <input type="number" min="0" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
//                     className="w-28 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2" />
//                   <button onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:text-red-600">✕</button>
//                 </div>
//               ))}
//             </div>
//             {orderItems.length > 0 && (
//               <div className="mt-3 text-right font-semibold text-slate-900 text-sm">
//                 Total: {formatCurrency(totalAmount, settings.currency)}
//               </div>
//             )}
//           </div>

//           <div className="flex gap-3 pt-2">
//             <button onClick={handleSave} disabled={saving}
//               className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
//               {saving ? 'Creating...' : 'Create Order'}
//             </button>
//             <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
//               Annuler
//             </button>
//           </div>
//         </div>
//       </Modal>
//     </div>
//   );
// }
