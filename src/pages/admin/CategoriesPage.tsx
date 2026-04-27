import React, { useEffect, useState, useCallback } from 'react';
import { Plus, CreditCard as Edit2, Trash2, FolderOpen } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../services/categories';
import { logActivity } from '../../services/activityLogs';
import { slugify } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { SingleImageUploader } from '../../components/ui/ImageUploader';
import type { Category } from '../../types';
import { toast } from 'sonner';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', image_url: '', sort_order: 0, is_active: true, parent_id: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getCategories(false);
    setCategories(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingCategory(null);
    setForm({ name: '', slug: '', description: '', image_url: '', sort_order: 0, is_active: true, parent_id: '' });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description, image_url: cat.image_url, sort_order: cat.sort_order, is_active: cat.is_active, parent_id: cat.parent_id || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nom requis'); return; }
    setSaving(true);
    const payload = { ...form, slug: form.slug || slugify(form.name), parent_id: form.parent_id || null };

    if (editingCategory) {
      const { error } = await updateCategory(editingCategory.id, payload);
      if (error) { toast.error('Échec de la mise à jour de la catégorie'); setSaving(false); return; }
      await logActivity({ action: 'update', entity_type: 'category', entity_id: editingCategory.id });
      toast.success('Catégorie mise à jour');
    } else {
      const { data, error } = await createCategory(payload);
      if (error) { toast.error('Échec de la création de la catégorie: ' + error.message); setSaving(false); return; }
      await logActivity({ action: 'create', entity_type: 'category', entity_id: data?.id });
      toast.success('Catégorie créée');
    }

    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteCategory(deleteId);
    if (error) { toast.error('Suppression impossible : cette catégorie contient peut-être des produits'); return; }
    await logActivity({ action: 'delete', entity_type: 'category', entity_id: deleteId });
    toast.success('Catégorie supprimée');
    setDeleteId(null);
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catégories</h1>
          <p className="text-sm text-slate-500 mt-0.5">{categories.length} catégories</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Plus size={15} />
          Ajouter catégories
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Nom</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Slug</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Parent</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Commander</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              : categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FolderOpen size={15} className="text-slate-400" />
                        <span className="font-medium text-slate-900">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{cat.slug}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {cat.parent_id ? categories.find((c) => c.id === cat.parent_id)?.name || '—' : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{cat.sort_order}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cat.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDeleteId(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && categories.length === 0 && (
          <div className="text-center py-14">
            <FolderOpen size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 font-medium">Aucune catégorie</p>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCategory ? 'Edit Category' : 'New Category'} size="md">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Nom *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Slug</label>
            <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 font-mono" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Image</label>
            <SingleImageUploader
              value={form.image_url || ''}
              onChange={(url) => setForm({ ...form, image_url: url })}
              folder="categories"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Ordre de tri</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Catégorie parente</label>
              <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2">
                <option value="">None</option>
                {categories.filter((c) => !editingCategory || c.id !== editingCategory.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm text-slate-700">Actif</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
              {saving ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Category" size="sm">
        <p className="text-sm text-slate-600 mb-5">Êtes-vous sûr ? Cette action peut affecter les produits rattachés à cette catégorie.</p>
        <div className="flex gap-3">
          <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">Delete</button>
          <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
        </div>
      </Modal>
    </div>
  );
}