import { supabase } from '../lib/supabase';
import type { Order, OrderItem } from '../types';

export async function getOrders(filters?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(id,name,sku,images))', { count: 'exact' });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    query = query.or(`customer_name.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%,order_number.ilike.%${filters.search}%`);
  }
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1);

  query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query;
  return { data: data as Order[] | null, error, count };
}

export async function getOrderById(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(id,name,sku,images,price))')
    .eq('id', id)
    .maybeSingle();
  return { data: data as Order | null, error };
}

export async function createOrder(order: Partial<Order>, items: Partial<OrderItem>[]) {
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert({ ...order, order_number: '' })
    .select()
    .maybeSingle();

  if (orderError || !orderData) return { data: null, error: orderError };

  const orderItems = items.map((item) => ({
    ...item,
    order_id: orderData.id,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) return { data: null, error: itemsError };

  return { data: orderData as Order, error: null };
}

export async function updateOrder(id: string, order: Partial<Order>) {
  const { data, error } = await supabase
    .from('orders')
    .update(order)
    .eq('id', id)
    .select()
    .maybeSingle();
  return { data: data as Order | null, error };
}

export async function getOrderStats() {
  const { data, error } = await supabase
    .from('orders')
    .select('status, total_amount, created_at');
  return { data, error };
}
