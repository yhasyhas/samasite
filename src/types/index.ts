export interface SiteSettings {
  id: string;
  store_name: string;
  store_tagline: string;
  store_description: string;
  logo_url: string;
  favicon_url: string;
  currency: string;
  maintenance_mode: boolean;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  primary_color: string;
  primary_hover: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_primary_color: string;
  text_secondary_color: string;
  text_on_primary: string;
  border_color: string;
  success_color: string;
  warning_color: string;
  error_color: string;
  info_color: string;
  dark_background: string;
  dark_surface: string;
  dark_text_primary: string;
  dark_text_secondary: string;
  dark_border: string;
  hero_mode: 'color' | 'image';
  hero_image_url: string;
  hero_overlay_opacity: number;
  updated_at: string;
  updated_by: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'super_admin' | 'manager' | 'seller';
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  parent?: Category;
  children?: Category[];
}

export interface ProductImage {
  url: string;
  alt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  compare_at_price: number | null;
  stock_qty: number;
  category_id: string | null;
  images: ProductImage[];
  is_active: boolean;
  is_featured: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Promotion {
  id: string;
  code: string;
  label: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  min_purchase: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  applicable_to: 'all' | 'specific_categories' | 'specific_products';
  created_by: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  source: 'phone' | 'website_quote' | 'whatsapp' | 'email' | 'in_store' | 'other';
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'ready' | 'shipped' | 'delivered' | 'cancelled';
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  created_by_profile?: Profile;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: Product;
}

export interface QuoteRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  message: string;
  items: QuoteItem[];
  status: 'new' | 'processing' | 'converted' | 'closed';
  converted_to_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'status_change' | 'export' | 'theme_change';
  entity_type: 'product' | 'order' | 'category' | 'promotion' | 'user' | 'quote' | 'setting';
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
  profile?: Profile;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
