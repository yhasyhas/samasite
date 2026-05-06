import type { QuoteRequest } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/* ============================================================
   SOUMISSION PUBLIQUE (fetch direct, pas de token auth)
   ============================================================ */

export async function submitQuoteRequest(quote: Partial<QuoteRequest>) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/quote_requests?select=*`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(quote),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[submitQuoteRequest] HTTP', response.status, errorText);
    return {
      data: null,
      error: new Error(`Erreur ${response.status}: ${errorText}`),
    };
  }

  const data = await response.json();
  return { data: data[0] as QuoteRequest, error: null };
}

/* ============================================================
   ADMIN (utilise supabase normal avec auth)
   ============================================================ */

export async function getQuotes(filters?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { supabase } = await import('../lib/supabase');

  let query = supabase
    .from('quote_requests')
    .select('*', { count: 'exact' });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1);

  query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query;
  return { data: data as QuoteRequest[] | null, error, count };
}

export async function updateQuote(id: string, updates: Partial<QuoteRequest>) {
  const { supabase } = await import('../lib/supabase');

  const { data, error } = await supabase
    .from('quote_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  return { data: data as QuoteRequest | null, error };
}