import { supabase } from '../lib/supabase';
import type { QuoteRequest } from '../types';

export async function submitQuoteRequest(quote: Partial<QuoteRequest>) {
  const response = await fetch('/api/submit-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quote),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[submitQuoteRequest] Erreur:', errorData);
    return {
      data: null,
      error: new Error(errorData.error || `Erreur ${response.status}`),
    };
  }

  const result = await response.json();
  return { data: result.data as QuoteRequest, error: null };
}

// --- Admin functions (inchangées) ---
export async function getQuotes(filters?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
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
  const { data, error } = await supabase
    .from('quote_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  return { data: data as QuoteRequest | null, error };
}