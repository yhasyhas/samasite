import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'manager' | 'seller';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!profile.is_active) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requiredRole) {
    const roleHierarchy = { super_admin: 3, manager: 2, seller: 1 };
    const userLevel = roleHierarchy[profile.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    if (userLevel < requiredLevel) {
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
}
