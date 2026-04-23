import { supabase } from '../lib/supabase';
import type { QuoteRequest } from '../types';

export async function submitQuoteRequest(quote: Partial<QuoteRequest>) {
  const { data, error } = await supabase
    .from('quote_requests')
    .insert(quote)
    .select()
    .maybeSingle();
  return { data: data as QuoteRequest | null, error };
}

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
    query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
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
