import React, { useEffect, useState } from 'react';
import { Save, RotateCcw, Palette, Eye } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { updateSettings } from '../../services/settings';
import { logActivityWithDiff } from '../../services/activityLogs';
import type { SiteSettings } from '../../types';
import { toast } from 'sonner';

const DEFAULT_COLORS: Partial<SiteSettings> = {
  primary_color: '#0f172a', primary_hover: '#1e293b', secondary_color: '#64748b',
  accent_color: '#f59e0b', background_color: '#ffffff', surface_color: '#f8fafc',
  text_primary_color: '#0f172a', text_secondary_color: '#475569', text_on_primary: '#ffffff',
  border_color: '#e2e8f0', success_color: '#10b981', warning_color: '#f59e0b',
  error_color: '#ef4444', info_color: '#3b82f6',
  dark_background: '#0f172a', dark_surface: '#1e293b', dark_text_primary: '#f8fafc',
  dark_text_secondary: '#94a3b8', dark_border: '#334155',
};

const PRESETS = [
  {
    label: 'Corporate Blue', colors: {
      primary_color: '#1e40af', primary_hover: '#1e3a8a', secondary_color: '#475569', accent_color: '#3b82f6',
      background_color: '#ffffff', surface_color: '#f0f7ff', text_primary_color: '#0f172a', text_secondary_color: '#475569',
      text_on_primary: '#ffffff', border_color: '#dbeafe',
    }
  },
  {
    label: 'Warm Boutique', colors: {
      primary_color: '#92400e', primary_hover: '#78350f', secondary_color: '#a16207', accent_color: '#d97706',
      background_color: '#fffbf5', surface_color: '#fef3c7', text_primary_color: '#1c1917', text_secondary_color: '#78716c',
      text_on_primary: '#ffffff', border_color: '#fde68a',
    }
  },
  {
    label: 'Tech Dark', colors: {
      primary_color: '#1d4ed8', primary_hover: '#1e40af', secondary_color: '#6366f1', accent_color: '#22d3ee',
      background_color: '#0f172a', surface_color: '#1e293b', text_primary_color: '#f8fafc', text_secondary_color: '#94a3b8',
      text_on_primary: '#ffffff', border_color: '#334155',
    }
  },
  {
    label: 'Minimalist', colors: {
      primary_color: '#0a0a0a', primary_hover: '#171717', secondary_color: '#737373', accent_color: '#525252',
      background_color: '#ffffff', surface_color: '#fafafa', text_primary_color: '#0a0a0a', text_secondary_color: '#525252',
      text_on_primary: '#ffffff', border_color: '#e5e5e5',
    }
  },
  {
    label: 'Nature', colors: {
      primary_color: '#14532d', primary_hover: '#15803d', secondary_color: '#4d7c0f', accent_color: '#a16207',
      background_color: '#f7fdf7', surface_color: '#f0fdf4', text_primary_color: '#14532d', text_secondary_color: '#4d7c0f',
      text_on_primary: '#ffffff', border_color: '#bbf7d0',
    }
  },
];

type ColorKey = keyof SiteSettings;

const LIGHT_COLORS: { key: ColorKey; label: string; description: string }[] = [
  { key: 'primary_color', label: 'Couleur principale', description: 'En-têtes, Boutons principaux' },
  { key: 'primary_hover', label: 'Couleur de survol (principal)', description: 'État au survol des éléments principaux' },
  { key: 'secondary_color', label: 'Couleur secondaire', description: 'Éléments secondaires, libellés' },
  { key: 'accent_color', label: 'Couleur accent', description: 'CTAs, badges, highlights' },
  { key: 'background_color', label: 'Arrière-plan', description: 'Arrière-plan de la page principale' },
  { key: 'surface_color', label: 'Surface', description: 'Cartes, modales' },
  { key: 'text_primary_color', label: 'Couleur du texte', description: 'Texte principal' },
  { key: 'text_secondary_color', label: 'Couleur secondaire', description: 'Texte atténué' },
  { key: 'text_on_primary', label: 'Texte sur fond principal', description: 'Texte sur boutons principaux' },
  { key: 'border_color', label: 'Bordures', description: 'Séparateurs, contours' },
  { key: 'success_color', label: 'Succès', description: 'États de succès' },
  { key: 'warning_color', label: 'Avertissement', description: 'États d\'avertissement' },
  { key: 'error_color', label: 'Erreur', description: 'États d\'erreur' },
  { key: 'info_color', label: 'Info', description: 'Badges d\'information' },
];

const DARK_COLORS: { key: ColorKey; label: string }[] = [
  { key: 'dark_background', label: 'Fond sombre' },
  { key: 'dark_surface', label: 'Surface sombre' },
  { key: 'dark_text_primary', label: 'Texte principal (sombre)' },
  { key: 'dark_text_secondary', label: 'Texte secondaire' },
  { key: 'dark_border', label: 'Bordure sombre' },
];

export function AppearanceSettingsPage() {
  const { settings, refreshSettings } = useTheme();
  const [colors, setColors] = useState<Partial<SiteSettings>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'light' | 'dark'>('light');
  const [previewStyle, setPreviewStyle] = useState<Record<string, string>>({});

  useEffect(() => {
    const colorKeys = [...LIGHT_COLORS.map((c) => c.key), ...DARK_COLORS.map((c) => c.key)];
    const extracted: Partial<SiteSettings> = {};
    colorKeys.forEach((k) => {
      (extracted as Record<string, unknown>)[k as string] = (settings as Record<string, unknown>)[k as string];
    });
    setColors(extracted);
    updatePreview(extracted);
  }, [settings]);

  const updatePreview = (c: Partial<SiteSettings>) => {
    setPreviewStyle({
      '--preview-primary': (c.primary_color as string) || '#0f172a',
      '--preview-accent': (c.accent_color as string) || '#f59e0b',
      '--preview-bg': (c.background_color as string) || '#ffffff',
      '--preview-surface': (c.surface_color as string) || '#f8fafc',
      '--preview-text': (c.text_primary_color as string) || '#0f172a',
      '--preview-text-muted': (c.text_secondary_color as string) || '#475569',
      '--preview-border': (c.border_color as string) || '#e2e8f0',
      '--preview-text-on-primary': (c.text_on_primary as string) || '#ffffff',
    } as Record<string, string>);
  };

  const handleColorChange = (key: ColorKey, value: string) => {
    const updated = { ...colors, [key]: value };
    setColors(updated);
    updatePreview(updated);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    const updated = { ...colors, ...preset.colors };
    setColors(updated);
    updatePreview(updated);
  };

  const handleReset = () => {
    setColors(DEFAULT_COLORS);
    updatePreview(DEFAULT_COLORS);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateSettings(colors);
    if (error) { toast.error('Échec de l\'enregistrement du thème'); setSaving(false); return; }

    const after = { ...settings, ...colors };
    await logActivityWithDiff(
      { action: 'theme_change', entity_type: 'setting', entity_id: settings.id },
      settings,
      after
    );

    await refreshSettings();
    toast.success('Thème enregistré et appliqué');
    setSaving(false);
  };

  const ColorPicker = ({ colorKey, label, description }: { colorKey: ColorKey; label: string; description?: string }) => {
    const value = (colors[colorKey] as string) || '#000000';
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl border-2 border-white shadow-sm overflow-hidden" style={{ backgroundColor: value }}>
            <input type="color" value={value} onChange={(e) => handleColorChange(colorKey, e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          {description && <p className="text-xs text-slate-500 truncate">{description}</p>}
        </div>
        <input type="text" value={value} onChange={(e) => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleColorChange(colorKey, v); }} className="w-24 text-xs font-mono border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400 uppercase bg-white" maxLength={7} />
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Apparence</h1>
          <p className="text-sm text-slate-500 mt-0.5">Personnalisation de l'identité visuelle</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors">
            <RotateCcw size={13} /> Réinitialiser
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
            <Save size={13} /> {saving ? 'Enregistrement...' : 'Enregistrer le thème'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={16} className="text-slate-500" />
              <h2 className="font-semibold text-slate-900">Préréglages de thème</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button key={preset.label} onClick={() => applyPreset(preset)} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm hover:border-slate-400 hover:shadow-sm transition-all">
                  <div className="w-4 h-4 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: preset.colors.primary_color }} />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button onClick={() => setActiveTab('light')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'light' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                Couleurs du mode clair
              </button>
              <button onClick={() => setActiveTab('dark')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'dark' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                Couleurs du mode sombre
              </button>
            </div>
            <div className="p-4 space-y-2">
              {activeTab === 'light'
                ? LIGHT_COLORS.map((c) => <ColorPicker key={c.key as string} colorKey={c.key} label={c.label} description={c.description} />)
                : DARK_COLORS.map((c) => <ColorPicker key={c.key as string} colorKey={c.key} label={c.label} />)
              }
            </div>
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden sticky top-6">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
              <Eye size={14} className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Aperçu en direct</h2>
            </div>
            <div className="p-4 transition-all duration-300" style={previewStyle as React.CSSProperties}>
              <div className="rounded-xl px-3 py-2 mb-3 flex items-center justify-between" style={{ backgroundColor: 'var(--preview-primary)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'var(--preview-text-on-primary)' }}>S</div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--preview-text-on-primary)' }}>{settings.store_name}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--preview-accent)', color: '#fff' }}>Devis</span>
              </div>
              <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: 'var(--preview-bg)', border: '1px solid var(--preview-border)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--preview-text)' }}>Produits à la une</p>
                <p className="text-[10px] mb-2" style={{ color: 'var(--preview-text-muted)' }}>Découvrez nos meilleures sélections</p>
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--preview-surface)', border: '1px solid var(--preview-border)' }}>
                  <div className="h-14 bg-slate-200" />
                  <div className="p-2">
                    <p className="text-[10px] font-semibold" style={{ color: 'var(--preview-text)' }}>Exemple de produit</p>
                    <p className="text-[10px]" style={{ color: 'var(--preview-text-muted)' }}>Description courte</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: 'var(--preview-primary)' }}>150,000 XOF</span>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-lg text-white" style={{ backgroundColor: 'var(--preview-accent)' }}>Ajouter</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <button className="w-full py-2 rounded-lg text-xs font-semibold transition-colors" style={{ backgroundColor: 'var(--preview-primary)', color: 'var(--preview-text-on-primary)' }}>Bouton principal</button>
                <button className="w-full py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'var(--preview-accent)', color: '#fff' }}>Bouton secondaire</button>
                <div className="flex gap-2">
                  {(['success_color', 'warning_color', 'error_color', 'info_color'] as ColorKey[]).map((k) => (
                    <div key={k as string} className="flex-1 h-5 rounded" style={{ backgroundColor: (colors[k] as string) || '#ccc' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// import React, { useEffect, useState } from 'react';
// import { Save, RotateCcw, Palette, Eye } from 'lucide-react';
// import { useTheme } from '../../contexts/ThemeContext';
// import { updateSettings } from '../../services/settings';
// import { logActivity } from '../../services/activityLogs';
// import type { SiteSettings } from '../../types';
// import { toast } from 'sonner';

// const DEFAULT_COLORS: Partial<SiteSettings> = {
//   primary_color: '#0f172a', primary_hover: '#1e293b', secondary_color: '#64748b',
//   accent_color: '#f59e0b', background_color: '#ffffff', surface_color: '#f8fafc',
//   text_primary_color: '#0f172a', text_secondary_color: '#475569', text_on_primary: '#ffffff',
//   border_color: '#e2e8f0', success_color: '#10b981', warning_color: '#f59e0b',
//   error_color: '#ef4444', info_color: '#3b82f6',
//   dark_background: '#0f172a', dark_surface: '#1e293b', dark_text_primary: '#f8fafc',
//   dark_text_secondary: '#94a3b8', dark_border: '#334155',
// };

// const PRESETS = [
//   {
//     label: 'Corporate Blue', colors: {
//       primary_color: '#1e40af', primary_hover: '#1e3a8a', secondary_color: '#475569', accent_color: '#3b82f6',
//       background_color: '#ffffff', surface_color: '#f0f7ff', text_primary_color: '#0f172a', text_secondary_color: '#475569',
//       text_on_primary: '#ffffff', border_color: '#dbeafe',
//     }
//   },
//   {
//     label: 'Warm Boutique', colors: {
//       primary_color: '#92400e', primary_hover: '#78350f', secondary_color: '#a16207', accent_color: '#d97706',
//       background_color: '#fffbf5', surface_color: '#fef3c7', text_primary_color: '#1c1917', text_secondary_color: '#78716c',
//       text_on_primary: '#ffffff', border_color: '#fde68a',
//     }
//   },
//   {
//     label: 'Tech Dark', colors: {
//       primary_color: '#1d4ed8', primary_hover: '#1e40af', secondary_color: '#6366f1', accent_color: '#22d3ee',
//       background_color: '#0f172a', surface_color: '#1e293b', text_primary_color: '#f8fafc', text_secondary_color: '#94a3b8',
//       text_on_primary: '#ffffff', border_color: '#334155',
//     }
//   },
//   {
//     label: 'Minimalist', colors: {
//       primary_color: '#0a0a0a', primary_hover: '#171717', secondary_color: '#737373', accent_color: '#525252',
//       background_color: '#ffffff', surface_color: '#fafafa', text_primary_color: '#0a0a0a', text_secondary_color: '#525252',
//       text_on_primary: '#ffffff', border_color: '#e5e5e5',
//     }
//   },
//   {
//     label: 'Nature', colors: {
//       primary_color: '#14532d', primary_hover: '#15803d', secondary_color: '#4d7c0f', accent_color: '#a16207',
//       background_color: '#f7fdf7', surface_color: '#f0fdf4', text_primary_color: '#14532d', text_secondary_color: '#4d7c0f',
//       text_on_primary: '#ffffff', border_color: '#bbf7d0',
//     }
//   },
// ];

// type ColorKey = keyof SiteSettings;

// const LIGHT_COLORS: { key: ColorKey; label: string; description: string }[] = [
//   { key: 'primary_color', label: 'Couleur principale', description: 'En-têtes, Boutons principaux' },
//   { key: 'primary_hover', label: 'Couleur de survol (principal)', description: 'État au survol des éléments principaux' },
//   { key: 'secondary_color', label: 'Couleur secondaire', description: 'Éléments secondaires, libellés' },
//   { key: 'accent_color', label: 'Couleur accent', description: 'CTAs, badges, highlights' },
//   { key: 'background_color', label: 'Arrière-plan', description: 'Arrière-plan de la page principale' },
//   { key: 'surface_color', label: 'Surface', description: 'Cartes, modales' },
//   { key: 'text_primary_color', label: 'Couleur du texte', description: 'Texte principal' },
//   { key: 'text_secondary_color', label: 'Couleur secondaire', description: 'Muted text' },
//   { key: 'text_on_primary', label: 'Texte sur fond principal', description: 'Text on primary buttons' },
//   { key: 'border_color', label: 'Bordures', description: 'Dividers, outlines' },
//   { key: 'success_color', label: 'Succès', description: 'Success states' },
//   { key: 'warning_color', label: 'Avertissement', description: 'Warning states' },
//   { key: 'error_color', label: 'Erreur', description: 'Error states' },
//   { key: 'info_color', label: 'Info', description: 'Info badges' },
// ];

// const DARK_COLORS: { key: ColorKey; label: string }[] = [
//   { key: 'dark_background', label: 'Fond sombre' },
//   { key: 'dark_surface', label: 'Surface sombre' },
//   { key: 'dark_text_primary', label: 'Texte principal (sombre)' },
//   { key: 'dark_text_secondary', label: 'Texte secondaire' },
//   { key: 'dark_border', label: 'Bordure sombre' },
// ];

// export function AppearanceSettingsPage() {
//   const { settings, refreshSettings } = useTheme();
//   const [colors, setColors] = useState<Partial<SiteSettings>>({});
//   const [saving, setSaving] = useState(false);
//   const [activeTab, setActiveTab] = useState<'light' | 'dark'>('light');
//   const [previewStyle, setPreviewStyle] = useState<Record<string, string>>({});

//   useEffect(() => {
//     const colorKeys = [...LIGHT_COLORS.map((c) => c.key), ...DARK_COLORS.map((c) => c.key)];
//     const extracted: Partial<SiteSettings> = {};
//     colorKeys.forEach((k) => {
//       (extracted as Record<string, unknown>)[k as string] = (settings as Record<string, unknown>)[k as string];
//     });
//     setColors(extracted);
//     updatePreview(extracted);
//   }, [settings]);

//   const updatePreview = (c: Partial<SiteSettings>) => {
//     setPreviewStyle({
//       '--preview-primary': (c.primary_color as string) || '#0f172a',
//       '--preview-accent': (c.accent_color as string) || '#f59e0b',
//       '--preview-bg': (c.background_color as string) || '#ffffff',
//       '--preview-surface': (c.surface_color as string) || '#f8fafc',
//       '--preview-text': (c.text_primary_color as string) || '#0f172a',
//       '--preview-text-muted': (c.text_secondary_color as string) || '#475569',
//       '--preview-border': (c.border_color as string) || '#e2e8f0',
//       '--preview-text-on-primary': (c.text_on_primary as string) || '#ffffff',
//     } as Record<string, string>);
//   };

//   const handleColorChange = (key: ColorKey, value: string) => {
//     const updated = { ...colors, [key]: value };
//     setColors(updated);
//     updatePreview(updated);
//   };

//   const applyPreset = (preset: typeof PRESETS[0]) => {
//     const updated = { ...colors, ...preset.colors };
//     setColors(updated);
//     updatePreview(updated);
//   };

//   const handleReset = () => {
//     setColors(DEFAULT_COLORS);
//     updatePreview(DEFAULT_COLORS);
//   };

//   const handleSave = async () => {
//     setSaving(true);
//     const { error } = await updateSettings(colors);
//     if (error) { toast.error('Failed to save theme'); setSaving(false); return; }
//     await logActivity({ action: 'theme_change', entity_type: 'setting', details: { changed_colors: Object.keys(colors) } });
//     await refreshSettings();
//     toast.success('Theme saved and applied');
//     setSaving(false);
//   };

//   const ColorPicker = ({ colorKey, label, description }: { colorKey: ColorKey; label: string; description?: string }) => {
//     const value = (colors[colorKey] as string) || '#000000';
//     return (
//       <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
//         <div className="relative shrink-0">
//           <div className="w-10 h-10 rounded-xl border-2 border-white shadow-sm overflow-hidden" style={{ backgroundColor: value }}>
//             <input
//               type="color"
//               value={value}
//               onChange={(e) => handleColorChange(colorKey, e.target.value)}
//               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
//             />
//           </div>
//         </div>
//         <div className="flex-1 min-w-0">
//           <p className="text-sm font-medium text-slate-900">{label}</p>
//           {description && <p className="text-xs text-slate-500 truncate">{description}</p>}
//         </div>
//         <input
//           type="text"
//           value={value}
//           onChange={(e) => {
//             const v = e.target.value;
//             if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleColorChange(colorKey, v);
//           }}
//           className="w-24 text-xs font-mono border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400 uppercase bg-white"
//           maxLength={7}
//         />
//       </div>
//     );
//   };

//   return (
//     <div className="p-6 max-w-6xl">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Apparence</h1>
//           <p className="text-sm text-slate-500 mt-0.5">Personnalisation de l’identité visuelle</p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={handleReset}
//             className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors"
//           >
//             <RotateCcw size={13} />
//             Reset
//           </button>
//           <button
//             onClick={handleSave}
//             disabled={saving}
//             className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
//           >
//             <Save size={13} />
//             {saving ? 'Saving...' : 'Save Theme'}
//           </button>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
//         {/* Color editor */}
//         <div className="xl:col-span-2 space-y-5">
//           {/* Presets */}
//           <div className="bg-white rounded-2xl border border-slate-200 p-5">
//             <div className="flex items-center gap-2 mb-4">
//               <Palette size={16} className="text-slate-500" />
//               <h2 className="font-semibold text-slate-900">Préréglages de thème</h2>
//             </div>
//             <div className="flex flex-wrap gap-2">
//               {PRESETS.map((preset) => (
//                 <button
//                   key={preset.label}
//                   onClick={() => applyPreset(preset)}
//                   className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm hover:border-slate-400 hover:shadow-sm transition-all"
//                 >
//                   <div
//                     className="w-4 h-4 rounded-full shrink-0 border border-white shadow-sm"
//                     style={{ backgroundColor: preset.colors.primary_color }}
//                   />
//                   {preset.label}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Color pickers */}
//           <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//             <div className="flex border-b border-slate-200">
//               <button
//                 onClick={() => setActiveTab('light')}
//                 className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'light' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
//               >
//                 Couleurs du mode clair
//               </button>
//               <button
//                 onClick={() => setActiveTab('dark')}
//                 className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'dark' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
//               >
//                 Couleurs du mode sombre
//               </button>
//             </div>
//             <div className="p-4 space-y-2">
//               {activeTab === 'light'
//                 ? LIGHT_COLORS.map((c) => <ColorPicker key={c.key as string} colorKey={c.key} label={c.label} description={c.description} />)
//                 : DARK_COLORS.map((c) => <ColorPicker key={c.key as string} colorKey={c.key} label={c.label} />)
//               }
//             </div>
//           </div>
//         </div>

//         {/* Live Preview */}
//         <div className="xl:col-span-1">
//           <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden sticky top-6">
//             <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
//               <Eye size={14} className="text-slate-500" />
//               <h2 className="text-sm font-semibold text-slate-900">Aperçu en direct</h2>
//             </div>
//             <div
//               className="p-4 transition-all duration-300"
//               style={previewStyle as React.CSSProperties}
//             >
//               {/* Simulated header */}
//               <div
//                 className="rounded-xl px-3 py-2 mb-3 flex items-center justify-between"
//                 style={{ backgroundColor: 'var(--preview-primary)' }}
//               >
//                 <div className="flex items-center gap-2">
//                   <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
//                     style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'var(--preview-text-on-primary)' }}>
//                     S
//                   </div>
//                   <span className="text-xs font-semibold" style={{ color: 'var(--preview-text-on-primary)' }}>
//                     {settings.store_name}
//                   </span>
//                 </div>
//                 <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--preview-accent)', color: '#fff' }}>
//                   Devis
//                 </span>
//               </div>

//               {/* Simulated page */}
//               <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: 'var(--preview-bg)', border: '1px solid var(--preview-border)' }}>
//                 <p className="text-xs font-bold mb-1" style={{ color: 'var(--preview-text)' }}>Produits à la une</p>
//                 <p className="text-[10px] mb-2" style={{ color: 'var(--preview-text-muted)' }}>Découvrez nos meilleures sélections</p>

//                 {/* Product card preview */}
//                 <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--preview-surface)', border: '1px solid var(--preview-border)' }}>
//                   <div className="h-14 bg-slate-200" />
//                   <div className="p-2">
//                     <p className="text-[10px] font-semibold" style={{ color: 'var(--preview-text)' }}>Exemple de produit</p>
//                     <p className="text-[10px]" style={{ color: 'var(--preview-text-muted)' }}>Description courte</p>
//                     <div className="mt-2 flex items-center justify-between">
//                       <span className="text-xs font-bold" style={{ color: 'var(--preview-primary)' }}>150,000 XOF</span>
//                       <span
//                         className="text-[9px] font-semibold px-2 py-0.5 rounded-lg text-white"
//                         style={{ backgroundColor: 'var(--preview-accent)' }}
//                       >
//                         Ajouter
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Button previews */}
//               <div className="space-y-2">
//                 <button
//                   className="w-full py-2 rounded-lg text-xs font-semibold transition-colors"
//                   style={{ backgroundColor: 'var(--preview-primary)', color: 'var(--preview-text-on-primary)' }}
//                 >
//                   Bouton principal
//                 </button>
//                 <button
//                   className="w-full py-2 rounded-lg text-xs font-semibold"
//                   style={{ backgroundColor: 'var(--preview-accent)', color: '#fff' }}
//                 >
//                   Bouton secondaire
//                 </button>
//                 <div className="flex gap-2">
//                   {(['success_color', 'warning_color', 'error_color', 'info_color'] as ColorKey[]).map((k) => (
//                     <div key={k as string} className="flex-1 h-5 rounded" style={{ backgroundColor: (colors[k] as string) || '#ccc' }} />
//                   ))}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
