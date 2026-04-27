-- Migration : Ajout des champs hero à site_settings
-- À exécuter dans l'éditeur SQL de Supabase

ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS hero_mode text DEFAULT 'color' CHECK (hero_mode IN ('color', 'image')),
ADD COLUMN IF NOT EXISTS hero_image_url text DEFAULT '',
ADD COLUMN IF NOT EXISTS hero_overlay_opacity integer DEFAULT 50 CHECK (hero_overlay_opacity >= 0 AND hero_overlay_opacity <= 90);

-- Mettre à jour la ligne existante avec les valeurs par défaut
UPDATE site_settings
SET hero_mode = COALESCE(hero_mode, 'color'),
    hero_image_url = COALESCE(hero_image_url, ''),
    hero_overlay_opacity = COALESCE(hero_overlay_opacity, 50)
WHERE id IS NOT NULL;