import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart, Moon, Sun, Search } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCart } from '../../contexts/CartContext';

export function PublicHeader() {
  const { settings, isDarkMode, toggleDarkMode } = useTheme();
  const { totalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const navLinks = [
    { to: '/', label: 'Acceuil' },
    { to: '/catalog', label: 'Catalogue' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled ? 'shadow-md backdrop-blur-sm' : ''
      }`}
      style={{
        backgroundColor: isScrolled
          ? (isDarkMode ? 'var(--dark-bg)' : 'var(--color-bg)') + 'f0'
          : isDarkMode ? 'var(--dark-bg)' : 'var(--color-bg)',
        borderBottom: isScrolled ? '1px solid var(--color-border)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.store_name} className="h-9 w-auto object-contain" />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg transition-transform group-hover:scale-105"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)' }}
              >
                {settings.store_name.charAt(0)}
              </div>
            )}
            <span className="font-bold text-xl" style={{ color: 'var(--color-text)' }}>
              {settings.store_name}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === link.to ? 'font-semibold' : 'hover:opacity-80'
                }`}
                style={{
                  color: location.pathname === link.to ? 'var(--color-primary)' : 'var(--color-text)',
                  backgroundColor: location.pathname === link.to ? 'var(--color-primary)' + '15' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/catalog"
              className="p-2 rounded-lg transition-colors hover:bg-black/5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Search size={18} />
            </Link>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg transition-colors hover:bg-black/5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              to="/quote"
              className="relative p-2 rounded-lg transition-colors hover:bg-black/5"
              style={{ color: 'var(--color-text)' }}
            >
              <ShoppingCart size={18} />
              {totalItems > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  {totalItems}
                </span>
              )}
            </Link>
            <Link
              to="/quote"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:shadow-md"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              Demander un devis
            </Link>
            <button
              className="md:hidden p-2 rounded-lg"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ color: 'var(--color-text)' }}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div
          className="md:hidden border-t"
          style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
        >
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  color: location.pathname === link.to ? 'var(--color-primary)' : 'var(--color-text)',
                  backgroundColor: location.pathname === link.to ? 'var(--color-primary)' + '15' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/quote"
              className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-center mt-2"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              Demander un devis
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
