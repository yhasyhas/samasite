/*
  # Initial Schema - E-Commerce Catalog & Admin Platform

  ## Overview
  Creates the complete database schema for a generic e-commerce catalog and admin platform
  that works for any industry without hardcoded business logic.

  ## New Tables
  1. **site_settings** - Single-row store identity, theming, and configuration
  2. **profiles** - Staff-only user profiles linked to auth.users
  3. **categories** - Hierarchical product categories with slugs
  4. **products** - Full product catalog with images (jsonb), pricing, stock
  5. **promotions** - Discount codes (percentage or fixed amount)
  6. **promotion_links** - Many-to-many: promotions to products/categories
  7. **orders** - Admin-managed orders from any source (phone, quote, etc.)
  8. **order_items** - Line items within orders
  9. **quote_requests** - Public (no-auth) quote request form submissions
  10. **activity_logs** - Audit trail for all admin actions

  ## Security
  - RLS enabled on all tables
  - site_settings: readable by everyone (anon), writable only by super_admin
  - profiles: readable/writable only by authenticated staff
  - products/categories: readable by everyone, writable by authenticated staff
  - quote_requests: insertable by anon, manageable by authenticated staff
  - orders/order_items: authenticated staff only
  - activity_logs: authenticated staff can read, system inserts

  ## Notes
  - Products store images as jsonb array of objects {url, alt}
  - order_number is auto-generated via trigger
  - All timestamps use timestamptz for timezone awareness
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'seller' CHECK (role IN ('super_admin','manager','seller')),
  phone text,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated staff"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- ============================================================
-- SITE SETTINGS TABLE (single row)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL DEFAULT 'My Store',
  store_tagline text DEFAULT '',
  store_description text DEFAULT '',
  logo_url text DEFAULT '',
  favicon_url text DEFAULT '',
  currency text DEFAULT 'XOF',
  maintenance_mode boolean DEFAULT false,
  contact_phone text DEFAULT '',
  contact_email text DEFAULT '',
  contact_address text DEFAULT '',
  -- Theme colors
  primary_color text DEFAULT '#0f172a',
  primary_hover text DEFAULT '#1e293b',
  secondary_color text DEFAULT '#64748b',
  accent_color text DEFAULT '#f59e0b',
  background_color text DEFAULT '#ffffff',
  surface_color text DEFAULT '#f8fafc',
  text_primary_color text DEFAULT '#0f172a',
  text_secondary_color text DEFAULT '#475569',
  text_on_primary text DEFAULT '#ffffff',
  border_color text DEFAULT '#e2e8f0',
  success_color text DEFAULT '#10b981',
  warning_color text DEFAULT '#f59e0b',
  error_color text DEFAULT '#ef4444',
  info_color text DEFAULT '#3b82f6',
  -- Dark mode
  dark_background text DEFAULT '#0f172a',
  dark_surface text DEFAULT '#1e293b',
  dark_text_primary text DEFAULT '#f8fafc',
  dark_text_secondary text DEFAULT '#94a3b8',
  dark_border text DEFAULT '#334155',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings readable by everyone"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Super admins can update site settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert site settings"
  ON site_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories readable by everyone"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated staff can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager')
    )
  );

CREATE POLICY "Authenticated staff can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager')
    )
  );

CREATE POLICY "Super admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager')
    )
  );

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  short_description text DEFAULT '',
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  compare_at_price numeric(12,2),
  stock_qty integer NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  images jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products readable by everyone"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated staff can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager','seller')
    )
  );

CREATE POLICY "Authenticated staff can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager','seller')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager','seller')
    )
  );

CREATE POLICY "Managers and admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager')
    )
  );

-- ============================================================
-- PROMOTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text DEFAULT '',
  type text NOT NULL CHECK (type IN ('percentage','fixed_amount')),
  value numeric(12,2) NOT NULL CHECK (value > 0),
  min_purchase numeric(12,2) DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean DEFAULT true,
  applicable_to text DEFAULT 'all' CHECK (applicable_to IN ('all','specific_categories','specific_products')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promotions readable by authenticated staff"
  ON promotions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Active promotions readable by anon"
  ON promotions FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Managers can insert promotions"
  ON promotions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager')
    )
  );

CREATE POLICY "Managers can update promotions"
  ON promotions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager')
    )
  );

CREATE POLICY "Super admins can delete promotions"
  ON promotions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager')
    )
  );

-- ============================================================
-- PROMOTION_LINKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS promotion_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE
);

ALTER TABLE promotion_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promotion links readable by authenticated staff"
  ON promotion_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage promotion links"
  ON promotion_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager')
    )
  );

CREATE POLICY "Managers can delete promotion links"
  ON promotion_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager')
    )
  );

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  source text DEFAULT 'phone' CHECK (source IN ('phone','website_quote','whatsapp','email','in_store','other')),
  customer_name text NOT NULL,
  customer_email text DEFAULT '',
  customer_phone text NOT NULL,
  customer_address text DEFAULT '',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','shipped','delivered','cancelled')),
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated staff can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated staff can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Managers can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','manager')
    )
  );

-- ============================================================
-- ORDER_ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL,
  total_price numeric(12,2) NOT NULL
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated staff can insert order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated staff can update order items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated staff can delete order items"
  ON order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- ============================================================
-- QUOTE_REQUESTS TABLE (public, no auth required for insert)
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text DEFAULT '',
  phone text NOT NULL,
  message text DEFAULT '',
  items jsonb DEFAULT '[]',
  status text DEFAULT 'new' CHECK (status IN ('new','processing','converted','closed')),
  converted_to_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit quote requests"
  ON quote_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can view quote requests"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated staff can update quote requests"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- ============================================================
-- ACTIVITY_LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('create','update','delete','login','logout','status_change','export','theme_change')),
  entity_type text NOT NULL CHECK (entity_type IN ('product','order','category','promotion','user','quote','setting')),
  entity_id uuid,
  details jsonb DEFAULT '{}',
  ip_address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated staff can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- ============================================================
-- ORDER NUMBER GENERATION FUNCTION + TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER quote_requests_updated_at
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================================
-- SEED: Default site settings (single row)
-- ============================================================
INSERT INTO site_settings (
  store_name, store_tagline, store_description,
  currency, contact_phone, contact_email, contact_address,
  primary_color, primary_hover, secondary_color, accent_color,
  background_color, surface_color, text_primary_color, text_secondary_color,
  text_on_primary, border_color, success_color, warning_color, error_color, info_color,
  dark_background, dark_surface, dark_text_primary, dark_text_secondary, dark_border
) VALUES (
  'CatalogPro', 'Vos produits, présentés avec soin', 'Un catalogue e‑commerce moderne pour toute activités.',
  'XOF', '+1 234 567 890', 'hello@catalogpro.com', '123 Commerce Street, Business District',
  '#0f172a', '#1e293b', '#64748b', '#f59e0b',
  '#ffffff', '#f8fafc', '#0f172a', '#475569',
  '#ffffff', '#e2e8f0', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#0f172a', '#1e293b', '#f8fafc', '#94a3b8', '#334155'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Sample categories
-- ============================================================
INSERT INTO categories (name, slug, description, sort_order, is_active) VALUES
  ('Électronique', 'électronique', 'Appareils électroniques et accessoires', 1, true),
  ('Meubles', 'meubles', 'Meubles maison et bureau', 2, true),
  ('Électroménager', 'électromenager', 'Électroménager maison et cuisine', 3, true),
  ('Smartphones', 'smartphones', 'Smartphones et accessoires', 4, true),
  ('Ordinateurs', 'ordinateurs', 'Ordinateurs portables et fixes', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: Sample products
-- ============================================================
INSERT INTO products (sku, name, slug, short_description, description, price, compare_at_price, stock_qty, is_active, is_featured, images)
VALUES
  ('SKU-001', 'ProBook Ultra 15', 'probook-ultra-15', 'Ordinateur portable haute performance pour professionnels', 'Le ProBook Ultra 15 est équipé avec un processeur Intel Core i7 de 12e génération, de 16 Go de RAM DDR5 et un superbe écran OLED de 15,6 pouces. Idéal pour les professionnels de la création et les utilisateurs exigeants.', 899000, 1050000, 12, true, true, '[{"url":"https://images.pexels.com/photos/18105/pexels-photo.jpg","alt":"ProBook Ultra 15"},{"url":"https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg","alt":"ProBook Ultra 15 Side View"}]'::jsonb),
  ('SKU-002', 'SmartPhone X12 Pro', 'smartphone-x12-pro', '6.7 AMOLED, 200MP camera, 5G ready', 'Découvrez une technologie mobile de pointe avec le SmartPhone X12 Pro. Il a un appareil photo principal de 200 Mpx, un écran Super AMOLED de 6,7 pouces, une batterie de 5000 mAh et de la connectivité 5G.', 450000, 520000, 25, true, true, '[{"url":"https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg","alt":"SmartPhone X12 Pro"}]'::jsonb),
  ('SKU-003', 'ErgoChair Elite', 'ergochair-elite', 'Chaise de bureau ergonomique premium', 'ErgoChair Elite offre un soutien lombaire exceptionnel et une grande adaptabilité. Son dossier en maille respirante, ses accoudoirs réglables et son support lombaire en font le choix idéal pour les longues sessions de travail.', 185000, null, 8, true, false, '[{"url":"https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg","alt":"ErgoChair Elite"}]'::jsonb),
  ('SKU-004', 'CoolBreeze Split AC 1.5T', 'coolbreeze-split-ac-15t', 'Climatiseur inverseur économe en énergie', 'Restez au frais avec le climatiseur split CoolBreeze. Classe énergétique 5 étoiles, technologie inverter pour un fonctionnement silencieux, et connectivité intelligente via application mobile.', 320000, 380000, 5, true, true, '[{"url":"https://images.pexels.com/photos/3689532/pexels-photo-3689532.jpeg","alt":"CoolBreeze AC"}]'::jsonb),
  ('SKU-005', 'SoundMax Wireless Headphones', 'soundmax-wireless-headphones', 'Autonomie de 40 heures, réduction active du bruit', 'Plongez dans une expérience audio supérieure. Haut-parleurs de 40 mm, autonomie de 40 heures, réduction active du bruit et confort premium pour une écoute toute la journée.', 95000, 120000, 30, true, false, '[{"url":"https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg","alt":"SoundMax Headphones"}]'::jsonb),
  ('SKU-006', 'KitchenPro 5-in-1 Blender', 'kitchenpro-5in1-blender', 'Blender de cuisine multifonction puissant', 'Le blender 5-en-1 KitchenPro gère tout, des smoothies aux soupes. Moteur de 1200 W, 5 vitesses, pièces compatibles lave-vaisselle.', 55000, 70000, 20, true, false, '[{"url":"https://images.pexels.com/photos/3872355/pexels-photo-3872355.jpeg","alt":"KitchenPro Blender"}]'::jsonb)
ON CONFLICT (slug) DO NOTHING;
