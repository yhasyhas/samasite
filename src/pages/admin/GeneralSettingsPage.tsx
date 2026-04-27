import React, { useEffect, useState } from 'react';
import { Save, Globe, Phone, Mail, MapPin, DollarSign, Image, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { updateSettings } from '../../services/settings';
import { logActivity } from '../../services/activityLogs';
import { SingleImageUploader } from '../../components/ui/ImageUploader';
import type { SiteSettings } from '../../types';
import { toast } from 'sonner';

const CURRENCIES = [
  { value: 'XOF', label: 'XOF - Afrique Ouest CFA franc' },
  { value: 'XAF', label: 'XAF - Afrique Centrale CFA franc' },
  { value: 'USD', label: 'USD - Dollar americain' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - Pound Anglais' },
  { value: 'NGN', label: 'NGN - Nigeria Naira' },
  { value: 'GHS', label: 'GHS - Ghanai Cedi' },
  { value: 'KES', label: 'KES - Kenyan Shilling' },
  { value: 'MAD', label: 'MAD - Maroc Dirham' },
];

export function GeneralSettingsPage() {
  const { settings, refreshSettings } = useTheme();
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      store_name: settings.store_name,
      store_tagline: settings.store_tagline,
      store_description: settings.store_description,
      logo_url: settings.logo_url,
      favicon_url: settings.favicon_url,
      currency: settings.currency,
      maintenance_mode: settings.maintenance_mode,
      contact_phone: settings.contact_phone,
      contact_email: settings.contact_email,
      contact_address: settings.contact_address,
    });
  }, [settings]);

  const handleSave = async () => {
    if (!form.store_name?.trim()) { toast.error('Le nom de la boutique est requis'); return; }
    setSaving(true);
    const { error } = await updateSettings(form);
    if (error) { toast.error('Échec enregistrement des paramètres'); setSaving(false); return; }
    await logActivity({ action: 'update', entity_type: 'setting', details: { section: 'general' } });
    await refreshSettings();
    toast.success('Paramètres enregistrés');
    setSaving(false);
  };

  const Field = ({ label, icon: Icon, children }: { label: string; icon?: React.ElementType; children: React.ReactNode }) => (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
        {Icon && <Icon size={13} className="text-slate-400" />}
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paramètres généraux</h1>
          <p className="text-sm text-slate-500 mt-0.5">Identité de la boutique et coordonnées</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <Save size={13} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-5">
        {/* Store Identity */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Globe size={15} className="text-slate-500" />
            Identité de la boutique
          </h2>
          <Field label="Store Name *">
            <input
              type="text"
              value={form.store_name || ''}
              onChange={(e) => setForm({ ...form, store_name: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </Field>
          <Field label="Tagline">
            <input
              type="text"
              value={form.store_tagline || ''}
              onChange={(e) => setForm({ ...form, store_tagline: e.target.value })}
              placeholder="A short, catchy phrase"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              value={form.store_description || ''}
              onChange={(e) => setForm({ ...form, store_description: e.target.value })}
              placeholder="Describe your store..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </Field>
        </section>

        {/* Media */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Image size={15} className="text-slate-500" />
            Médias
          </h2>
          <Field label="Logo" icon={Image}>
            <SingleImageUploader
              value={form.logo_url || ''}
              onChange={(url) => setForm({ ...form, logo_url: url })}
              folder="logos"
            />
            {form.logo_url && (
              <div className="mt-2 w-24 h-12 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
                <img src={form.logo_url} alt="Logo preview" className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </Field>
          <Field label="Favicon">
            <SingleImageUploader
              value={form.favicon_url || ''}
              onChange={(url) => setForm({ ...form, favicon_url: url })}
              folder="logos"
            />
          </Field>
        </section>

        {/* Currency */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <DollarSign size={15} className="text-slate-500" />
            Boutique
          </h2>
          <Field label="Currency">
            <select
              value={form.currency || 'XOF'}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Coordonnées</h2>
          <Field label="Phone" icon={Phone}>
            <input
              type="tel"
              value={form.contact_phone || ''}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </Field>
          <Field label="Email" icon={Mail}>
            <input
              type="email"
              value={form.contact_email || ''}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </Field>
          <Field label="Address" icon={MapPin}>
            <textarea
              rows={2}
              value={form.contact_address || ''}
              onChange={(e) => setForm({ ...form, contact_address: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </Field>
        </section>

        {/* Maintenance */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                <h2 className="font-semibold text-slate-900">Maintenance Mode</h2>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Lorsque cette option est activée, le site public affichera une page de maintenance.</p>
            </div>
            <button
              onClick={() => setForm({ ...form, maintenance_mode: !form.maintenance_mode })}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.maintenance_mode ? 'bg-amber-500' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.maintenance_mode ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}