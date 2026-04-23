export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number, currency = 'XOF'): string {
  if (currency === 'XOF' || currency === 'XAF') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + currency;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getStockStatus(qty: number): { label: string; color: string } {
  if (qty === 0) return { label: 'Out of Stock', color: 'error' };
  if (qty <= 5) return { label: 'Low Stock', color: 'warning' };
  return { label: 'In Stock', color: 'success' };
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    ready: '#8b5cf6',
    shipped: '#06b6d4',
    delivered: '#10b981',
    cancelled: '#ef4444',
  };
  return colors[status] || '#64748b';
}

export function getQuoteStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: '#3b82f6',
    processing: '#f59e0b',
    converted: '#10b981',
    closed: '#64748b',
  };
  return colors[status] || '#64748b';
}
