import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { SiteSettings } from '../types';

const DEFAULT_SETTINGS: SiteSettings = {
  id: '',
  store_name: 'CatalogPro',
  store_tagline: 'Fais-toi plaisir, on s’occupe du reste',
  store_description: '',
  logo_url: '',
  favicon_url: '',
  currency: 'XOF',
  maintenance_mode: false,
  contact_phone: '',
  contact_email: '',
  contact_address: '',
  primary_color: '#0f172a',
  primary_hover: '#1e293b',
  secondary_color: '#64748b',
  accent_color: '#f59e0b',
  background_color: '#ffffff',
  surface_color: '#f8fafc',
  text_primary_color: '#0f172a',
  text_secondary_color: '#475569',
  text_on_primary: '#ffffff',
  border_color: '#e2e8f0',
  success_color: '#10b981',
  warning_color: '#f59e0b',
  error_color: '#ef4444',
  info_color: '#3b82f6',
  dark_background: '#0f172a',
  dark_surface: '#1e293b',
  dark_text_primary: '#f8fafc',
  dark_text_secondary: '#94a3b8',
  dark_border: '#334155',
  hero_mode: 'color',
  hero_image_url: '',
  hero_overlay_opacity: 50,
  updated_at: '',
  updated_by: null,
};

interface ThemeContextValue {
  settings: SiteSettings;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  refreshSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  settings: DEFAULT_SETTINGS,
  isDarkMode: false,
  toggleDarkMode: () => {},
  refreshSettings: async () => {},
});

function injectCSSVariables(settings: SiteSettings, isDark: boolean) {
  const root = document.documentElement;
  if (isDark) {
    root.style.setProperty('--color-bg', settings.dark_background);
    root.style.setProperty('--color-surface', settings.dark_surface);
    root.style.setProperty('--color-text', settings.dark_text_primary);
    root.style.setProperty('--color-text-muted', settings.dark_text_secondary);
    root.style.setProperty('--color-border', settings.dark_border);
  } else {
    root.style.setProperty('--color-bg', settings.background_color);
    root.style.setProperty('--color-surface', settings.surface_color);
    root.style.setProperty('--color-text', settings.text_primary_color);
    root.style.setProperty('--color-text-muted', settings.text_secondary_color);
    root.style.setProperty('--color-border', settings.border_color);
  }
  root.style.setProperty('--color-primary', settings.primary_color);
  root.style.setProperty('--color-primary-hover', settings.primary_hover);
  root.style.setProperty('--color-secondary', settings.secondary_color);
  root.style.setProperty('--color-accent', settings.accent_color);
  root.style.setProperty('--color-text-on-primary', settings.text_on_primary);
  root.style.setProperty('--color-success', settings.success_color);
  root.style.setProperty('--color-warning', settings.warning_color);
  root.style.setProperty('--color-error', settings.error_color);
  root.style.setProperty('--color-info', settings.info_color);
  root.style.setProperty('--dark-bg', settings.dark_background);
  root.style.setProperty('--dark-surface', settings.dark_surface);
  root.style.setProperty('--dark-text', settings.dark_text_primary);
  root.style.setProperty('--dark-text-muted', settings.dark_text_secondary);
  root.style.setProperty('--dark-border', settings.dark_border);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const applyTheme = useCallback((s: SiteSettings, dark: boolean) => {
    injectCSSVariables(s, dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    const { data } = await supabase.from('site_settings').select('*').maybeSingle();
    if (data) {
      setSettings(data as SiteSettings);
      applyTheme(data as SiteSettings, isDarkMode);
      if (data.favicon_url) {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
        if (link) link.href = data.favicon_url;
      }
      if (data.store_name) {
        document.title = data.store_name;
      }
    }
  }, [isDarkMode, applyTheme]);

  useEffect(() => {
    refreshSettings();
  }, []);

  useEffect(() => {
    applyTheme(settings, isDarkMode);
  }, [isDarkMode, settings, applyTheme]);

  useEffect(() => {
    const channel = supabase
      .channel('site_settings_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, (payload) => {
        const updated = payload.new as SiteSettings;
        setSettings(updated);
        applyTheme(updated, isDarkMode);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDarkMode, applyTheme]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  return (
    <ThemeContext.Provider value={{ settings, isDarkMode, toggleDarkMode, refreshSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
// import { supabase } from '../lib/supabase';
// import type { SiteSettings } from '../types';

// const DEFAULT_SETTINGS: SiteSettings = {
//   id: '',
//   store_name: 'CatalogPro',
//   store_tagline: 'Fais-toi plaisir, on s’occupe du reste',
//   store_description: '',
//   logo_url: '',
//   favicon_url: '',
//   currency: 'XOF',
//   maintenance_mode: false,
//   contact_phone: '',
//   contact_email: '',
//   contact_address: '',
//   primary_color: '#0f172a',
//   primary_hover: '#1e293b',
//   secondary_color: '#64748b',
//   accent_color: '#f59e0b',
//   background_color: '#ffffff',
//   surface_color: '#f8fafc',
//   text_primary_color: '#0f172a',
//   text_secondary_color: '#475569',
//   text_on_primary: '#ffffff',
//   border_color: '#e2e8f0',
//   success_color: '#10b981',
//   warning_color: '#f59e0b',
//   error_color: '#ef4444',
//   info_color: '#3b82f6',
//   dark_background: '#0f172a',
//   dark_surface: '#1e293b',
//   dark_text_primary: '#f8fafc',
//   dark_text_secondary: '#94a3b8',
//   dark_border: '#334155',
//   updated_at: '',
//   updated_by: null,
// };

// interface ThemeContextValue {
//   settings: SiteSettings;
//   isDarkMode: boolean;
//   toggleDarkMode: () => void;
//   refreshSettings: () => Promise<void>;
// }

// const ThemeContext = createContext<ThemeContextValue>({
//   settings: DEFAULT_SETTINGS,
//   isDarkMode: false,
//   toggleDarkMode: () => {},
//   refreshSettings: async () => {},
// });

// function injectCSSVariables(settings: SiteSettings, isDark: boolean) {
//   const root = document.documentElement;
//   if (isDark) {
//     root.style.setProperty('--color-bg', settings.dark_background);
//     root.style.setProperty('--color-surface', settings.dark_surface);
//     root.style.setProperty('--color-text', settings.dark_text_primary);
//     root.style.setProperty('--color-text-muted', settings.dark_text_secondary);
//     root.style.setProperty('--color-border', settings.dark_border);
//   } else {
//     root.style.setProperty('--color-bg', settings.background_color);
//     root.style.setProperty('--color-surface', settings.surface_color);
//     root.style.setProperty('--color-text', settings.text_primary_color);
//     root.style.setProperty('--color-text-muted', settings.text_secondary_color);
//     root.style.setProperty('--color-border', settings.border_color);
//   }
//   root.style.setProperty('--color-primary', settings.primary_color);
//   root.style.setProperty('--color-primary-hover', settings.primary_hover);
//   root.style.setProperty('--color-secondary', settings.secondary_color);
//   root.style.setProperty('--color-accent', settings.accent_color);
//   root.style.setProperty('--color-text-on-primary', settings.text_on_primary);
//   root.style.setProperty('--color-success', settings.success_color);
//   root.style.setProperty('--color-warning', settings.warning_color);
//   root.style.setProperty('--color-error', settings.error_color);
//   root.style.setProperty('--color-info', settings.info_color);
//   root.style.setProperty('--dark-bg', settings.dark_background);
//   root.style.setProperty('--dark-surface', settings.dark_surface);
//   root.style.setProperty('--dark-text', settings.dark_text_primary);
//   root.style.setProperty('--dark-text-muted', settings.dark_text_secondary);
//   root.style.setProperty('--dark-border', settings.dark_border);
// }

// export function ThemeProvider({ children }: { children: React.ReactNode }) {
//   const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
//   const [isDarkMode, setIsDarkMode] = useState(false);

//   const applyTheme = useCallback((s: SiteSettings, dark: boolean) => {
//     injectCSSVariables(s, dark);
//     if (dark) {
//       document.documentElement.classList.add('dark');
//     } else {
//       document.documentElement.classList.remove('dark');
//     }
//   }, []);

//   const refreshSettings = useCallback(async () => {
//     const { data } = await supabase.from('site_settings').select('*').maybeSingle();
//     if (data) {
//       setSettings(data as SiteSettings);
//       applyTheme(data as SiteSettings, isDarkMode);
//       if (data.favicon_url) {
//         const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
//         if (link) link.href = data.favicon_url;
//       }
//       if (data.store_name) {
//         document.title = data.store_name;
//       }
//     }
//   }, [isDarkMode, applyTheme]);

//   useEffect(() => {
//     refreshSettings();
//   }, []);

//   useEffect(() => {
//     applyTheme(settings, isDarkMode);
//   }, [isDarkMode, settings, applyTheme]);

//   useEffect(() => {
//     const channel = supabase
//       .channel('site_settings_changes')
//       .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, (payload) => {
//         const updated = payload.new as SiteSettings;
//         setSettings(updated);
//         applyTheme(updated, isDarkMode);
//       })
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [isDarkMode, applyTheme]);

//   const toggleDarkMode = useCallback(() => {
//     setIsDarkMode((prev) => !prev);
//   }, []);

//   return (
//     <ThemeContext.Provider value={{ settings, isDarkMode, toggleDarkMode, refreshSettings }}>
//       {children}
//     </ThemeContext.Provider>
//   );
// }

// export function useTheme() {
//   return useContext(ThemeContext);
// }
