import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { useTheme } from '../../contexts/ThemeContext';

export function PublicLayout() {
  const { settings } = useTheme();

  if (settings.maintenance_mode) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="text-center px-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)' }}
          >
            {settings.store_name.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold mb-2">{settings.store_name}</h1>
          <p className="text-base" style={{ color: 'var(--color-text-muted)' }}>
            Notre site est actuellement en maintenance. Nous revenons très vite !
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
