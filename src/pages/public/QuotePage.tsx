import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Trash2, CheckCircle, Send, Plus, Minus } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useTheme } from '../../contexts/ThemeContext';
import { submitQuoteRequest } from '../../services/quotes';
import { formatCurrency } from '../../lib/utils';
import { z } from 'zod';

const quoteSchema = z.object({
  full_name: z.string().min(2, 'Le nom doit comporter au moins 2 caractères'),
  phone: z.string().min(6, 'Le numéro de téléphone est requis'),
  email: z.string().email('E-mail invalide').optional().or(z.literal('')),
  message: z.string().optional(),
});

type QuoteForm = z.infer<typeof quoteSchema>;

export function QuotePage() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice, totalItems } = useCart();
  const { settings } = useTheme();
  const [form, setForm] = useState<QuoteForm>({ full_name: '', phone: '', email: '', message: '' });
  const [errors, setErrors] = useState<Partial<QuoteForm>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = quoteSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<QuoteForm> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof QuoteForm;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const quoteItems = items.map((item) => ({
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    }));

    const { error } = await submitQuoteRequest({
      full_name: form.full_name,
      phone: form.phone,
      email: form.email || '',
      message: form.message || '',
      items: quoteItems,
    });

    setLoading(false);
    if (!error) {
      setSuccess(true);
      clearCart();
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center" style={{ color: 'var(--color-text)' }}>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'var(--color-success)' + '20' }}
        >
          <CheckCircle size={32} style={{ color: 'var(--color-success)' }} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Demande de devis envoyée!</h1>
        <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Merci pour votre intérêt. Notre équipe examinera votre demande et vous contactera sous peu.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/catalog"
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Continuer les achats
          </Link>
          <button
            onClick={() => setSuccess(false)}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm border transition-all"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            Nouvelle demande
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '80vh' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Demander un devis</h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Parcourez notre catalogue, ajoutez des produits à votre panier de devis, puis remplissez vos coordonnées ci-dessous.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
                <ShoppingCart size={18} style={{ color: 'var(--color-primary)' }} />
                <h2 className="font-semibold">Panier de devis ({totalItems} article{totalItems !== 1 ? 's' : ''})</h2>
              </div>

              {items.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <ShoppingCart size={40} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Votre panier est vide</p>
                  <p className="text-xs mt-1 mb-4" style={{ color: 'var(--color-text-muted)' }}>Parcourez le catalogue et ajoutez des produits pour commencer</p>
                  <Link
                    to="/catalog"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    Parcourir le catalogue
                  </Link>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {items.map((item) => (
                    <div key={item.product.id} className="px-5 py-4 flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-xl overflow-hidden shrink-0"
                        style={{ backgroundColor: 'var(--color-bg)' }}
                      >
                        {item.product.images?.[0] ? (
                          <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--color-text-muted)' }}>IMG</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                          {item.product.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {formatCurrency(item.product.price, settings.currency)} l&apos;unité
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
                          style={{ border: '1px solid var(--color-border)' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
                          style={{ border: '1px solid var(--color-border)' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm font-bold w-20 text-right shrink-0" style={{ color: 'var(--color-primary)' }}>
                        {formatCurrency(item.product.price * item.quantity, settings.currency)}
                      </span>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                        style={{ color: 'var(--color-error)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="px-5 py-4 flex items-center justify-between">
                    <button
                      onClick={clearCart}
                      className="text-xs font-medium transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-error)' }}
                    >
                      Vider le panier
                    </button>
                    <div className="text-right">
                      <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Total estimé</p>
                      <p className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                        {formatCurrency(totalPrice, settings.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quote Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-2 rounded-2xl p-5 h-fit"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="font-semibold mb-5" style={{ color: 'var(--color-text)' }}>Vos informations</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>
                  Nom Complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    borderColor: errors.full_name ? 'var(--color-error)' : 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
                {errors.full_name && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors.full_name}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 234 567 890"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    borderColor: errors.phone ? 'var(--color-error)' : 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
                {errors.phone && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors.phone}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    borderColor: errors.email ? 'var(--color-error)' : 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
                {errors.email && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors.email}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  placeholder="Tell us more about your requirements..."
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors resize-none"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {loading ? (
                  <span className="animate-pulse">Envoi en cours...</span>
                ) : (
                  <>
                    <Send size={15} />
                    Envoyer la demande de devis
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
