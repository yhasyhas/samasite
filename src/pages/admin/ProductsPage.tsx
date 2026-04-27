import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, CreditCard as Edit2, Trash2, Package, Star, Eye, EyeOff, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getProducts, deleteProduct, updateProduct } from '../../services/products';
import { getCategories } from '../../services/categories';
import { logActivity, logActivityWithDiff } from '../../services/activityLogs';
import { formatCurrency, slugify } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { ImageUploader } from '../../components/ui/ImageUploader';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { exportProductsToCSV, parseProductsCSV, importProducts, downloadProductsTemplate, type CSVRow } from '../../services/productsExportImport';
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

  // Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([]);
  const [parseErrors, setParseErrors] = useState<{ row: number; sku: string; errors: string[] }[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: number; details: string[] } | null>(null);

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

      const after = { ...editingProduct, ...payload };
      await logActivityWithDiff(
        { action: 'update', entity_type: 'product', entity_id: editingProduct.id },
        editingProduct,
        after
      );

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
    const newState = !product.is_active;
    await updateProduct(product.id, { is_active: newState });

    await logActivityWithDiff(
      { action: 'status_change', entity_type: 'product', entity_id: product.id },
      { is_active: product.is_active },
      { is_active: newState }
    );

    loadProducts();
  };

  const stockLabel = (qty: number) =>
    qty === 0 ? 'Out of Stock' : qty <= 5 ? 'Low Stock' : 'In Stock';

  /* ============================================================
     IMPORT HANDLERS
     ============================================================ */

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      const result = parseProductsCSV(text);
      setParsedRows(result.valid);
      setParseErrors(result.errors);
      setImportStep('preview');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setImportLoading(true);
    const result = await importProducts(parsedRows, categories);
    setImportResult(result);
    setImportLoading(false);
    setImportStep('result');

    await logActivity({
      action: 'import',
      entity_type: 'product',
      details: { created: result.created, updated: result.updated, errors: result.errors },
    });

    if (result.errors === 0) {
      toast.success(`Import terminé : ${result.created} créés, ${result.updated} mis à jour`);
    } else {
      toast.warning(`Import terminé avec ${result.errors} erreurs`);
    }

    loadProducts();
  };

  const resetImport = () => {
    setImportStep('upload');
    setCsvText('');
    setParsedRows([]);
    setParseErrors([]);
    setImportResult(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produits</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.length} produit{products.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportProductsToCSV(products, categories)}
            disabled={products.length === 0}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            <Download size={15} /> Exporter CSV
          </button>
          <button
            onClick={() => { resetImport(); setImportModalOpen(true); }}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            <Upload size={15} /> Importer CSV
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Plus size={15} /> Ajouter un produit
          </button>
        </div>
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
                placeholder="Phrase d'accroche visible sur les cartes produit"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
              <RichTextEditor
                value={form.description || ''}
                onChange={(html) => setForm({ ...form, description: html })}
                placeholder="Description complète du produit..."
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

      {/* ==================== IMPORT MODAL ==================== */}
      <Modal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} title="Import CSV des produits" size="2xl">
        {importStep === 'upload' && (
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Comment ça marche ?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Téléchargez le <button onClick={downloadProductsTemplate} className="underline font-semibold hover:text-blue-600">template CSV</button> pour voir le format attendu</li>
                <li>Remplissez vos produits dans Excel / Google Sheets</li>
                <li>Exportez en CSV (UTF-8) et importez ici</li>
                <li>Si le <strong>SKU</strong> existe déjà → le produit est <strong>mis à jour</strong></li>
                <li>Si le <strong>SKU</strong> est nouveau → le produit est <strong>créé</strong></li>
                <li>Les images : séparez les URLs par <code>|</code> (pipe)</li>
                <li>Les catégories : indiquez le <strong>nom exact</strong> de la catégorie</li>
              </ul>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-400 transition-colors">
              <FileSpreadsheet size={40} className="mx-auto mb-3 text-slate-400" />
              <p className="text-sm font-medium text-slate-700 mb-1">Déposez votre fichier CSV ici</p>
              <p className="text-xs text-slate-500 mb-4">ou cliquez pour sélectionner</p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <Upload size={14} /> Sélectionner un fichier
              </label>
            </div>
          </div>
        )}

        {importStep === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{parsedRows.length} ligne{parsedRows.length !== 1 ? 's' : ''} valide{parsedRows.length !== 1 ? 's' : ''}</p>
                {parseErrors.length > 0 && (
                  <p className="text-xs text-red-600">{parseErrors.length} ligne{parseErrors.length !== 1 ? 's' : ''} avec erreur</p>
                )}
              </div>
              <button onClick={resetImport} className="text-xs text-slate-500 hover:text-slate-900 underline">Changer de fichier</button>
            </div>

            {parseErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-h-32 overflow-y-auto">
                {parseErrors.map((err) => (
                  <div key={err.row} className="flex items-start gap-2 text-xs text-red-700 mb-1">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    <span>Ligne {err.row} (SKU: {err.sku}) — {err.errors.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">SKU</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Nom</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Prix</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Stock</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Catégorie</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Images</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.slice(0, 20).map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-mono font-medium text-slate-900">{row.sku}</td>
                      <td className="px-3 py-2 text-slate-700">{row.name}</td>
                      <td className="px-3 py-2 text-slate-600">{row.price.toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-2 text-slate-600">{row.stock_qty}</td>
                      <td className="px-3 py-2 text-slate-600">{row.category_name || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{row.images.length > 0 ? `${row.images.length} img` : '—'}</td>
                    </tr>
                  ))}
                  {parsedRows.length > 20 && (
                    <tr><td colSpan={6} className="px-3 py-2 text-center text-slate-400 italic">... et {parsedRows.length - 20} lignes supplémentaires</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleImport}
                disabled={parsedRows.length === 0 || importLoading}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {importLoading ? 'Import en cours...' : `Importer ${parsedRows.length} produit${parsedRows.length !== 1 ? 's' : ''}`}
              </button>
              <button onClick={() => setImportModalOpen(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Annuler</button>
            </div>
          </div>
        )}

        {importStep === 'result' && importResult && (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="bg-green-50 rounded-xl p-4 min-w-[100px]">
                <p className="text-2xl font-bold text-green-700">{importResult.created}</p>
                <p className="text-xs text-green-600">Créés</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 min-w-[100px]">
                <p className="text-2xl font-bold text-blue-700">{importResult.updated}</p>
                <p className="text-xs text-blue-600">Mis à jour</p>
              </div>
              {importResult.errors > 0 && (
                <div className="bg-red-50 rounded-xl p-4 min-w-[100px]">
                  <p className="text-2xl font-bold text-red-700">{importResult.errors}</p>
                  <p className="text-xs text-red-600">Erreurs</p>
                </div>
              )}
            </div>

            {importResult.errors > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-h-40 overflow-y-auto text-left">
                {importResult.details.filter((d) => d.includes('Échec')).map((detail, i) => (
                  <p key={i} className="text-xs text-red-700 mb-1">{detail}</p>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={() => { resetImport(); setImportModalOpen(false); }} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
                Terminer
              </button>
              {importResult.errors > 0 && (
                <button onClick={resetImport} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
                  Réessayer
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// import React, { useEffect, useState, useCallback } from 'react';
// import { Plus, Search, CreditCard as Edit2, Trash2, Package, Star, Eye, EyeOff } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import { getProducts, deleteProduct, updateProduct } from '../../services/products';
// import { getCategories } from '../../services/categories';
// import { logActivity, logActivityWithDiff } from '../../services/activityLogs';
// import { formatCurrency, slugify } from '../../lib/utils';
// import { useTheme } from '../../contexts/ThemeContext';
// import { StatusBadge } from '../../components/ui/Badge';
// import { Modal } from '../../components/ui/Modal';
// import { Skeleton } from '../../components/ui/Skeleton';
// import { ImageUploader } from '../../components/ui/ImageUploader';
// import { RichTextEditor } from '../../components/ui/RichTextEditor';
// import type { Product, Category } from '../../types';
// import { toast } from 'sonner';
// import { supabase } from '../../lib/supabase';
// import { useAuth } from '../../contexts/AuthContext';

// export function ProductsPage() {
//   const { settings } = useTheme();
//   const { profile } = useAuth();
//   const [products, setProducts] = useState<Product[]>([]);
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [categoryFilter, setCategoryFilter] = useState('');
//   const [showModal, setShowModal] = useState(false);
//   const [editingProduct, setEditingProduct] = useState<Product | null>(null);
//   const [deleteId, setDeleteId] = useState<string | null>(null);
//   const [form, setForm] = useState<Partial<Product>>({
//     name: '', sku: '', slug: '', description: '', short_description: '',
//     price: 0, compare_at_price: null, stock_qty: 0,
//     category_id: '', is_active: true, is_featured: false, images: [],
//   });
//   const [formErrors, setFormErrors] = useState<Record<string, string>>({});
//   const [saving, setSaving] = useState(false);

//   const loadProducts = useCallback(async () => {
//     setLoading(true);
//     const { data } = await getProducts({
//       search: search || undefined,
//       categoryId: categoryFilter || undefined,
//       active: undefined,
//     });
//     setProducts(data || []);
//     setLoading(false);
//   }, [search, categoryFilter]);

//   useEffect(() => { loadProducts(); }, [loadProducts]);

//   useEffect(() => {
//     getCategories(false).then(({ data }) => setCategories(data || []));
//   }, []);

//   const openCreate = () => {
//     setEditingProduct(null);
//     setForm({
//       name: '', sku: '', slug: '', description: '', short_description: '',
//       price: 0, compare_at_price: null, stock_qty: 0,
//       category_id: '', is_active: true, is_featured: false, images: [],
//     });
//     setFormErrors({});
//     setShowModal(true);
//   };

//   const openEdit = (product: Product) => {
//     setEditingProduct(product);
//     setForm({
//       name: product.name,
//       sku: product.sku,
//       slug: product.slug,
//       description: product.description,
//       short_description: product.short_description,
//       price: product.price,
//       compare_at_price: product.compare_at_price,
//       stock_qty: product.stock_qty,
//       category_id: product.category_id,
//       is_active: product.is_active,
//       is_featured: product.is_featured,
//       images: product.images,
//     });
//     setFormErrors({});
//     setShowModal(true);
//   };

//   const validateForm = () => {
//     const errors: Record<string, string> = {};
//     if (!form.name?.trim()) errors.name = 'Le nom est requis';
//     if (!form.sku?.trim()) errors.sku = 'La référence est requise';
//     if (!form.price && form.price !== 0) errors.price = 'Le prix est requis';
//     if ((form.price ?? 0) < 0) errors.price = 'Le prix doit être positif';
//     return errors;
//   };

//   const handleSave = async () => {
//     const errors = validateForm();
//     if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

//     setSaving(true);
//     const slug = form.slug || slugify(form.name || '');

//     const payload = {
//       name: form.name,
//       sku: form.sku,
//       slug,
//       description: form.description,
//       short_description: form.short_description,
//       price: form.price,
//       compare_at_price: form.compare_at_price ?? null,
//       stock_qty: form.stock_qty,
//       category_id: form.category_id || null,
//       images: form.images,
//       is_active: form.is_active,
//       is_featured: form.is_featured,
//     };

//     if (editingProduct) {
//       const { error } = await updateProduct(editingProduct.id, payload);
//       if (error) {
//         console.error('Erreur update produit:', error);
//         toast.error('Échec de la mise à jour du produit');
//         setSaving(false);
//         return;
//       }

//       // 🔥 DIFF TRACKING
//       const after = { ...editingProduct, ...payload };
//       await logActivityWithDiff(
//         { action: 'update', entity_type: 'product', entity_id: editingProduct.id },
//         editingProduct,
//         after
//       );

//       toast.success('Produit mis à jour');
//     } else {
//       const { data, error } = await supabase
//         .from('products')
//         .insert({ ...payload, created_by: profile?.id })
//         .select()
//         .maybeSingle();
//       if (error) {
//         toast.error('Échec de la création du produit: ' + error.message);
//         setSaving(false);
//         return;
//       }
//       await logActivity({ action: 'create', entity_type: 'product', entity_id: data?.id, details: { name: form.name } });
//       toast.success('Produit créé');
//     }

//     setSaving(false);
//     setShowModal(false);
//     loadProducts();
//   };

//   const handleDelete = async () => {
//     if (!deleteId) return;
//     const { error } = await deleteProduct(deleteId);
//     if (error) { toast.error('Échec de la suppression du produit'); return; }
//     await logActivity({ action: 'delete', entity_type: 'product', entity_id: deleteId });
//     toast.success('Produit supprimé');
//     setDeleteId(null);
//     loadProducts();
//   };

//   const toggleActive = async (product: Product) => {
//     const newState = !product.is_active;
//     await updateProduct(product.id, { is_active: newState });
    
//     // 🔥 DIFF TRACKING pour activation/désactivation rapide
//     await logActivityWithDiff(
//       { action: 'status_change', entity_type: 'product', entity_id: product.id },
//       { is_active: product.is_active },
//       { is_active: newState }
//     );
    
//     loadProducts();
//   };

//   const stockLabel = (qty: number) =>
//     qty === 0 ? 'Out of Stock' : qty <= 5 ? 'Low Stock' : 'In Stock';

//   return (
//     <div className="p-6">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Produits</h1>
//           <p className="text-sm text-slate-500 mt-0.5">{products.length} produit{products.length !== 1 ? 's' : ''}</p>
//         </div>
//         <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
//           <Plus size={15} /> Ajouter un produit
//         </button>
//       </div>

//       <div className="flex flex-col sm:flex-row gap-3 mb-5">
//         <div className="relative flex-1">
//           <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//           <input type="text" placeholder="Rechercher des produits..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
//         </div>
//         <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
//           <option value="">Toutes les catégories</option>
//           {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
//         </select>
//       </div>

//       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead>
//               <tr className="border-b border-slate-100 bg-slate-50">
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Produit</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Référence</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Catégorie</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Prix</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Stock</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
//                 <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {loading
//                 ? Array.from({ length: 5 }).map((_, i) => (
//                     <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
//                   ))
//                 : products.map((product) => (
//                     <tr key={product.id} className="hover:bg-slate-50 transition-colors">
//                       <td className="px-4 py-3">
//                         <div className="flex items-center gap-3">
//                           <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
//                             {product.images?.[0] ? (
//                               <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
//                             ) : (
//                               <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-slate-300" /></div>
//                             )}
//                           </div>
//                           <div>
//                             <p className="font-medium text-slate-900">{product.name}</p>
//                             {product.is_featured && <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Star size={10} fill="currentColor" /> À la une</span>}
//                             {product.compare_at_price && product.compare_at_price > product.price && <span className="inline-flex items-center gap-1 text-xs text-green-600 ml-2">En promo</span>}
//                           </div>
//                         </div>
//                       </td>
//                       <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.sku}</td>
//                       <td className="px-4 py-3 text-slate-600">{product.category?.name || '—'}</td>
//                       <td className="px-4 py-3">
//                         <span className="font-semibold text-slate-900">{formatCurrency(product.price, settings.currency)}</span>
//                         {product.compare_at_price && product.compare_at_price > product.price && <span className="ml-2 text-xs line-through text-slate-400">{formatCurrency(product.compare_at_price, settings.currency)}</span>}
//                       </td>
//                       <td className="px-4 py-3"><StatusBadge status={stockLabel(product.stock_qty)} type="stock" /><span className="ml-1 text-xs text-slate-400">({product.stock_qty})</span></td>
//                       <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{product.is_active ? 'Actif' : 'Inactif'}</span></td>
//                       <td className="px-4 py-3">
//                         <div className="flex items-center justify-end gap-1">
//                           <Link to={`/product/${product.slug}`} target="_blank" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Eye size={14} /></Link>
//                           <button onClick={() => toggleActive(product)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">{product.is_active ? <EyeOff size={14} /> : <Eye size={14} />}</button>
//                           <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Edit2 size={14} /></button>
//                           <button onClick={() => setDeleteId(product.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//             </tbody>
//           </table>
//         </div>
//         {!loading && products.length === 0 && (
//           <div className="text-center py-16"><Package size={40} className="mx-auto mb-3 text-slate-200" /><p className="text-slate-500 font-medium">Aucun produit trouvé</p><button onClick={openCreate} className="mt-3 text-sm text-slate-900 underline">Ajoutez votre premier produit</button></div>
//         )}
//       </div>

//       <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'} size="2xl">
//         <div className="space-y-4">
//           <div className="grid grid-cols-2 gap-4">
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Nom *</label>
//               <input type="text" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.name ? 'border-red-500' : 'border-slate-200'}`} />
//               {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Référence *</label>
//               <input type="text" value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.sku ? 'border-red-500' : 'border-slate-200'}`} />
//               {formErrors.sku && <p className="text-xs text-red-500 mt-1">{formErrors.sku}</p>}
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Identifiant URL</label>
//               <input type="text" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Prix *</label>
//               <input type="number" min="0" step="0.01" value={form.price || ''} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.price ? 'border-red-500' : 'border-slate-200'}`} />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Ancien prix (prix barré)</label>
//               <input type="number" min="0" step="0.01" value={form.compare_at_price ?? ''} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value === '' ? null : parseFloat(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//               <p className="text-xs text-slate-500 mt-1">Laisser vide si pas de promotion. Géré automatiquement par les promotions.</p>
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Quantité en stock</label>
//               <input type="number" min="0" value={form.stock_qty || 0} onChange={(e) => setForm({ ...form, stock_qty: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Catégorie</label>
//               <select value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2">
//                 <option value="">Aucune catégorie</option>
//                 {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
//               </select>
//             </div>
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Description courte</label>
//               <input type="text" value={form.short_description || ''} onChange={(e) => setForm({ ...form, short_description: e.target.value })} placeholder="Phrase d'accroche visible sur les cartes produit" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//             </div>
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
//               <RichTextEditor value={form.description || ''} onChange={(html) => setForm({ ...form, description: html })} placeholder="Description complète du produit..." />
//             </div>
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Images du produit</label>
//               <ImageUploader value={form.images || []} onChange={(images) => setForm({ ...form, images })} maxFiles={5} folder="products" />
//             </div>
//             <div className="flex items-center gap-4">
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" />
//                 <span className="text-sm text-slate-700">Actif</span>
//               </label>
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="checkbox" checked={form.is_featured ?? false} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="w-4 h-4 rounded" />
//                 <span className="text-sm text-slate-700">À la une</span>
//               </label>
//             </div>
//           </div>
//           <div className="flex gap-3 pt-2">
//             <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
//               {saving ? 'Enregistrement...' : editingProduct ? 'Mettre à jour' : 'Créer'}
//             </button>
//             <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button>
//           </div>
//         </div>
//       </Modal>

//       <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Supprimer le produit" size="sm">
//         <p className="text-sm text-slate-600 mb-5">Voulez-vous vraiment supprimer ce produit ? Cette action ne peut pas être annulée.</p>
//         <div className="flex gap-3">
//           <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">Supprimer</button>
//           <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// import React, { useEffect, useState, useCallback } from 'react';
// import { Plus, Search, CreditCard as Edit2, Trash2, Package, Star, Eye, EyeOff } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import { getProducts, deleteProduct, updateProduct } from '../../services/products';
// import { getCategories } from '../../services/categories';
// import { logActivity } from '../../services/activityLogs';
// import { formatCurrency, slugify } from '../../lib/utils';
// import { useTheme } from '../../contexts/ThemeContext';
// import { StatusBadge } from '../../components/ui/Badge';
// import { Modal } from '../../components/ui/Modal';
// import { Skeleton } from '../../components/ui/Skeleton';
// import { ImageUploader } from '../../components/ui/ImageUploader';
// import { RichTextEditor } from '../../components/ui/RichTextEditor';
// import type { Product, Category } from '../../types';
// import { toast } from 'sonner';
// import { supabase } from '../../lib/supabase';
// import { useAuth } from '../../contexts/AuthContext';

// export function ProductsPage() {
//   const { settings } = useTheme();
//   const { profile } = useAuth();
//   const [products, setProducts] = useState<Product[]>([]);
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [categoryFilter, setCategoryFilter] = useState('');
//   const [showModal, setShowModal] = useState(false);
//   const [editingProduct, setEditingProduct] = useState<Product | null>(null);
//   const [deleteId, setDeleteId] = useState<string | null>(null);
//   const [form, setForm] = useState<Partial<Product>>({
//     name: '', sku: '', slug: '', description: '', short_description: '',
//     price: 0, compare_at_price: null, stock_qty: 0,
//     category_id: '', is_active: true, is_featured: false, images: [],
//   });
//   const [formErrors, setFormErrors] = useState<Record<string, string>>({});
//   const [saving, setSaving] = useState(false);

//   const loadProducts = useCallback(async () => {
//     setLoading(true);
//     const { data } = await getProducts({
//       search: search || undefined,
//       categoryId: categoryFilter || undefined,
//       active: undefined,
//     });
//     setProducts(data || []);
//     setLoading(false);
//   }, [search, categoryFilter]);

//   useEffect(() => { loadProducts(); }, [loadProducts]);

//   useEffect(() => {
//     getCategories(false).then(({ data }) => setCategories(data || []));
//   }, []);

//   const openCreate = () => {
//     setEditingProduct(null);
//     setForm({
//       name: '', sku: '', slug: '', description: '', short_description: '',
//       price: 0, compare_at_price: null, stock_qty: 0,
//       category_id: '', is_active: true, is_featured: false, images: [],
//     });
//     setFormErrors({});
//     setShowModal(true);
//   };

//   const openEdit = (product: Product) => {
//     setEditingProduct(product);
//     setForm({
//       name: product.name,
//       sku: product.sku,
//       slug: product.slug,
//       description: product.description,
//       short_description: product.short_description,
//       price: product.price,
//       compare_at_price: product.compare_at_price,
//       stock_qty: product.stock_qty,
//       category_id: product.category_id,
//       is_active: product.is_active,
//       is_featured: product.is_featured,
//       images: product.images,
//     });
//     setFormErrors({});
//     setShowModal(true);
//   };

//   const validateForm = () => {
//     const errors: Record<string, string> = {};
//     if (!form.name?.trim()) errors.name = 'Le nom est requis';
//     if (!form.sku?.trim()) errors.sku = 'La référence est requise';
//     if (!form.price && form.price !== 0) errors.price = 'Le prix est requis';
//     if ((form.price ?? 0) < 0) errors.price = 'Le prix doit être positif';
//     return errors;
//   };

//   const handleSave = async () => {
//     const errors = validateForm();
//     if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

//     setSaving(true);
//     const slug = form.slug || slugify(form.name || '');

//     const payload = {
//       name: form.name,
//       sku: form.sku,
//       slug,
//       description: form.description,
//       short_description: form.short_description,
//       price: form.price,
//       compare_at_price: form.compare_at_price ?? null,
//       stock_qty: form.stock_qty,
//       category_id: form.category_id || null,
//       images: form.images,
//       is_active: form.is_active,
//       is_featured: form.is_featured,
//     };

//     if (editingProduct) {
//       const { error } = await updateProduct(editingProduct.id, payload);
//       if (error) {
//         console.error('Erreur update produit:', error);
//         toast.error('Échec de la mise à jour du produit');
//         setSaving(false);
//         return;
//       }
//       await logActivity({ action: 'update', entity_type: 'product', entity_id: editingProduct.id, details: { name: form.name } });
//       toast.success('Produit mis à jour');
//     } else {
//       const { data, error } = await supabase
//         .from('products')
//         .insert({ ...payload, created_by: profile?.id })
//         .select()
//         .maybeSingle();
//       if (error) {
//         toast.error('Échec de la création du produit: ' + error.message);
//         setSaving(false);
//         return;
//       }
//       await logActivity({ action: 'create', entity_type: 'product', entity_id: data?.id, details: { name: form.name } });
//       toast.success('Produit créé');
//     }

//     setSaving(false);
//     setShowModal(false);
//     loadProducts();
//   };

//   const handleDelete = async () => {
//     if (!deleteId) return;
//     const { error } = await deleteProduct(deleteId);
//     if (error) { toast.error('Échec de la suppression du produit'); return; }
//     await logActivity({ action: 'delete', entity_type: 'product', entity_id: deleteId });
//     toast.success('Produit supprimé');
//     setDeleteId(null);
//     loadProducts();
//   };

//   const toggleActive = async (product: Product) => {
//     await updateProduct(product.id, { is_active: !product.is_active });
//     loadProducts();
//   };

//   const stockLabel = (qty: number) =>
//     qty === 0 ? 'Out of Stock' : qty <= 5 ? 'Low Stock' : 'In Stock';

//   return (
//     <div className="p-6">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Produits</h1>
//           <p className="text-sm text-slate-500 mt-0.5">{products.length} produit{products.length !== 1 ? 's' : ''}</p>
//         </div>
//         <button
//           onClick={openCreate}
//           className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
//         >
//           <Plus size={15} />
//           Ajouter un produit
//         </button>
//       </div>

//       <div className="flex flex-col sm:flex-row gap-3 mb-5">
//         <div className="relative flex-1">
//           <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//           <input
//             type="text"
//             placeholder="Rechercher des produits..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
//           />
//         </div>
//         <select
//           value={categoryFilter}
//           onChange={(e) => setCategoryFilter(e.target.value)}
//           className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
//         >
//           <option value="">Toutes les catégories</option>
//           {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
//         </select>
//       </div>

//       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead>
//               <tr className="border-b border-slate-100 bg-slate-50">
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Produit</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Référence</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Catégorie</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Prix</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Stock</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
//                 <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {loading
//                 ? Array.from({ length: 5 }).map((_, i) => (
//                     <tr key={i}>
//                       {Array.from({ length: 7 }).map((_, j) => (
//                         <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
//                       ))}
//                     </tr>
//                   ))
//                 : products.map((product) => (
//                     <tr key={product.id} className="hover:bg-slate-50 transition-colors">
//                       <td className="px-4 py-3">
//                         <div className="flex items-center gap-3">
//                           <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
//                             {product.images?.[0] ? (
//                               <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
//                             ) : (
//                               <div className="w-full h-full flex items-center justify-center">
//                                 <Package size={16} className="text-slate-300" />
//                               </div>
//                             )}
//                           </div>
//                           <div>
//                             <p className="font-medium text-slate-900">{product.name}</p>
//                             {product.is_featured && (
//                               <span className="inline-flex items-center gap-1 text-xs text-amber-600">
//                                 <Star size={10} fill="currentColor" /> À la une
//                               </span>
//                             )}
//                             {product.compare_at_price && product.compare_at_price > product.price && (
//                               <span className="inline-flex items-center gap-1 text-xs text-green-600 ml-2">
//                                 En promo
//                               </span>
//                             )}
//                           </div>
//                         </div>
//                       </td>
//                       <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.sku}</td>
//                       <td className="px-4 py-3 text-slate-600">{product.category?.name || '—'}</td>
//                       <td className="px-4 py-3">
//                         <span className="font-semibold text-slate-900">{formatCurrency(product.price, settings.currency)}</span>
//                         {product.compare_at_price && product.compare_at_price > product.price && (
//                           <span className="ml-2 text-xs line-through text-slate-400">
//                             {formatCurrency(product.compare_at_price, settings.currency)}
//                           </span>
//                         )}
//                       </td>
//                       <td className="px-4 py-3">
//                         <StatusBadge status={stockLabel(product.stock_qty)} type="stock" />
//                         <span className="ml-1 text-xs text-slate-400">({product.stock_qty})</span>
//                       </td>
//                       <td className="px-4 py-3">
//                         <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
//                           {product.is_active ? 'Actif' : 'Inactif'}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3">
//                         <div className="flex items-center justify-end gap-1">
//                           <Link
//                             to={`/product/${product.slug}`}
//                             target="_blank"
//                             className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
//                           >
//                             <Eye size={14} />
//                           </Link>
//                           <button
//                             onClick={() => toggleActive(product)}
//                             className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
//                           >
//                             {product.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
//                           </button>
//                           <button
//                             onClick={() => openEdit(product)}
//                             className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
//                           >
//                             <Edit2 size={14} />
//                           </button>
//                           <button
//                             onClick={() => setDeleteId(product.id)}
//                             className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
//                           >
//                             <Trash2 size={14} />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//             </tbody>
//           </table>
//         </div>
//         {!loading && products.length === 0 && (
//           <div className="text-center py-16">
//             <Package size={40} className="mx-auto mb-3 text-slate-200" />
//             <p className="text-slate-500 font-medium">Aucun produit trouvé</p>
//             <button onClick={openCreate} className="mt-3 text-sm text-slate-900 underline">Ajoutez votre premier produit</button>
//           </div>
//         )}
//       </div>

//       {/* Create/Edit Modal */}
//       <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'} size="2xl">
//         <div className="space-y-4">
//           <div className="grid grid-cols-2 gap-4">
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Nom *</label>
//               <input
//                 type="text"
//                 value={form.name || ''}
//                 onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
//                 className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.name ? 'border-red-500' : 'border-slate-200'}`}
//               />
//               {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Référence *</label>
//               <input
//                 type="text"
//                 value={form.sku || ''}
//                 onChange={(e) => setForm({ ...form, sku: e.target.value })}
//                 className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.sku ? 'border-red-500' : 'border-slate-200'}`}
//               />
//               {formErrors.sku && <p className="text-xs text-red-500 mt-1">{formErrors.sku}</p>}
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Identifiant URL</label>
//               <input
//                 type="text"
//                 value={form.slug || ''}
//                 onChange={(e) => setForm({ ...form, slug: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Prix *</label>
//               <input
//                 type="number"
//                 min="0"
//                 step="0.01"
//                 value={form.price || ''}
//                 onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
//                 className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.price ? 'border-red-500' : 'border-slate-200'}`}
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Ancien prix (prix barré)</label>
//               <input
//                 type="number"
//                 min="0"
//                 step="0.01"
//                 value={form.compare_at_price ?? ''}
//                 onChange={(e) => setForm({ ...form, compare_at_price: e.target.value === '' ? null : parseFloat(e.target.value) })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//               />
//               <p className="text-xs text-slate-500 mt-1">Laisser vide si pas de promotion. Géré automatiquement par les promotions.</p>
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Quantité en stock</label>
//               <input
//                 type="number"
//                 min="0"
//                 value={form.stock_qty || 0}
//                 onChange={(e) => setForm({ ...form, stock_qty: parseInt(e.target.value) || 0 })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Catégorie</label>
//               <select
//                 value={form.category_id || ''}
//                 onChange={(e) => setForm({ ...form, category_id: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//               >
//                 <option value="">Aucune catégorie</option>
//                 {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
//               </select>
//             </div>
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Description courte</label>
//               <input
//                 type="text"
//                 value={form.short_description || ''}
//                 onChange={(e) => setForm({ ...form, short_description: e.target.value })}
//                 placeholder="Phrase d'accroche visible sur les cartes produit"
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//               />
//             </div>
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
//               <RichTextEditor
//                 value={form.description || ''}
//                 onChange={(html) => setForm({ ...form, description: html })}
//                 placeholder="Description complète du produit..."
//               />
//             </div>
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Images du produit</label>
//               <ImageUploader
//                 value={form.images || []}
//                 onChange={(images) => setForm({ ...form, images })}
//                 maxFiles={5}
//                 folder="products"
//               />
//             </div>
//             <div className="flex items-center gap-4">
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input
//                   type="checkbox"
//                   checked={form.is_active ?? true}
//                   onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
//                   className="w-4 h-4 rounded"
//                 />
//                 <span className="text-sm text-slate-700">Actif</span>
//               </label>
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input
//                   type="checkbox"
//                   checked={form.is_featured ?? false}
//                   onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
//                   className="w-4 h-4 rounded"
//                 />
//                 <span className="text-sm text-slate-700">À la une</span>
//               </label>
//             </div>
//           </div>
//           <div className="flex gap-3 pt-2">
//             <button
//               onClick={handleSave}
//               disabled={saving}
//               className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
//             >
//               {saving ? 'Enregistrement...' : editingProduct ? 'Mettre à jour' : 'Créer'}
//             </button>
//             <button
//               onClick={() => setShowModal(false)}
//               className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
//             >
//               Annuler
//             </button>
//           </div>
//         </div>
//       </Modal>

//       {/* Delete confirm */}
//       <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Supprimer le produit" size="sm">
//         <p className="text-sm text-slate-600 mb-5">Voulez-vous vraiment supprimer ce produit ? Cette action ne peut pas être annulée.</p>
//         <div className="flex gap-3">
//           <button
//             onClick={handleDelete}
//             className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
//           >
//             Supprimer
//           </button>
//           <button
//             onClick={() => setDeleteId(null)}
//             className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
//           >
//             Annuler
//           </button>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// import React, { useEffect, useState, useCallback } from 'react';
// import { Plus, Search, CreditCard as Edit2, Trash2, Package, Star, Eye, EyeOff } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import { getProducts, deleteProduct, updateProduct } from '../../services/products';
// import { getCategories } from '../../services/categories';
// import { logActivity } from '../../services/activityLogs';
// import { formatCurrency, slugify } from '../../lib/utils';
// import { useTheme } from '../../contexts/ThemeContext';
// import { StatusBadge } from '../../components/ui/Badge';
// import { Modal } from '../../components/ui/Modal';
// import { Skeleton } from '../../components/ui/Skeleton';
// import { ImageUploader } from '../../components/ui/ImageUploader';
// import type { Product, Category } from '../../types';
// import { toast } from 'sonner';
// import { supabase } from '../../lib/supabase';
// import { useAuth } from '../../contexts/AuthContext';

// export function ProductsPage() {
//   const { settings } = useTheme();
//   const { profile } = useAuth();
//   const [products, setProducts] = useState<Product[]>([]);
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [categoryFilter, setCategoryFilter] = useState('');
//   const [showModal, setShowModal] = useState(false);
//   const [editingProduct, setEditingProduct] = useState<Product | null>(null);
//   const [deleteId, setDeleteId] = useState<string | null>(null);
//   const [form, setForm] = useState<Partial<Product>>({
//     name: '', sku: '', slug: '', description: '', short_description: '',
//     price: 0, compare_at_price: null, stock_qty: 0,
//     category_id: '', is_active: true, is_featured: false, images: [],
//   });
//   const [formErrors, setFormErrors] = useState<Record<string, string>>({});
//   const [saving, setSaving] = useState(false);

//   const loadProducts = useCallback(async () => {
//     setLoading(true);
//     const { data } = await getProducts({
//       search: search || undefined,
//       categoryId: categoryFilter || undefined,
//       active: undefined,
//     });
//     setProducts(data || []);
//     setLoading(false);
//   }, [search, categoryFilter]);

//   useEffect(() => { loadProducts(); }, [loadProducts]);

//   useEffect(() => {
//     getCategories(false).then(({ data }) => setCategories(data || []));
//   }, []);

//   const openCreate = () => {
//     setEditingProduct(null);
//     setForm({
//       name: '', sku: '', slug: '', description: '', short_description: '',
//       price: 0, compare_at_price: null, stock_qty: 0,
//       category_id: '', is_active: true, is_featured: false, images: [],
//     });
//     setFormErrors({});
//     setShowModal(true);
//   };

//   const openEdit = (product: Product) => {
//     setEditingProduct(product);
//     setForm({
//       name: product.name,
//       sku: product.sku,
//       slug: product.slug,
//       description: product.description,
//       short_description: product.short_description,
//       price: product.price,
//       compare_at_price: product.compare_at_price,
//       stock_qty: product.stock_qty,
//       category_id: product.category_id,
//       is_active: product.is_active,
//       is_featured: product.is_featured,
//       images: product.images,
//     });
//     setFormErrors({});
//     setShowModal(true);
//   };

//   const validateForm = () => {
//     const errors: Record<string, string> = {};
//     if (!form.name?.trim()) errors.name = 'Le nom est requis';
//     if (!form.sku?.trim()) errors.sku = 'La référence est requise';
//     if (!form.price && form.price !== 0) errors.price = 'Le prix est requis';
//     if ((form.price ?? 0) < 0) errors.price = 'Le prix doit être positif';
//     return errors;
//   };

//   const handleSave = async () => {
//     const errors = validateForm();
//     if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

//     setSaving(true);
//     const slug = form.slug || slugify(form.name || '');

//     const payload = {
//       name: form.name,
//       sku: form.sku,
//       slug,
//       description: form.description,
//       short_description: form.short_description,
//       price: form.price,
//       compare_at_price: form.compare_at_price ?? null,
//       stock_qty: form.stock_qty,
//       category_id: form.category_id || null,
//       images: form.images,
//       is_active: form.is_active,
//       is_featured: form.is_featured,
//     };

//     if (editingProduct) {
//       const { error } = await updateProduct(editingProduct.id, payload);
//       if (error) {
//         console.error('Erreur update produit:', error);
//         toast.error('Échec de la mise à jour du produit');
//         setSaving(false);
//         return;
//       }
//       await logActivity({ action: 'update', entity_type: 'product', entity_id: editingProduct.id, details: { name: form.name } });
//       toast.success('Produit mis à jour');
//     } else {
//       const { data, error } = await supabase
//         .from('products')
//         .insert({ ...payload, created_by: profile?.id })
//         .select()
//         .maybeSingle();
//       if (error) {
//         toast.error('Échec de la création du produit: ' + error.message);
//         setSaving(false);
//         return;
//       }
//       await logActivity({ action: 'create', entity_type: 'product', entity_id: data?.id, details: { name: form.name } });
//       toast.success('Produit créé');
//     }

//     setSaving(false);
//     setShowModal(false);
//     loadProducts();
//   };

//   const handleDelete = async () => {
//     if (!deleteId) return;
//     const { error } = await deleteProduct(deleteId);
//     if (error) { toast.error('Échec de la suppression du produit'); return; }
//     await logActivity({ action: 'delete', entity_type: 'product', entity_id: deleteId });
//     toast.success('Produit supprimé');
//     setDeleteId(null);
//     loadProducts();
//   };

//   const toggleActive = async (product: Product) => {
//     await updateProduct(product.id, { is_active: !product.is_active });
//     loadProducts();
//   };

//   const stockLabel = (qty: number) =>
//     qty === 0 ? 'Out of Stock' : qty <= 5 ? 'Low Stock' : 'In Stock';

//   return (
//     <div className="p-6">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Produits</h1>
//           <p className="text-sm text-slate-500 mt-0.5">{products.length} produit{products.length !== 1 ? 's' : ''}</p>
//         </div>
//         <button
//           onClick={openCreate}
//           className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
//         >
//           <Plus size={15} />
//           Ajouter un produit
//         </button>
//       </div>

//       {/* Filters */}
//       <div className="flex flex-col sm:flex-row gap-3 mb-5">
//         <div className="relative flex-1">
//           <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//           <input
//             type="text"
//             placeholder="Rechercher des produits..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
//           />
//         </div>
//         <select
//           value={categoryFilter}
//           onChange={(e) => setCategoryFilter(e.target.value)}
//           className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
//         >
//           <option value="">Toutes les catégories</option>
//           {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
//         </select>
//       </div>

//       {/* Table */}
//       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead>
//               <tr className="border-b border-slate-100 bg-slate-50">
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Produit</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Référence</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Catégorie</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Prix</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Stock</th>
//                 <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
//                 <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {loading
//                 ? Array.from({ length: 5 }).map((_, i) => (
//                     <tr key={i}>
//                       {Array.from({ length: 7 }).map((_, j) => (
//                         <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
//                       ))}
//                     </tr>
//                   ))
//                 : products.map((product) => (
//                     <tr key={product.id} className="hover:bg-slate-50 transition-colors">
//                       <td className="px-4 py-3">
//                         <div className="flex items-center gap-3">
//                           <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
//                             {product.images?.[0] ? (
//                               <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
//                             ) : (
//                               <div className="w-full h-full flex items-center justify-center">
//                                 <Package size={16} className="text-slate-300" />
//                               </div>
//                             )}
//                           </div>
//                           <div>
//                             <p className="font-medium text-slate-900">{product.name}</p>
//                             {product.is_featured && (
//                               <span className="inline-flex items-center gap-1 text-xs text-amber-600">
//                                 <Star size={10} fill="currentColor" /> À la une
//                               </span>
//                             )}
//                             {product.compare_at_price && product.compare_at_price > product.price && (
//                               <span className="inline-flex items-center gap-1 text-xs text-green-600 ml-2">
//                                 En promo
//                               </span>
//                             )}
//                           </div>
//                         </div>
//                       </td>
//                       <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.sku}</td>
//                       <td className="px-4 py-3 text-slate-600">{product.category?.name || '—'}</td>
//                       <td className="px-4 py-3">
//                         <span className="font-semibold text-slate-900">{formatCurrency(product.price, settings.currency)}</span>
//                         {product.compare_at_price && product.compare_at_price > product.price && (
//                           <span className="ml-2 text-xs line-through text-slate-400">
//                             {formatCurrency(product.compare_at_price, settings.currency)}
//                           </span>
//                         )}
//                       </td>
//                       <td className="px-4 py-3">
//                         <StatusBadge status={stockLabel(product.stock_qty)} type="stock" />
//                         <span className="ml-1 text-xs text-slate-400">({product.stock_qty})</span>
//                       </td>
//                       <td className="px-4 py-3">
//                         <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
//                           {product.is_active ? 'Actif' : 'Inactif'}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3">
//                         <div className="flex items-center justify-end gap-1">
//                           <Link
//                             to={`/product/${product.slug}`}
//                             target="_blank"
//                             className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
//                           >
//                             <Eye size={14} />
//                           </Link>
//                           <button
//                             onClick={() => toggleActive(product)}
//                             className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
//                           >
//                             {product.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
//                           </button>
//                           <button
//                             onClick={() => openEdit(product)}
//                             className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
//                           >
//                             <Edit2 size={14} />
//                           </button>
//                           <button
//                             onClick={() => setDeleteId(product.id)}
//                             className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
//                           >
//                             <Trash2 size={14} />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//             </tbody>
//           </table>
//         </div>
//         {!loading && products.length === 0 && (
//           <div className="text-center py-16">
//             <Package size={40} className="mx-auto mb-3 text-slate-200" />
//             <p className="text-slate-500 font-medium">Aucun produit trouvé</p>
//             <button onClick={openCreate} className="mt-3 text-sm text-slate-900 underline">Ajoutez votre premier produit</button>
//           </div>
//         )}
//       </div>

//       {/* Create/Edit Modal */}
//       <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'} size="2xl">
//         <div className="space-y-4">
//           <div className="grid grid-cols-2 gap-4">
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Nom *</label>
//               <input
//                 type="text"
//                 value={form.name || ''}
//                 onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
//                 className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.name ? 'border-red-500' : 'border-slate-200'}`}
//               />
//               {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Référence *</label>
//               <input
//                 type="text"
//                 value={form.sku || ''}
//                 onChange={(e) => setForm({ ...form, sku: e.target.value })}
//                 className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.sku ? 'border-red-500' : 'border-slate-200'}`}
//               />
//               {formErrors.sku && <p className="text-xs text-red-500 mt-1">{formErrors.sku}</p>}
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Identifiant URL</label>
//               <input
//                 type="text"
//                 value={form.slug || ''}
//                 onChange={(e) => setForm({ ...form, slug: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Prix *</label>
//               <input
//                 type="number"
//                 min="0"
//                 step="0.01"
//                 value={form.price || ''}
//                 onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
//                 className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.price ? 'border-red-500' : 'border-slate-200'}`}
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Ancien prix (prix barré)</label>
//               <input
//                 type="number"
//                 min="0"
//                 step="0.01"
//                 value={form.compare_at_price ?? ''}
//                 onChange={(e) => setForm({ ...form, compare_at_price: e.target.value === '' ? null : parseFloat(e.target.value) })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//               />
//               <p className="text-xs text-slate-500 mt-1">Laisser vide si pas de promotion. Géré automatiquement par les promotions.</p>
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Quantité en stock</label>
//               <input
//                 type="number"
//                 min="0"
//                 value={form.stock_qty || 0}
//                 onChange={(e) => setForm({ ...form, stock_qty: parseInt(e.target.value) || 0 })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-slate-700 block mb-1">Catégorie</label>
//               <select
//                 value={form.category_id || ''}
//                 onChange={(e) => setForm({ ...form, category_id: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//               >
//                 <option value="">Aucune catégorie</option>
//                 {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
//               </select>
//             </div>
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Description courte</label>
//               <input
//                 type="text"
//                 value={form.short_description || ''}
//                 onChange={(e) => setForm({ ...form, short_description: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//               />
//             </div>
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
//               <textarea
//                 rows={3}
//                 value={form.description || ''}
//                 onChange={(e) => setForm({ ...form, description: e.target.value })}
//                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
//               />
//             </div>
//             <div className="col-span-2">
//               <label className="text-sm font-medium text-slate-700 block mb-1">Images du produit</label>
//               <ImageUploader
//                 value={form.images || []}
//                 onChange={(images) => setForm({ ...form, images })}
//                 maxFiles={5}
//                 folder="products"
//               />
//             </div>
//             <div className="flex items-center gap-4">
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input
//                   type="checkbox"
//                   checked={form.is_active ?? true}
//                   onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
//                   className="w-4 h-4 rounded"
//                 />
//                 <span className="text-sm text-slate-700">Actif</span>
//               </label>
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input
//                   type="checkbox"
//                   checked={form.is_featured ?? false}
//                   onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
//                   className="w-4 h-4 rounded"
//                 />
//                 <span className="text-sm text-slate-700">À la une</span>
//               </label>
//             </div>
//           </div>
//           <div className="flex gap-3 pt-2">
//             <button
//               onClick={handleSave}
//               disabled={saving}
//               className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
//             >
//               {saving ? 'Enregistrement...' : editingProduct ? 'Mettre à jour' : 'Créer'}
//             </button>
//             <button
//               onClick={() => setShowModal(false)}
//               className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
//             >
//               Annuler
//             </button>
//           </div>
//         </div>
//       </Modal>

//       {/* Delete confirm */}
//       <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Supprimer le produit" size="sm">
//         <p className="text-sm text-slate-600 mb-5">Voulez-vous vraiment supprimer ce produit ? Cette action ne peut pas être annulée.</p>
//         <div className="flex gap-3">
//           <button
//             onClick={handleDelete}
//             className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
//           >
//             Supprimer
//           </button>
//           <button
//             onClick={() => setDeleteId(null)}
//             className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
//           >
//             Annuler
//           </button>
//         </div>
//       </Modal>
//     </div>
//   );
// }