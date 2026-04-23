import React, { useEffect, useState, useCallback } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Tag, ToggleLeft, ToggleRight, Calendar, Package, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { getPromotions, createPromotion, updatePromotion, deletePromotion } from '../../services/promotions';
import { getProducts } from '../../services/products';
import { getCategories } from '../../services/categories';
import { logActivity } from '../../services/activityLogs';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Promotion, Product, Category } from '../../types';
import { toast } from 'sonner';

interface PromotionWithLinks extends Promotion {
  links?: { id: string; product_id?: string; category_id?: string; product?: Product; category?: Category }[];
}

interface PromoForm {
  code: string;
  label: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  min_purchase: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  applicable_to: 'all' | 'specific_categories' | 'specific_products';
  linked_ids: string[];
}

const getPromoStatus = (promo: Promotion) => {
  if (!promo.is_active) return { label: 'Désactivée', color: '#64748b', bg: '#f1f5f9' };
  const now = new Date();
  const start = promo.starts_at ? new Date(promo.starts_at) : null;
  const end = promo.ends_at ? new Date(promo.ends_at) : null;

  if (start && now < start) return { label: 'En attente', color: '#d97706', bg: '#fffbeb' };
  if (end && now > end) return { label: 'Expirée', color: '#ef4444', bg: '#fef2f2' };
  return { label: 'En cours', color: '#10b981', bg: '#f0fdf4' };
};

const getScopeLabel = (promo: PromotionWithLinks) => {
  if (promo.applicable_to === 'all') return 'Tous les produits';
  if (promo.applicable_to === 'specific_categories') {
    const count = promo.links?.filter(l => l.category_id).length || 0;
    return `${count} catégorie${count > 1 ? 's' : ''}`;
  }
  const count = promo.links?.filter(l => l.product_id).length || 0;
  return `${count} produit${count > 1 ? 's' : ''}`;
};

export function PromotionsPage() {
  const { profile } = useAuth();
  const [promotions, setPromotions] = useState<PromotionWithLinks[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionWithLinks | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoForm>({
    code: '', label: '', type: 'percentage', value: 0, min_purchase: 0,
    starts_at: '', ends_at: '', is_active: true, applicable_to: 'all', linked_ids: [],
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: promoData }, { data: prodData }, { data: catData }] = await Promise.all([
      getPromotions(),
      getProducts({ active: true, limit: 500 }),
      getCategories(false),
    ]);
    setPromotions(promoData || []);
    setProducts(prodData || []);
    setCategories(catData || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingPromo(null);
    setForm({
      code: '', label: '', type: 'percentage', value: 0, min_purchase: 0,
      starts_at: '', ends_at: '', is_active: true, applicable_to: 'all', linked_ids: [],
    });
    setShowModal(true);
  };

  const openEdit = (promo: PromotionWithLinks) => {
    setEditingPromo(promo);
    const isProducts = promo.applicable_to === 'specific_products';
    const isCategories = promo.applicable_to === 'specific_categories';
    setForm({
      code: promo.code,
      label: promo.label,
      type: promo.type,
      value: promo.value,
      min_purchase: promo.min_purchase || 0,
      starts_at: promo.starts_at ? format(new Date(promo.starts_at), "yyyy-MM-dd'T'HH:mm") : '',
      ends_at: promo.ends_at ? format(new Date(promo.ends_at), "yyyy-MM-dd'T'HH:mm") : '',
      is_active: promo.is_active,
      applicable_to: promo.applicable_to,
      linked_ids: isProducts
        ? (promo.links?.filter(l => l.product_id).map(l => l.product_id!) || [])
        : isCategories
        ? (promo.links?.filter(l => l.category_id).map(l => l.category_id!) || [])
        : [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error('Le code promo est requis'); return; }
    if (!form.value || form.value <= 0) { toast.error('La valeur de la remise est requise'); return; }

    setSaving(true);
    const payload = {
      code: form.code.toUpperCase(),
      label: form.label,
      type: form.type,
      value: form.value,
      min_purchase: form.min_purchase,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      is_active: form.is_active,
      applicable_to: form.applicable_to,
    };

    const linkIds = form.applicable_to === 'specific_products'
      ? { productIds: form.linked_ids, categoryIds: [] as string[] }
      : form.applicable_to === 'specific_categories'
      ? { productIds: [] as string[], categoryIds: form.linked_ids }
      : undefined;

    if (editingPromo) {
      const { error } = await updatePromotion(editingPromo.id, payload, linkIds);
      if (error) {
        console.error('Erreur mise à jour promo:', error);
        toast.error('Échec de la mise à jour de la promotion');
        setSaving(false);
        return;
      }
      await logActivity({ action: 'update', entity_type: 'promotion', entity_id: editingPromo.id });
      toast.success('Promotion mise à jour');
    } else {
      const { data, error } = await createPromotion({ ...payload, created_by: profile?.id }, linkIds);
      if (error) {
        toast.error('Échec de la création : ' + error.message);
        setSaving(false);
        return;
      }
      await logActivity({ action: 'create', entity_type: 'promotion', entity_id: data?.id });
      toast.success('Promotion créée');
    }

    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deletePromotion(deleteId);
    if (error) { toast.error('Échec de la suppression'); return; }
    await logActivity({ action: 'delete', entity_type: 'promotion', entity_id: deleteId });
    toast.success('Promotion supprimée');
    setDeleteId(null);
    load();
  };

  const toggleActive = async (promo: PromotionWithLinks) => {
    await updatePromotion(promo.id, { is_active: !promo.is_active });
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Promotions</h1>
          <p className="text-sm text-slate-500 mt-0.5">{promotions.length} promotion{promotions.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
          <Plus size={15} />
          Nouvelle promotion
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Code</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Libellé</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Remise</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Portée</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Validité</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Statut</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                ))
              : promotions.map((promo) => {
                  const status = getPromoStatus(promo);
                  return (
                    <tr key={promo.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg font-mono text-xs font-bold text-slate-900">
                          <Tag size={10} />
                          {promo.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{promo.label || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value} (fixe)`}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {promo.applicable_to === 'all' && <span className="flex items-center gap-1"><Package size={11} /> {getScopeLabel(promo)}</span>}
                        {promo.applicable_to === 'specific_categories' && <span className="flex items-center gap-1"><FolderOpen size={11} /> {getScopeLabel(promo)}</span>}
                        {promo.applicable_to === 'specific_products' && <span className="flex items-center gap-1"><Package size={11} /> {getScopeLabel(promo)}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {promo.starts_at ? format(new Date(promo.starts_at), 'dd/MM/yy HH:mm') : 'Immédiate'}
                          {' → '}
                          {promo.ends_at ? format(new Date(promo.ends_at), 'dd/MM/yy HH:mm') : 'Sans fin'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: status.color, backgroundColor: status.bg }}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleActive(promo)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title={promo.is_active ? 'Désactiver' : 'Activer'}>
                            {promo.is_active ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                          </button>
                          <button onClick={() => openEdit(promo)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setDeleteId(promo.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!loading && promotions.length === 0 && (
          <div className="text-center py-16">
            <Tag size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 font-medium">Aucune promotion pour le moment</p>
          </div>
        )}
      </div>

      {/* Modal Create/Edit */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingPromo ? 'Modifier la promotion' : 'Nouvelle promotion'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 block mb-1">Code promo *</label>
              <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="ÉTÉ2024"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 font-mono uppercase" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 block mb-1">Libellé</label>
              <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Soldes d'été 2024"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percentage' | 'fixed_amount' })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2">
                <option value="percentage">Pourcentage (%)</option>
                <option value="fixed_amount">Montant fixe</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Valeur *</label>
              <input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Montant minimum d'achat</label>
              <input type="number" min="0" step="0.01" value={form.min_purchase} onChange={(e) => setForm({ ...form, min_purchase: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Portée</label>
              <select value={form.applicable_to} onChange={(e) => setForm({ ...form, applicable_to: e.target.value as any, linked_ids: [] })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2">
                <option value="all">Tous les produits</option>
                <option value="specific_categories">Catégories spécifiques</option>
                <option value="specific_products">Produits spécifiques</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Date de début</label>
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Date de fin</label>
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            </div>
          </div>

          {/* Sélection conditionnelle */}
          {form.applicable_to === 'specific_categories' && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Catégories liées</label>
              <select
                multiple
                value={form.linked_ids}
                onChange={(e) => setForm({ ...form, linked_ids: Array.from(e.target.selectedOptions).map(o => o.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ minHeight: '120px' }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs éléments</p>
            </div>
          )}

          {form.applicable_to === 'specific_products' && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Produits liés</label>
              <select
                multiple
                value={form.linked_ids}
                onChange={(e) => setForm({ ...form, linked_ids: Array.from(e.target.selectedOptions).map(o => o.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ minHeight: '120px' }}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs éléments</p>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm text-slate-700">Promotion activée</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
              {saving ? 'Enregistrement...' : editingPromo ? 'Mettre à jour' : 'Créer'}
            </button>
            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Annuler</button>
          </div>
        </div>
      </Modal>

      {/* Modal Delete */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Supprimer la promotion" size="sm">
        <p className="text-sm text-slate-600 mb-5">Supprimer ce code promo ? Cette action est irréversible.</p>
        <div className="flex gap-3">
          <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">Supprimer</button>
          <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Annuler</button>
        </div>
      </Modal>
    </div>
  );
}

// import React, { useEffect, useState, useCallback } from 'react';
// import { Plus, CreditCard as Edit2, Trash2, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
// import { format } from 'date-fns';
// import { getPromotions, createPromotion, updatePromotion, deletePromotion } from '../../services/promotions';
// import { logActivity } from '../../services/activityLogs';
// import { useAuth } from '../../contexts/AuthContext';
// import { Modal } from '../../components/ui/Modal';
// import { Skeleton } from '../../components/ui/Skeleton';
// import type { Promotion } from '../../types';
// import { toast } from 'sonner';

// export function PromotionsPage() {
//   const { profile } = useAuth();
//   const [promotions, setPromotions] = useState<Promotion[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showModal, setShowModal] = useState(false);
//   const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
//   const [deleteId, setDeleteId] = useState<string | null>(null);
//   const [form, setForm] = useState({
//     code: '', label: '', type: 'percentage' as 'percentage' | 'fixed_amount',
//     value: 0, min_purchase: 0, starts_at: '', ends_at: '', is_active: true,
//   });
//   const [saving, setSaving] = useState(false);

//   const load = useCallback(async () => {
//     setLoading(true);
//     const { data } = await getPromotions();
//     setPromotions(data || []);
//     setLoading(false);
//   }, []);

//   useEffect(() => { load(); }, [load]);

//   const openCreate = () => {
//     setEditingPromo(null);
//     setForm({ code: '', label: '', type: 'percentage', value: 0, min_purchase: 0, starts_at: '', ends_at: '', is_active: true });
//     setShowModal(true);
//   };

//   const openEdit = (promo: Promotion) => {
//     setEditingPromo(promo);
//     setForm({
//       code: promo.code, label: promo.label, type: promo.type,
//       value: promo.value, min_purchase: promo.min_purchase || 0,
//       starts_at: promo.starts_at ? format(new Date(promo.starts_at), "yyyy-MM-dd'T'HH:mm") : '',
//       ends_at: promo.ends_at ? format(new Date(promo.ends_at), "yyyy-MM-dd'T'HH:mm") : '',
//       is_active: promo.is_active,
//     });
//     setShowModal(true);
//   };

//   const handleSave = async () => {
//     if (!form.code.trim() || !form.value) { toast.error('Le code et la valeur sont requis'); return; }
//     setSaving(true);
//     const payload = {
//       ...form,
//       starts_at: form.starts_at || null,
//       ends_at: form.ends_at || null,
//       created_by: profile?.id,
//     };

//     if (editingPromo) {
//       const { error } = await updatePromotion(editingPromo.id, payload);
//       if (error) { toast.error('Échec de la mise à jour'); setSaving(false); return; }
//       await logActivity({ action: 'update', entity_type: 'promotion', entity_id: editingPromo.id });
//       toast.success('Promotion mise à jour');
//     } else {
//       const { data, error } = await createPromotion(payload);
//       if (error) { toast.error('Échec de la création: ' + error.message); setSaving(false); return; }
//       await logActivity({ action: 'create', entity_type: 'promotion', entity_id: data?.id });
//       toast.success('Promotion créée');
//     }

//     setSaving(false);
//     setShowModal(false);
//     load();
//   };

//   const handleDelete = async () => {
//     if (!deleteId) return;
//     const { error } = await deletePromotion(deleteId);
//     if (error) { toast.error('Échec de la suppression'); return; }
//     await logActivity({ action: 'delete', entity_type: 'promotion', entity_id: deleteId });
//     toast.success('Promotion supprimée');
//     setDeleteId(null);
//     load();
//   };

//   const toggleActive = async (promo: Promotion) => {
//     await updatePromotion(promo.id, { is_active: !promo.is_active });
//     load();
//   };

//   const isActive = (promo: Promotion) => {
//     if (!promo.is_active) return false;
//     const now = new Date();
//     if (promo.starts_at && new Date(promo.starts_at) > now) return false;
//     if (promo.ends_at && new Date(promo.ends_at) < now) return false;
//     return true;
//   };

//   return (
//     <div className="p-6">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Promotions</h1>
//           <p className="text-sm text-slate-500 mt-0.5">{promotions.length} promotions</p>
//         </div>
//         <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
//           <Plus size={15} />
//           Nouvelle Promotion
//         </button>
//       </div>

//       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//         <table className="w-full text-sm">
//           <thead>
//             <tr className="border-b border-slate-100 bg-slate-50">
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Code</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Libellé</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Remise</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Validité</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
//               <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {loading
//               ? Array.from({ length: 4 }).map((_, i) => (
//                   <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
//                 ))
//               : promotions.map((promo) => (
//                   <tr key={promo.id} className="hover:bg-slate-50 transition-colors">
//                     <td className="px-4 py-3">
//                       <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg font-mono text-xs font-bold text-slate-900">
//                         <Tag size={10} />
//                         {promo.code}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 text-slate-600">{promo.label || '—'}</td>
//                     <td className="px-4 py-3 font-semibold text-slate-900">
//                       {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value} (fixed)`}
//                     </td>
//                     <td className="px-4 py-3 text-xs text-slate-500">
//                       {promo.starts_at ? format(new Date(promo.starts_at), 'MMM d') : 'Now'} →{' '}
//                       {promo.ends_at ? format(new Date(promo.ends_at), 'MMM d, yyyy') : 'No expiry'}
//                     </td>
//                     <td className="px-4 py-3">
//                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isActive(promo) ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
//                         {isActive(promo) ? 'Active' : 'Inactive'}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3">
//                       <div className="flex items-center justify-end gap-1">
//                         <button onClick={() => toggleActive(promo)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
//                           {promo.is_active ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
//                         </button>
//                         <button onClick={() => openEdit(promo)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
//                           <Edit2 size={14} />
//                         </button>
//                         <button onClick={() => setDeleteId(promo.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
//                           <Trash2 size={14} />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//           </tbody>
//         </table>
//         {!loading && promotions.length === 0 && (
//           <div className="text-center py-16">
//             <Tag size={36} className="mx-auto mb-3 text-slate-200" />
//             <p className="text-slate-500 font-medium">Aucune promotion pour le moment</p>
//           </div>
//         )}
//       </div>

//       <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingPromo ? 'Edit Promotion' : 'New Promotion'} size="md">
//         <div className="space-y-4">
//           <div className="grid grid-cols-2 gap-3">
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Code *</label>
//               <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
//                 placeholder="SUMMER20"
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 font-mono uppercase" />
//             </div>
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Label</label>
//               <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
//                 placeholder="Summer sale 2024"
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Type</label>
//               <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percentage' | 'fixed_amount' })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2">
//                 <option value="percentage">Pourcentage (%)</option>
//                 <option value="fixed_amount">Montant fixe</option>
//               </select>
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Valeur *</label>
//               <input type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Montant minimum d'achat</label>
//               <input type="number" min="0" value={form.min_purchase} onChange={(e) => setForm({ ...form, min_purchase: parseFloat(e.target.value) || 0 })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Date de début</label>
//               <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Date de fin</label>
//               <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//             </div>
//           </div>
//           <label className="flex items-center gap-2 cursor-pointer">
//             <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" />
//             <span className="text-sm text-slate-700">Actif</span>
//           </label>
//           <div className="flex gap-3 pt-2">
//             <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
//               {saving ? 'Saving...' : editingPromo ? 'Update' : 'Create'}
//             </button>
//             <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
//           </div>
//         </div>
//       </Modal>

//       <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Promotion" size="sm">
//         <p className="text-sm text-slate-600 mb-5">Supprimer ce code promo ? Cette action est irréversible.</p>
//         <div className="flex gap-3">
//           <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">Supprimer</button>
//           <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Annuler</button>
//         </div>
//       </Modal>
//     </div>
//   );
// }
