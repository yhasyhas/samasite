import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderOpen, ShoppingCart, MessageSquare,
  Tag, Users, Settings, Activity, LogOut, Menu, X, ChevronRight,
  Store, Search, Bell, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const NAV_ITEMS = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { to: '/admin/products', label: 'Produits', icon: Package },
  { to: '/admin/categories', label: 'Catégories', icon: FolderOpen },
  { to: '/admin/orders', label: 'Commandes', icon: ShoppingCart },
  { to: '/admin/quotes', label: 'Demandes de devis', icon: MessageSquare },
  { to: '/admin/promotions', label: 'Promotions', icon: Tag },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users },
  { to: '/admin/logs', label: 'Journaux activité', icon: Activity },
];

const SETTINGS_ITEMS = [
  { to: '/admin/settings/general', label: 'Général', icon: Settings },
  { to: '/admin/settings/appearance', label: 'Apparence', icon: Store },
];

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const { settings } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const commandRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setCommandOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (commandOpen && commandRef.current) {
      setTimeout(() => commandRef.current?.focus(), 50);
    }
  }, [commandOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const allCommands = [...NAV_ITEMS, ...SETTINGS_ITEMS];
  const filteredCommands = commandQuery
    ? allCommands.filter((item) => item.label.toLowerCase().includes(commandQuery.toLowerCase()))
    : allCommands;

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-4 border-b border-slate-800">
        <Link to="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {settings.store_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{settings.store_name}</p>
            <p className="text-xs text-slate-400">Administration</p>
          </div>
        </Link>
      </div>

      <div className="p-3 border-b border-slate-800">
        <button
          onClick={() => setCommandOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-slate-400 text-sm"
        >
          <Search size={13} />
          <span className="flex-1 text-left text-xs">Rechercher...</span>
          <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">⌘K</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive(item.to, item.exact)
                ? 'bg-white text-slate-900'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}

        <div className="pt-3 pb-1">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Paramètres</p>
        </div>
        {SETTINGS_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive(item.to)
                ? 'bg-white text-slate-900'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-1">
        <Link
          to="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <ExternalLink size={16} />
          Voir la boutique
        </Link>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{profile?.full_name || profile?.email}</p>
            <p className="text-xs text-slate-500 capitalize">{profile?.role?.replace(/_/g, ' ')}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-60 shrink-0 flex-col border-r border-slate-200">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-60 flex flex-col">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              {location.pathname.split('/').filter(Boolean).map((segment, idx, arr) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight size={12} />}
                  <span className={idx === arr.length - 1 ? 'text-slate-700 font-medium capitalize' : 'capitalize'}>
                    {segment}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCommandOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs transition-colors"
            >
              <Search size={13} />
              Search
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-500">⌘K</span>
            </button>
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <Bell size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Command palette */}
      {commandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCommandOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
              <Search size={16} className="text-slate-400" />
              <input
                ref={commandRef}
                type="text"
                placeholder="Search pages..."
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                className="flex-1 text-sm outline-none text-slate-900 placeholder-slate-400"
              />
              <button
                onClick={() => setCommandOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400"
              >
                <X size={14} />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto py-2">
              {filteredCommands.map((item) => (
                <button
                  key={item.to}
                  onClick={() => {
                    navigate(item.to);
                    setCommandOpen(false);
                    setCommandQuery('');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
                >
                  <item.icon size={15} className="text-slate-400" />
                  <span className="text-sm text-slate-700">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
