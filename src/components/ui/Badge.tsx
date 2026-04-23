import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'solid' | 'soft';
  className?: string;
}

export function Badge({ children, color = '#64748b', variant = 'soft', className = '' }: BadgeProps) {
  if (variant === 'solid') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${className}`}
        style={{ backgroundColor: color }}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{ backgroundColor: color + '20', color }}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, type }: { status: string; type: 'order' | 'quote' | 'stock' }) {
  const orderColors: Record<string, string> = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    ready: '#8b5cf6',
    shipped: '#06b6d4',
    delivered: '#10b981',
    cancelled: '#ef4444',
  };
  const quoteColors: Record<string, string> = {
    new: '#3b82f6',
    processing: '#f59e0b',
    converted: '#10b981',
    closed: '#64748b',
  };
  const stockColors: Record<string, string> = {
    'In Stock': '#10b981',
    'Low Stock': '#f59e0b',
    'Out of Stock': '#ef4444',
  };

  const colorMap = type === 'order' ? orderColors : type === 'quote' ? quoteColors : stockColors;
  const color = colorMap[status] || '#64748b';

  return <Badge color={color}>{status.replace(/_/g, ' ')}</Badge>;
}
