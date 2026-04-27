import React from 'react';
import { MessageCircle } from 'lucide-react';
import type { Product } from '../../types';
import type { CartItem } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

interface WhatsAppButtonProps {
  product?: Product;
  items?: CartItem[];
  totalPrice?: number;
  className?: string;
  label?: string;
  fullWidth?: boolean;
}

function buildWhatsAppUrl(phone: string, text: string): string {
  // Nettoie le numéro : retire espaces, +, tirets
  const cleanPhone = phone.replace(/[\s\-+]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function WhatsAppButton({
  product,
  items,
  totalPrice,
  className = '',
  label = 'WhatsApp',
  fullWidth = false,
}: WhatsAppButtonProps) {
  const { settings } = useTheme();
  const phone = settings.contact_phone;

  if (!phone) return null;

  let message = '';

  if (items && items.length > 0) {
    // Message pour le panier de devis
    const lines = items.map(
      (item) =>
        `• ${item.product.name} (x${item.quantity}) = ${formatCurrency(
          item.product.price * item.quantity,
          settings.currency
        )}`
    );
    message = `Bonjour ${settings.store_name},\n\nJe souhaite demander un devis pour :\n${lines.join('\n')}`;
    if (totalPrice && totalPrice > 0) {
      message += `\n\n*Total estimé :* ${formatCurrency(totalPrice, settings.currency)}`;
    }
    message += `\n\nMerci de me recontacter.`;
  } else if (product) {
    // Message pour un produit unique
    message = `Bonjour ${settings.store_name},\n\nJe suis intéressé par :\n• ${product.name} — ${formatCurrency(
      product.price,
      settings.currency
    )}`;
    if (product.short_description) {
      message += `\n(${product.short_description})`;
    }
    message += `\n\nPouvez-vous me faire un devis ?`;
  }

  if (!message) return null;

  const url = buildWhatsAppUrl(phone, message);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:shadow-sm ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      style={{
        backgroundColor: '#25D366',
        color: '#fff',
        padding: '0.6rem 1rem',
        borderRadius: '0.75rem',
      }}
    >
      <MessageCircle size={16} fill="currentColor" />
      {label}
    </a>
  );
}