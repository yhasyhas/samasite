import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { slugify } from '../lib/utils';
import type { Product, Category } from '../types';

/* ============================================================
   NETTOYAGE HTML POUR CSV (optionnel mais propre)
   ============================================================ */

function stripHtmlForExport(html: string): string {
  if (!html) return '';
  // Retire les balises script/style pour la sécurité
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Convertit les sauts de ligne HTML en \n pour que le CSV reste lisible
  cleaned = cleaned.replace(/<\/p>/gi, '\n');
  cleaned = cleaned.replace(/<\/li>/gi, '\n');
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  // Retire toutes les balises restantes
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  // Décode les entités HTML basiques
  cleaned = cleaned.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  // Nettoie les espaces multiples et sauts de ligne
  cleaned = cleaned.replace(/\n\s*\n/g, '\n').trim();
  return cleaned;
}

/* ============================================================
   EXPORT CSV (avec PapaParse)
   ============================================================ */

export function exportProductsToCSV(products: Product[], categories: Category[]) {
  const data = products.map((p) => {
    const catName = categories.find((c) => c.id === p.category_id)?.name || '';
    const images = p.images?.map((img) => img.url).join('|') || '';

    return {
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      description: stripHtmlForExport(p.description || ''),
      short_description: p.short_description || '',
      price: p.price,
      compare_at_price: p.compare_at_price ?? '',
      stock_qty: p.stock_qty,
      category_name: catName,
      images: images,
      is_active: p.is_active ? '1' : '0',
      is_featured: p.is_featured ? '1' : '0',
    };
  });

  const csv = Papa.unparse(data, {
    delimiter: ';',        // Séparateur français (Excel ouvre direct)
    quotes: true,            // Tout entre guillemets = zéro conflit
    newline: '\r\n',         // Compatible Windows & Excel
    header: true,
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `produits-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/* ============================================================
   IMPORT CSV — PARSING AVEC PAPAPARSE
   ============================================================ */

export interface CSVRow {
  sku: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  compare_at_price: number | null;
  stock_qty: number;
  category_name: string;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  _raw: Record<string, string>;
}

export interface ImportResult {
  valid: CSVRow[];
  errors: { row: number; sku: string; errors: string[] }[];
}

export function parseProductsCSV(csvText: string): ImportResult {
  const parseResult = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: ';',   // On attend du ; (français)
    transformHeader: (h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''),
  });

  // Si aucune donnée avec ;, essayer avec , (fallback)
  if (parseResult.data.length === 0 || parseResult.errors.length > 0) {
    const fallback = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      transformHeader: (h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''),
    });
    if (fallback.data.length > 0) {
      parseResult.data = fallback.data;
      parseResult.errors = fallback.errors;
    }
  }

  const valid: CSVRow[] = [];
  const errors: ImportResult['errors'] = [];

  parseResult.data.forEach((raw, idx) => {
    const rowNum = idx + 2; // +1 pour header, +1 pour 0-based
    const rowErrors: string[] = [];

    const sku = raw.sku?.trim();
    const name = raw.name?.trim();

    if (!sku) rowErrors.push('SKU manquant');
    if (!name) rowErrors.push('Nom manquant');

    const priceStr = raw.price?.replace(/\s/g, '').replace(/,/g, '.');
    const price = parseFloat(priceStr || '');
    if (isNaN(price) || price < 0) rowErrors.push('Prix invalide');

    const stockStr = raw.stock_qty?.replace(/\s/g, '');
    const stock = parseInt(stockStr || '0', 10);
    if (isNaN(stock) || stock < 0) rowErrors.push('Stock invalide');

    const compareStr = raw.compare_at_price?.replace(/\s/g, '').replace(/,/g, '.');
    const compare = compareStr ? parseFloat(compareStr) : null;
    if (compareStr && isNaN(compare as number)) rowErrors.push('Ancien prix invalide');

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, sku: sku || '—', errors: rowErrors });
      return;
    }

    // Images : split par | ou ; ou ,
    const imgRaw = raw.images || raw.image || '';
    const images = imgRaw
      .split(/[|,;]/)
      .map((u) => u.trim())
      .filter(Boolean);

    valid.push({
      sku,
      name,
      slug: raw.slug?.trim() || slugify(name),
      description: raw.description?.trim() || '',
      short_description: raw.short_description?.trim() || '',
      price,
      compare_at_price: compare,
      stock_qty: isNaN(stock) ? 0 : stock,
      category_name: raw.category_name?.trim() || raw.category?.trim() || '',
      images,
      is_active: ['1', 'true', 'oui', 'yes', 'active'].includes((raw.is_active || '').toLowerCase().trim()),
      is_featured: ['1', 'true', 'oui', 'yes'].includes((raw.is_featured || '').toLowerCase().trim()),
      _raw: raw,
    });
  });

  return { valid, errors };
}

/* ============================================================
   IMPORT CSV — EXECUTION (Upsert par SKU)
   ============================================================ */

export async function importProducts(rows: CSVRow[], existingCategories: Category[]) {
  const results = { created: 0, updated: 0, errors: 0, details: [] as string[] };

  const skus = rows.map((r) => r.sku);
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, sku')
    .in('sku', skus);

  const existingBySku = new Map((existingProducts || []).map((p) => [p.sku, p.id]));

  for (const row of rows) {
    const category = existingCategories.find(
      (c) => c.name.toLowerCase().trim() === row.category_name.toLowerCase().trim()
    );
    const category_id = category?.id || null;

    const payload = {
      sku: row.sku,
      name: row.name,
      slug: row.slug,
      description: row.description,
      short_description: row.short_description,
      price: row.price,
      compare_at_price: row.compare_at_price,
      stock_qty: row.stock_qty,
      category_id,
      images: row.images.map((url) => ({ url, alt: row.name })),
      is_active: row.is_active,
      is_featured: row.is_featured,
    };

    const existingId = existingBySku.get(row.sku);

    if (existingId) {
      const { error } = await supabase.from('products').update(payload).eq('id', existingId);
      if (error) {
        results.errors++;
        results.details.push(`${row.sku} : Échec mise à jour — ${error.message}`);
      } else {
        results.updated++;
      }
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) {
        results.errors++;
        results.details.push(`${row.sku} : Échec création — ${error.message}`);
      } else {
        results.created++;
      }
    }
  }

  return results;
}

/* ============================================================
   TEMPLATE CSV TÉLÉCHARGEABLE
   ============================================================ */

export function downloadProductsTemplate() {
  const data = [
    {
      sku: 'SKU-001',
      name: 'ProBook Ultra 15',
      slug: 'probook-ultra-15',
      description: 'Ordinateur portable haute performance pour professionnels',
      short_description: 'PC pro 15.6"',
      price: '899000',
      compare_at_price: '1050000',
      stock_qty: '12',
      category_name: 'Ordinateurs',
      images: 'https://ex.com/img1.jpg|https://ex.com/img2.jpg',
      is_active: '1',
      is_featured: '1',
    },
    {
      sku: 'SKU-002',
      name: 'SmartPhone X12 Pro',
      slug: 'smartphone-x12-pro',
      description: 'Smartphone 5G avec appareil photo 200MP',
      short_description: '6.7 AMOLED, 200MP, 5G',
      price: '450000',
      compare_at_price: '',
      stock_qty: '25',
      category_name: 'Smartphones',
      images: 'https://ex.com/phone.jpg',
      is_active: '1',
      is_featured: '0',
    },
  ];

  const csv = Papa.unparse(data, {
    delimiter: ';',
    quotes: true,
    newline: '\r\n',
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'template-produits.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// import { supabase } from '../lib/supabase';
// import { slugify } from '../lib/utils';
// import type { Product, Category } from '../types';

// /* ============================================================
//    EXPORT CSV
//    ============================================================ */

// export function exportProductsToCSV(products: Product[], categories: Category[]) {
//   const headers = [
//     'sku', 'name', 'slug', 'description', 'short_description',
//     'price', 'compare_at_price', 'stock_qty', 'category_name',
//     'images', 'is_active', 'is_featured'
//   ];

//   const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`;

//   const rows = products.map((p) => {
//     const catName = categories.find((c) => c.id === p.category_id)?.name || '';
//     const images = p.images?.map((img) => img.url).join('|') || '';
//     return [
//       p.sku,
//       p.name,
//       p.slug,
//       p.description || '',
//       p.short_description || '',
//       String(p.price),
//       p.compare_at_price ? String(p.compare_at_price) : '',
//       String(p.stock_qty),
//       catName,
//       images,
//       p.is_active ? '1' : '0',
//       p.is_featured ? '1' : '0',
//     ].map((c) => escape(c));
//   });

//   const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
//   const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
//   const link = document.createElement('a');
//   link.href = URL.createObjectURL(blob);
//   link.download = `produits-${new Date().toISOString().slice(0, 10)}.csv`;
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
//   URL.revokeObjectURL(link.href);
// }

// /* ============================================================
//    IMPORT CSV — PARSING & VALIDATION
//    ============================================================ */

// export interface CSVRow {
//   sku: string;
//   name: string;
//   slug: string;
//   description: string;
//   short_description: string;
//   price: number;
//   compare_at_price: number | null;
//   stock_qty: number;
//   category_name: string;
//   images: string[];
//   is_active: boolean;
//   is_featured: boolean;
//   _raw: Record<string, string>;
// }

// export interface ImportResult {
//   valid: CSVRow[];
//   errors: { row: number; sku: string; errors: string[] }[];
// }

// export function parseProductsCSV(csvText: string): ImportResult {
//   const lines = csvText.trim().split('\n').filter(Boolean);
//   if (lines.length < 2) return { valid: [], errors: [{ row: 0, sku: '', errors: ['Fichier vide ou sans données'] }] };

//   const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
//   const valid: CSVRow[] = [];
//   const errors: ImportResult['errors'] = [];

//   for (let i = 1; i < lines.length; i++) {
//     const line = lines[i];
//     // Parse CSV simple (gère les guillemets basiques)
//     const cells: string[] = [];
//     let cell = '';
//     let inQuotes = false;
//     for (let j = 0; j < line.length; j++) {
//       const char = line[j];
//       if (char === '"') {
//         if (inQuotes && line[j + 1] === '"') { cell += '"'; j++; }
//         else { inQuotes = !inQuotes; }
//       } else if (char === ',' && !inQuotes) {
//         cells.push(cell.trim());
//         cell = '';
//       } else {
//         cell += char;
//       }
//     }
//     cells.push(cell.trim());

//     const raw: Record<string, string> = {};
//     headers.forEach((h, idx) => { raw[h] = cells[idx] || ''; });

//     const rowErrors: string[] = [];
//     const sku = raw.sku?.trim();
//     const name = raw.name?.trim();

//     if (!sku) rowErrors.push('SKU manquant');
//     if (!name) rowErrors.push('Nom manquant');

//     const price = parseFloat(raw.price);
//     if (isNaN(price) || price < 0) rowErrors.push('Prix invalide');

//     const stock = parseInt(raw.stock_qty, 10);
//     if (isNaN(stock) || stock < 0) rowErrors.push('Stock invalide');

//     const compare = raw.compare_at_price?.trim() ? parseFloat(raw.compare_at_price) : null;
//     if (raw.compare_at_price?.trim() && isNaN(compare as number)) rowErrors.push('Ancien prix invalide');

//     if (rowErrors.length > 0) {
//       errors.push({ row: i + 1, sku: sku || '—', errors: rowErrors });
//       continue;
//     }

//     valid.push({
//       sku,
//       name,
//       slug: raw.slug?.trim() || slugify(name),
//       description: raw.description?.trim() || '',
//       short_description: raw.short_description?.trim() || '',
//       price,
//       compare_at_price: compare,
//       stock_qty: isNaN(stock) ? 0 : stock,
//       category_name: raw.category_name?.trim() || '',
//       images: raw.images?.trim() ? raw.images.split('|').map((u) => u.trim()).filter(Boolean) : [],
//       is_active: raw.is_active === '1' || raw.is_active?.toLowerCase() === 'true' || raw.is_active?.toLowerCase() === 'oui',
//       is_featured: raw.is_featured === '1' || raw.is_featured?.toLowerCase() === 'true' || raw.is_featured?.toLowerCase() === 'oui',
//       _raw: raw,
//     });
//   }

//   return { valid, errors };
// }

// /* ============================================================
//    IMPORT CSV — EXECUTION (Upsert par SKU)
//    ============================================================ */

// export async function importProducts(rows: CSVRow[], existingCategories: Category[]) {
//   const results = { created: 0, updated: 0, errors: 0, details: [] as string[] };

//   // Récupérer tous les produits existants par SKU pour savoir ceux à updater
//   const skus = rows.map((r) => r.sku);
//   const { data: existingProducts } = await supabase
//     .from('products')
//     .select('id, sku')
//     .in('sku', skus);

//   const existingBySku = new Map((existingProducts || []).map((p) => [p.sku, p.id]));

//   for (const row of rows) {
//     const category = existingCategories.find(
//       (c) => c.name.toLowerCase() === row.category_name.toLowerCase()
//     );
//     const category_id = category?.id || null;

//     const payload = {
//       sku: row.sku,
//       name: row.name,
//       slug: row.slug,
//       description: row.description,
//       short_description: row.short_description,
//       price: row.price,
//       compare_at_price: row.compare_at_price,
//       stock_qty: row.stock_qty,
//       category_id,
//       images: row.images.map((url) => ({ url, alt: row.name })),
//       is_active: row.is_active,
//       is_featured: row.is_featured,
//     };

//     const existingId = existingBySku.get(row.sku);

//     if (existingId) {
//       const { error } = await supabase.from('products').update(payload).eq('id', existingId);
//       if (error) {
//         results.errors++;
//         results.details.push(`${row.sku} : Échec mise à jour — ${error.message}`);
//       } else {
//         results.updated++;
//       }
//     } else {
//       const { error } = await supabase.from('products').insert(payload);
//       if (error) {
//         results.errors++;
//         results.details.push(`${row.sku} : Échec création — ${error.message}`);
//       } else {
//         results.created++;
//       }
//     }
//   }

//   return results;
// }

// /* ============================================================
//    TEMPLATE CSV TÉLÉCHARGEABLE
//    ============================================================ */

// export function downloadProductsTemplate() {
//   const headers = [
//     'sku', 'name', 'slug', 'description', 'short_description',
//     'price', 'compare_at_price', 'stock_qty', 'category_name',
//     'images', 'is_active', 'is_featured'
//   ];
//   const example = [
//     'SKU-001', 'ProBook Ultra 15', 'probook-ultra-15',
//     'Ordinateur portable haute performance', 'PC pro 15.6"',
//     '899000', '1050000', '12', 'Ordinateurs',
//     'https://ex.com/img1.jpg|https://ex.com/img2.jpg', '1', '1'
//   ];
//   const csv = [headers.join(','), example.join(',')].join('\n');
//   const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
//   const link = document.createElement('a');
//   link.href = URL.createObjectURL(blob);
//   link.download = 'template-produits.csv';
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
//   URL.revokeObjectURL(link.href);
// }