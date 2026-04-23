import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export function PublicFooter() {
  const { settings } = useTheme();

  return (
    <footer
      className="mt-auto pt-12 pb-6"
      style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={settings.store_name} className="h-8 w-auto object-contain" />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  {settings.store_name.charAt(0)}
                </div>
              )}
              <span className="font-bold text-lg">{settings.store_name}</span>
            </div>
            {settings.store_tagline && (
              <p className="text-sm opacity-70 leading-relaxed">{settings.store_tagline}</p>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-60">Liens utiles</h4>
            <ul className="space-y-2">
              {[
                { to: '/', label: 'Acceuil' },
                { to: '/catalog', label: 'Catalogue' },
                { to: '/quote', label: 'Demande de devis' },
                { to: '/contact', label: 'Nous contacter' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-60">Contact</h4>
            <ul className="space-y-2.5">
              {settings.contact_phone && (
                <li className="flex items-center gap-2 text-sm opacity-70">
                  <Phone size={14} />
                  <a href={`tel:${settings.contact_phone}`} className="hover:opacity-100 transition-opacity">
                    {settings.contact_phone}
                  </a>
                </li>
              )}
              {settings.contact_email && (
                <li className="flex items-center gap-2 text-sm opacity-70">
                  <Mail size={14} />
                  <a href={`mailto:${settings.contact_email}`} className="hover:opacity-100 transition-opacity">
                    {settings.contact_email}
                  </a>
                </li>
              )}
              {settings.contact_address && (
                <li className="flex items-start gap-2 text-sm opacity-70">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <span>{settings.contact_address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 opacity-50 text-xs">
          <p>&copy; {new Date().getFullYear()} {settings.store_name}. Tous droits réservés.</p>
          <p>Par JEN</p>
        </div>
      </div>
    </footer>
  );
}
