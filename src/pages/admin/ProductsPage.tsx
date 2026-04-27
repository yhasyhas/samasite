import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, CreditCard as Edit2, Trash2, Package, Star, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getProducts, deleteProduct, updateProduct } from '../../services/products';
import { getCategories } from '../../services/categories';
import { logActivity } from '../../services/activityLogs';
import { formatCurrency, slugify } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { ImageUploader } from '../../components/ui/ImageUploader';
import type { Product, Category } from '../../types';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function ProductsPage() {
  const { settings } = useTheme();
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Product>>({
    name: '', sku: '', slug: '', description: '', short_description: '',
    price: 0, compare_at_price: null, stock_qty: 0,
    category_id: '', is_active: true, is_featured: false, images: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await getProducts({
      search: search || undefined,
      categoryId: categoryFilter || undefined,
      active: undefined,
    });
    setProducts(data || []);
    setLoading(false);
  }, [search, categoryFilter]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    getCategories(false).then(({ data }) => setCategories(data || []));
  }, []);

  const openCreate = () => {
    setEditingProduct(null);
    setForm({
      name: '', sku: '', slug: '', description: '', short_description: '',
      price: 0, compare_at_price: null, stock_qty: 0,
      category_id: '', is_active: true, is_featured: false, images: [],
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      slug: product.slug,
      description: product.description,
      short_description: product.short_description,
      price: product.price,
      compare_at_price: product.compare_at_price,
      stock_qty: product.stock_qty,
      category_id: product.category_id,
      is_active: product.is_active,
      is_featured: product.is_featured,
      images: product.images,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = 'Le nom est requis';
    if (!form.sku?.trim()) errors.sku = 'La référence est requise';
    if (!form.price && form.price !== 0) errors.price = 'Le prix est requis';
    if ((form.price ?? 0) < 0) errors.price = 'Le prix doit être positif';
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSaving(true);
    const slug = form.slug || slugify(form.name || '');

    const payload = {
      name: form.name,
      sku: form.sku,
      slug,
      description: form.description,
      short_description: form.short_description,
      price: form.price,
      compare_at_price: form.compare_at_price ?? null,
      stock_qty: form.stock_qty,
      category_id: form.category_id || null,
      images: form.images,
      is_active: form.is_active,
      is_featured: form.is_featured,
    };

    if (editingProduct) {
      const { error } = await updateProduct(editingProduct.id, payload);
      if (error) {
        console.error('Erreur update produit:', error);
        toast.error('Échec de la mise à jour du produit');
        setSaving(false);
        return;
      }
      await logActivity({ action: 'update', entity_type: 'product', entity_id: editingProduct.id, details: { name: form.name } });
      toast.success('Produit mis à jour');
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...payload, created_by: profile?.id })
        .select()
        .maybeSingle();
      if (error) {
        toast.error('Échec de la création du produit: ' + error.message);
        setSaving(false);
        return;
      }
      await logActivity({ action: 'create', entity_type: 'product', entity_id: data?.id, details: { name: form.name } });
      toast.success('Produit créé');
    }

    setSaving(false);
    setShowModal(false);
    loadProducts();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteProduct(deleteId);
    if (error) { toast.error('Échec de la suppression du produit'); return; }
    await logActivity({ action: 'delete', entity_type: 'product', entity_id: deleteId });
    toast.success('Produit supprimé');
    setDeleteId(null);
    loadProducts();
  };

  const toggleActive = async (product: Product) => {
    await updateProduct(product.id, { is_active: !product.is_active });
    loadProducts();
  };

  const stockLabel = (qty: number) =>
    qty === 0 ? 'Out of Stock' : qty <= 5 ? 'Low Stock' : 'In Stock';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produits</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.length} produit{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Plus size={15} />
          Ajouter un produit
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher des produits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Produit</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Référence</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Catégorie</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Prix</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Stock</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                            {product.images?.[0] ? (
                              <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={16} className="text-slate-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{product.name}</p>
                            {product.is_featured && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                <Star size={10} fill="currentColor" /> À la une
                              </span>
                            )}
                            {product.compare_at_price && product.compare_at_price > product.price && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 ml-2">
                                En promo
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.sku}</td>
                      <td className="px-4 py-3 text-slate-600">{product.category?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900">{formatCurrency(product.price, settings.currency)}</span>
                        {product.compare_at_price && product.compare_at_price > product.price && (
                          <span className="ml-2 text-xs line-through text-slate-400">
                            {formatCurrency(product.compare_at_price, settings.currency)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={stockLabel(product.stock_qty)} type="stock" />
                        <span className="ml-1 text-xs text-slate-400">({product.stock_qty})</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {product.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/product/${product.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            <Eye size={14} />
                          </Link>
                          <button
                            onClick={() => toggleActive(product)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            {product.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => openEdit(product)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteId(product.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!loading && products.length === 0 && (
          <div className="text-center py-16">
            <Package size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 font-medium">Aucun produit trouvé</p>
            <button onClick={openCreate} className="mt-3 text-sm text-slate-900 underline">Ajoutez votre premier produit</button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'} size="2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 block mb-1">Nom *</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.name ? 'border-red-500' : 'border-slate-200'}`}
              />
              {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Référence *</label>
              <input
                type="text"
                value={form.sku || ''}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.sku ? 'border-red-500' : 'border-slate-200'}`}
              />
              {formErrors.sku && <p className="text-xs text-red-500 mt-1">{formErrors.sku}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Identifiant URL</label>
              <input
                type="text"
                value={form.slug || ''}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Prix *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price || ''}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.price ? 'border-red-500' : 'border-slate-200'}`}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Ancien prix (prix barré)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.compare_at_price ?? ''}
                onChange={(e) => setForm({ ...form, compare_at_price: e.target.value === '' ? null : parseFloat(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
              <p className="text-xs text-slate-500 mt-1">Laisser vide si pas de promotion. Géré automatiquement par les promotions.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Quantité en stock</label>
              <input
                type="number"
                min="0"
                value={form.stock_qty || 0}
                onChange={(e) => setForm({ ...form, stock_qty: parseInt(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Catégorie</label>
              <select
                value={form.category_id || ''}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
              >
                <option value="">Aucune catégorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 block mb-1">Description courte</label>
              <input
                type="text"
                value={form.short_description || ''}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 block mb-1">Images du produit</label>
              <ImageUploader
                value={form.images || []}
                onChange={(images) => setForm({ ...form, images })}
                maxFiles={5}
                folder="products"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active ?? true}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-slate-700">Actif</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_featured ?? false}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-slate-700">À la une</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Enregistrement...' : editingProduct ? 'Mettre à jour' : 'Créer'}
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Supprimer le produit" size="sm">
        <p className="text-sm text-slate-600 mb-5">Voulez-vous vraiment supprimer ce produit ? Cette action ne peut pas être annulée.</p>
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Supprimer
          </button>
          <button
            onClick={() => setDeleteId(null)}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      </Modal>
    </div>
  );
}