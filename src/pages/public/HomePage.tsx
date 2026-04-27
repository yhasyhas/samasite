import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Shield, Truck, Headphones as HeadphonesIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ProductCard } from '../../components/public/ProductCard';
import { ProductCardSkeleton } from '../../components/ui/Skeleton';
import { getProducts } from '../../services/products';
import { getCategories } from '../../services/categories';
import type { Product, Category } from '../../types';

export function HomePage() {
  const { settings } = useTheme();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [productsRes, catsRes] = await Promise.all([
        getProducts({ featured: true, active: true, limit: 6 }),
        getCategories(true),
      ]);
      setFeaturedProducts(productsRes.data || []);
      setCategories(catsRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const features = [
    { icon: Shield, title: 'Qualité garantie', description: 'Chaque produit répond à des normes de qualité' },
    { icon: Truck, title: 'Livraison rapide', description: 'Livraison à domicile' },
    { icon: HeadphonesIcon, title: 'Support 24/7', description: 'Notre équipe est toujours là pour vous aider' },
    { icon: Star, title: 'Meilleures notes', description: 'Des milliers de clients satisfaits' },
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={
          settings.hero_mode === 'image' && settings.hero_image_url
            ? {
                backgroundImage: `url(${settings.hero_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { backgroundColor: 'var(--color-primary)' }
        }
      >
        {/* Overlay sombre quand image */}
        {settings.hero_mode === 'image' && settings.hero_image_url && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0,0,0,${(settings.hero_overlay_opacity ?? 50) / 100})` }}
          />
        )}
        {/* Décorations subtiles quand couleur */}
        {settings.hero_mode !== 'image' && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)`,
            }}
          />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'var(--color-text-on-primary)' }}
            >
              <Star size={12} fill="currentColor" />
              Produits haut de gamme
            </div>
            <h1
              className="text-4xl md:text-6xl font-bold leading-tight mb-4"
              style={{ color: 'var(--color-text-on-primary)' }}
            >
              {settings.store_name}
            </h1>
            {settings.store_tagline && (
              <p
                className="text-xl md:text-2xl mb-4 opacity-85 font-light"
                style={{ color: 'var(--color-text-on-primary)' }}
              >
                {settings.store_tagline}
              </p>
            )}
            {settings.store_description && (
              <p
                className="text-base opacity-70 mb-8 leading-relaxed"
                style={{ color: 'var(--color-text-on-primary)' }}
              >
                {settings.store_description}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                Parcourir le catalogue
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/quote"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'var(--color-text-on-primary)', border: '1px solid rgba(255,255,255,0.3)' }}
              >
                Demander un devis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section
        className="border-b"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' + '15' }}
                >
                  <f.icon size={18} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{f.title}</p>
                  <p className="text-xs leading-snug" style={{ color: 'var(--color-text-muted)' }}>{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Parcourir par catégorie</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Trouvez exactement ce qu'il vous faut</p>
            </div>
            <Link
              to="/catalog"
              className="flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-primary)' }}
            >
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {categories.slice(0, 5).map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group rounded-2xl p-5 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-all duration-300 group-hover:scale-110"
                  style={{ backgroundColor: 'var(--color-primary)' + '15' }}
                >
                  <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                    {cat.name.charAt(0)}
                  </span>
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{cat.name}</p>
                {cat.description && (
                  <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>{cat.description}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section
        className="py-16"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Produits à la une</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Nos sélections les plus populaires</p>
            </div>
            <Link
              to="/catalog"
              className="flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-primary)' }}
            >
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)
            }
          </div>
          {!loading && featuredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Aucun produit pour le moment</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Revenez bientôt pour découvrir notre catalogue de produits.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-16"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Besoin d'une commande personnalisée ?
          </h2>
          <p className="text-base mb-8 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Remplissez notre formulaire de demande de devis simple avec vos besoins, et nous vous répondrons rapidement avec une offre personnalisée.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/quote"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Demander un devis
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 hover:shadow-md"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-primary)',
                border: '2px solid var(--color-primary)',
              }}
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// import React, { useEffect, useState } from 'react';
// import { Link } from 'react-router-dom';
// import { ArrowRight, Star, Shield, Truck, Headphones as HeadphonesIcon } from 'lucide-react';
// import { useTheme } from '../../contexts/ThemeContext';
// import { ProductCard } from '../../components/public/ProductCard';
// import { ProductCardSkeleton } from '../../components/ui/Skeleton';
// import { getProducts } from '../../services/products';
// import { getCategories } from '../../services/categories';
// import type { Product, Category } from '../../types';

// export function HomePage() {
//   const { settings } = useTheme();
//   const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     async function load() {
//       const [productsRes, catsRes] = await Promise.all([
//         getProducts({ featured: true, active: true, limit: 6 }),
//         getCategories(true),
//       ]);
//       setFeaturedProducts(productsRes.data || []);
//       setCategories(catsRes.data || []);
//       setLoading(false);
//     }
//     load();
//   }, []);

//   const features = [
//     { icon: Shield, title: 'Qualité garantie', description: 'Chaque produit répond à des normes de qualité' },
//     { icon: Truck, title: 'Livraison rapide', description: 'Livraison à domicile' },
//     { icon: HeadphonesIcon, title: 'Support 24/7', description: 'Notre équipe est toujours là pour vous aider' },
//     { icon: Star, title: 'Meilleures notes', description: 'Des milliers de clients satisfaits' },
//   ];

//   return (
//     <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
//       {/* Hero Section */}
//       <section
//         className="relative overflow-hidden"
//         style={{ backgroundColor: 'var(--color-primary)' }}
//       >
//         <div
//           className="absolute inset-0 opacity-10"
//           style={{
//             backgroundImage: `radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)`,
//           }}
//         />
//         <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
//           <div className="max-w-2xl">
//             <div
//               className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 backdrop-blur-sm"
//               style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'var(--color-text-on-primary)' }}
//             >
//               <Star size={12} fill="currentColor" />
//               Produits haut de gamme
//             </div>
//             <h1
//               className="text-4xl md:text-6xl font-bold leading-tight mb-4"
//               style={{ color: 'var(--color-text-on-primary)' }}
//             >
//               {settings.store_name}
//             </h1>
//             {settings.store_tagline && (
//               <p
//                 className="text-xl md:text-2xl mb-4 opacity-85 font-light"
//                 style={{ color: 'var(--color-text-on-primary)' }}
//               >
//                 {settings.store_tagline}
//               </p>
//             )}
//             {settings.store_description && (
//               <p
//                 className="text-base opacity-70 mb-8 leading-relaxed"
//                 style={{ color: 'var(--color-text-on-primary)' }}
//               >
//                 {settings.store_description}
//               </p>
//             )}
//             <div className="flex flex-wrap gap-3">
//               <Link
//                 to="/catalog"
//                 className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
//                 style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
//               >
//                 Parcourir le catalogue
//                 <ArrowRight size={16} />
//               </Link>
//               <Link
//                 to="/quote"
//                 className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
//                 style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'var(--color-text-on-primary)', border: '1px solid rgba(255,255,255,0.3)' }}
//               >
//                 Demander un devis
//               </Link>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Features strip */}
//       <section
//         className="border-b"
//         style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
//       >
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
//             {features.map((f) => (
//               <div key={f.title} className="flex items-center gap-3">
//                 <div
//                   className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
//                   style={{ backgroundColor: 'var(--color-primary)' + '15' }}
//                 >
//                   <f.icon size={18} style={{ color: 'var(--color-primary)' }} />
//                 </div>
//                 <div>
//                   <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{f.title}</p>
//                   <p className="text-xs leading-snug" style={{ color: 'var(--color-text-muted)' }}>{f.description}</p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Categories */}
//       {categories.length > 0 && (
//         <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
//           <div className="flex items-center justify-between mb-8">
//             <div>
//               <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Parcourir par catégorie</h2>
//               <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Trouvez exactement ce qu'il vous faut</p>
//             </div>
//             <Link
//               to="/catalog"
//               className="flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
//               style={{ color: 'var(--color-primary)' }}
//             >
//               Voir tout <ArrowRight size={14} />
//             </Link>
//           </div>
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
//             {categories.slice(0, 5).map((cat) => (
//               <Link
//                 key={cat.id}
//                 to={`/category/${cat.slug}`}
//                 className="group rounded-2xl p-5 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1"
//                 style={{
//                   backgroundColor: 'var(--color-surface)',
//                   border: '1px solid var(--color-border)',
//                 }}
//               >
//                 <div
//                   className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-all duration-300 group-hover:scale-110"
//                   style={{ backgroundColor: 'var(--color-primary)' + '15' }}
//                 >
//                   <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
//                     {cat.name.charAt(0)}
//                   </span>
//                 </div>
//                 <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{cat.name}</p>
//                 {cat.description && (
//                   <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>{cat.description}</p>
//                 )}
//               </Link>
//             ))}
//           </div>
//         </section>
//       )}

//       {/* Featured Products */}
//       <section
//         className="py-16"
//         style={{ backgroundColor: 'var(--color-surface)' }}
//       >
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between mb-8">
//             <div>
//               <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Produits à la une</h2>
//               <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Nos sélections les plus populaires</p>
//             </div>
//             <Link
//               to="/catalog"
//               className="flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
//               style={{ color: 'var(--color-primary)' }}
//             >
//               Voir tout <ArrowRight size={14} />
//             </Link>
//           </div>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//             {loading
//               ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
//               : featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)
//             }
//           </div>
//           {!loading && featuredProducts.length === 0 && (
//             <div className="text-center py-16">
//               <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Aucun produit pour le moment</p>
//               <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Revenez bientôt pour découvrir notre catalogue de produits.</p>
//             </div>
//           )}
//         </div>
//       </section>

//       {/* CTA Section */}
//       <section
//         className="py-16"
//         style={{ backgroundColor: 'var(--color-bg)' }}
//       >
//         <div className="max-w-3xl mx-auto px-4 text-center">
//           <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
//             Besoin d'une commande personnalisée ?
//           </h2>
//           <p className="text-base mb-8 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
//             Remplissez notre formulaire de demande de devis simple avec vos besoins, et nous vous répondrons rapidement avec une offre personnalisée.
//           </p>
//           <div className="flex flex-wrap gap-4 justify-center">
//             <Link
//               to="/quote"
//               className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 text-white"
//               style={{ backgroundColor: 'var(--color-accent)' }}
//             >
//               Demander un devis
//               <ArrowRight size={16} />
//             </Link>
//             <Link
//               to="/contact"
//               className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 hover:shadow-md"
//               style={{
//                 backgroundColor: 'transparent',
//                 color: 'var(--color-primary)',
//                 border: '2px solid var(--color-primary)',
//               }}
//             >
//               Nous contacter
//             </Link>
//           </div>
//         </div>
//       </section>
//     </div>
//   );
// }
