import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, ChevronRight, Package, CheckCircle, AlertTriangle, XCircle, Share2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getProductBySlug } from '../../services/products';
import { useCart } from '../../contexts/CartContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../lib/utils';
import { Skeleton } from '../../components/ui/Skeleton';
import { WhatsAppButton } from '../../components/public/WhatsAppButton';
import type { Product } from '../../types';
import { toast } from 'sonner';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { settings } = useTheme();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getProductBySlug(slug).then(({ data }) => {
      setProduct(data);
      setLoading(false);
    });
  }, [slug]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    toast.success(`${product.name} ajouté au panier de devis`);
  };

  const stockInfo = product
    ? product.stock_qty === 0
      ? { label: 'Rupture de stock', icon: XCircle, color: 'var(--color-error)' }
      : product.stock_qty <= 5
      ? { label: `Stock faible — Plus que ${product.stock_qty} unité${product.stock_qty > 1 ? 's' : ''}`, icon: AlertTriangle, color: 'var(--color-warning)' }
      : { label: 'En stock', icon: CheckCircle, color: 'var(--color-success)' }
    : null;

  // Nettoie le HTML avant affichage
  const safeDescription = product?.description
    ? DOMPurify.sanitize(product.description, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'style'],
      })
    : '';

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center" style={{ color: 'var(--color-text)' }}>
        <Package size={48} className="mx-auto mb-4 opacity-30" />
        <h1 className="text-2xl font-bold mb-2">Produit introuvable</h1>
        <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>Le produit que vous recherchez n'existe pas.</p>
        <Link to="/catalog" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
          Retour au catalogue
        </Link>
      </div>
    );
  }

  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '80vh' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm mb-6">
          <Link to="/" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Accueil</Link>
          <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
          <Link to="/catalog" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Catalogue</Link>
          {product.category && (
            <>
              <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
              <Link
                to={`/category/${product.category.slug}`}
                className="hover:underline"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
          <span style={{ color: 'var(--color-text)' }}>{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div>
            <div
              className="aspect-square rounded-2xl overflow-hidden mb-3"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              {product.images && product.images[selectedImage] ? (
                <img
                  src={product.images[selectedImage].url}
                  alt={product.images[selectedImage].alt || product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={60} className="opacity-20" />
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === idx ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                    style={{ borderColor: selectedImage === idx ? 'var(--color-primary)' : 'var(--color-border)' }}
                  >
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {product.category && (
              <Link
                to={`/category/${product.category.slug}`}
                className="text-sm font-medium uppercase tracking-wide mb-1 hover:underline"
                style={{ color: 'var(--color-secondary)' }}
              >
                {product.category.name}
              </Link>
            )}
            <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
              {product.name}
            </h1>
            <p className="text-xs font-mono mb-4" style={{ color: 'var(--color-text-muted)' }}>SKU: {product.sku}</p>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {formatCurrency(product.price, settings.currency)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg line-through" style={{ color: 'var(--color-text-muted)' }}>
                    {formatCurrency(product.compare_at_price!, settings.currency)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-sm font-bold text-white bg-red-500">
                    -{discountPct}%
                  </span>
                </>
              )}
            </div>

            {/* Stock indicator */}
            {stockInfo && (
              <div className="flex items-center gap-2 mb-5 text-sm font-medium">
                <stockInfo.icon size={16} style={{ color: stockInfo.color }} />
                <span style={{ color: stockInfo.color }}>{stockInfo.label}</span>
              </div>
            )}

            {product.short_description && (
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>
                {product.short_description}
              </p>
            )}

            {/* Quantity + CTA */}
            {product.stock_qty > 0 && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div
                  className="flex items-center rounded-xl overflow-hidden border"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-lg font-medium hover:bg-black/5 transition-colors"
                    style={{ color: 'var(--color-text)' }}
                  >
                    −
                  </button>
                  <span
                    className="w-12 text-center text-sm font-semibold"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock_qty, quantity + 1))}
                    className="w-10 h-10 flex items-center justify-center text-lg font-medium hover:bg-black/5 transition-colors"
                    style={{ color: 'var(--color-text)' }}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-md hover:opacity-90 text-white"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <ShoppingCart size={16} />
                  Ajouter
                </button>
                <WhatsAppButton
                  product={product}
                  label="WhatsApp"
                  className="flex-1 min-w-[140px] py-3 rounded-xl"
                />
              </div>
            )}

            <Link
              to="/quote"
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border hover:shadow-sm mb-5"
              style={{
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)',
                backgroundColor: 'transparent',
              }}
            >
              Demander un devis
            </Link>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Lien copié dans le presse-papiers');
              }}
              className="flex items-center gap-2 text-sm transition-opacity hover:opacity-60 self-start"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Share2 size={14} />
              Partager ce produit
            </button>

            {safeDescription && (
              <div
                className="mt-6 pt-6 border-t"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Description</h3>
                <div
                  className="text-sm leading-relaxed prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// import React, { useEffect, useState } from 'react';
// import { useParams, Link } from 'react-router-dom';
// import { ShoppingCart, ChevronRight, Package, CheckCircle, AlertTriangle, XCircle, Share2 } from 'lucide-react';
// import DOMPurify from 'dompurify';
// import { getProductBySlug } from '../../services/products';
// import { useCart } from '../../contexts/CartContext';
// import { useTheme } from '../../contexts/ThemeContext';
// import { formatCurrency } from '../../lib/utils';
// import { Skeleton } from '../../components/ui/Skeleton';
// import { WhatsAppButton } from '../../components/public/WhatsAppButton';
// import type { Product } from '../../types';
// import { toast } from 'sonner';

// export function ProductDetailPage() {
//   const { slug } = useParams<{ slug: string }>();
//   const [product, setProduct] = useState<Product | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [selectedImage, setSelectedImage] = useState(0);
//   const [quantity, setQuantity] = useState(1);
//   const { addItem } = useCart();
//   const { settings } = useTheme();

//   useEffect(() => {
//     if (!slug) return;
//     setLoading(true);
//     getProductBySlug(slug).then(({ data }) => {
//       setProduct(data);
//       setLoading(false);
//     });
//   }, [slug]);

//   const handleAddToCart = () => {
//     if (!product) return;
//     addItem(product, quantity);
//     toast.success(`${product.name} ajouté au panier de devis`);
//   };

//   const stockInfo = product
//     ? product.stock_qty === 0
//       ? { label: 'Rupture de stock', icon: XCircle, color: 'var(--color-error)' }
//       : product.stock_qty <= 5
//       ? { label: `Stock faible — Plus que ${product.stock_qty} unité${product.stock_qty > 1 ? 's' : ''}`, icon: AlertTriangle, color: 'var(--color-warning)' }
//       : { label: 'En stock', icon: CheckCircle, color: 'var(--color-success)' }
//     : null;

//   // Nettoie le HTML avant affichage
//   const safeDescription = product?.description
//     ? DOMPurify.sanitize(product.description, {
//         ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'span'],
//         ALLOWED_ATTR: ['href', 'target', 'rel', 'style'],
//       })
//     : '';

//   if (loading) {
//     return (
//       <div className="max-w-6xl mx-auto px-4 py-10" style={{ backgroundColor: 'var(--color-bg)' }}>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
//           <Skeleton className="aspect-square w-full rounded-2xl" />
//           <div className="space-y-4">
//             <Skeleton className="h-8 w-3/4" />
//             <Skeleton className="h-4 w-full" />
//             <Skeleton className="h-4 w-2/3" />
//             <Skeleton className="h-10 w-36" />
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (!product) {
//     return (
//       <div className="max-w-2xl mx-auto px-4 py-20 text-center" style={{ color: 'var(--color-text)' }}>
//         <Package size={48} className="mx-auto mb-4 opacity-30" />
//         <h1 className="text-2xl font-bold mb-2">Produit introuvable</h1>
//         <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>Le produit que vous recherchez n'existe pas.</p>
//         <Link to="/catalog" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
//           Retour au catalogue
//         </Link>
//       </div>
//     );
//   }

//   const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
//   const discountPct = hasDiscount
//     ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
//     : 0;

//   return (
//     <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '80vh' }}>
//       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Breadcrumb */}
//         <nav className="flex items-center gap-1.5 text-sm mb-6">
//           <Link to="/" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Accueil</Link>
//           <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
//           <Link to="/catalog" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Catalogue</Link>
//           {product.category && (
//             <>
//               <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
//               <Link
//                 to={`/category/${product.category.slug}`}
//                 className="hover:underline"
//                 style={{ color: 'var(--color-text-muted)' }}
//               >
//                 {product.category.name}
//               </Link>
//             </>
//           )}
//           <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
//           <span style={{ color: 'var(--color-text)' }}>{product.name}</span>
//         </nav>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
//           {/* Image Gallery */}
//           <div>
//             <div
//               className="aspect-square rounded-2xl overflow-hidden mb-3"
//               style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
//             >
//               {product.images && product.images[selectedImage] ? (
//                 <img
//                   src={product.images[selectedImage].url}
//                   alt={product.images[selectedImage].alt || product.name}
//                   className="w-full h-full object-cover"
//                 />
//               ) : (
//                 <div className="w-full h-full flex items-center justify-center">
//                   <Package size={60} className="opacity-20" />
//                 </div>
//               )}
//             </div>
//             {product.images && product.images.length > 1 && (
//               <div className="flex gap-2 overflow-x-auto">
//                 {product.images.map((img, idx) => (
//                   <button
//                     key={idx}
//                     onClick={() => setSelectedImage(idx)}
//                     className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === idx ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
//                     style={{ borderColor: selectedImage === idx ? 'var(--color-primary)' : 'var(--color-border)' }}
//                   >
//                     <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Product Info */}
//           <div className="flex flex-col">
//             {product.category && (
//               <Link
//                 to={`/category/${product.category.slug}`}
//                 className="text-sm font-medium uppercase tracking-wide mb-1 hover:underline"
//                 style={{ color: 'var(--color-secondary)' }}
//               >
//                 {product.category.name}
//               </Link>
//             )}
//             <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
//               {product.name}
//             </h1>
//             <p className="text-xs font-mono mb-4" style={{ color: 'var(--color-text-muted)' }}>SKU: {product.sku}</p>

//             {/* Price */}
//             <div className="flex items-baseline gap-3 mb-4">
//               <span className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
//                 {formatCurrency(product.price, settings.currency)}
//               </span>
//               {hasDiscount && (
//                 <>
//                   <span className="text-lg line-through" style={{ color: 'var(--color-text-muted)' }}>
//                     {formatCurrency(product.compare_at_price!, settings.currency)}
//                   </span>
//                   <span className="px-2 py-0.5 rounded-full text-sm font-bold text-white bg-red-500">
//                     -{discountPct}%
//                   </span>
//                 </>
//               )}
//             </div>

//             {/* Stock indicator */}
//             {stockInfo && (
//               <div className="flex items-center gap-2 mb-5 text-sm font-medium">
//                 <stockInfo.icon size={16} style={{ color: stockInfo.color }} />
//                 <span style={{ color: stockInfo.color }}>{stockInfo.label}</span>
//               </div>
//             )}

//             {product.short_description && (
//               <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>
//                 {product.short_description}
//               </p>
//             )}

//             {/* Quantity + CTA */}
//             {product.stock_qty > 0 && (
//               <div className="flex items-center gap-3 mb-4">
//                 <div
//                   className="flex items-center rounded-xl overflow-hidden border"
//                   style={{ borderColor: 'var(--color-border)' }}
//                 >
//                   <button
//                     onClick={() => setQuantity(Math.max(1, quantity - 1))}
//                     className="w-10 h-10 flex items-center justify-center text-lg font-medium hover:bg-black/5 transition-colors"
//                     style={{ color: 'var(--color-text)' }}
//                   >
//                     −
//                   </button>
//                   <span
//                     className="w-12 text-center text-sm font-semibold"
//                     style={{ color: 'var(--color-text)' }}
//                   >
//                     {quantity}
//                   </span>
//                   <button
//                     onClick={() => setQuantity(Math.min(product.stock_qty, quantity + 1))}
//                     className="w-10 h-10 flex items-center justify-center text-lg font-medium hover:bg-black/5 transition-colors"
//                     style={{ color: 'var(--color-text)' }}
//                   >
//                     +
//                   </button>
//                 </div>
//                 <button
//                   onClick={handleAddToCart}
//                   className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-md hover:opacity-90 text-white"
//                   style={{ backgroundColor: 'var(--color-accent)' }}
//                 >
//                   <ShoppingCart size={16} />
//                   Ajouter au panier de devis
//                 </button>
//                 <WhatsAppButton
//                   product={product}
//                   label="Demander sur WhatsApp"
//                   fullWidth
//                   className="py-3 rounded-xl"
//                 />
//               </div>
//             )}

//             <Link
//               to="/quote"
//               className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border hover:shadow-sm mb-5"
//               style={{
//                 borderColor: 'var(--color-primary)',
//                 color: 'var(--color-primary)',
//                 backgroundColor: 'transparent',
//               }}
//             >
//               Demander un devis
//             </Link>

//             <button
//               onClick={() => {
//                 navigator.clipboard.writeText(window.location.href);
//                 toast.success('Lien copié dans le presse-papiers');
//               }}
//               className="flex items-center gap-2 text-sm transition-opacity hover:opacity-60 self-start"
//               style={{ color: 'var(--color-text-muted)' }}
//             >
//               <Share2 size={14} />
//               Partager ce produit
//             </button>

//             {safeDescription && (
//               <div
//                 className="mt-6 pt-6 border-t"
//                 style={{ borderColor: 'var(--color-border)' }}
//               >
//                 <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Description</h3>
//                 <div
//                   className="text-sm leading-relaxed prose prose-slate max-w-none"
//                   dangerouslySetInnerHTML={{ __html: safeDescription }}
//                 />
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// import React, { useEffect, useState } from 'react';
// import { useParams, Link } from 'react-router-dom';
// import { ShoppingCart, ChevronRight, Package, CheckCircle, AlertTriangle, XCircle, Share2 } from 'lucide-react';
// import DOMPurify from 'dompurify';
// import { getProductBySlug } from '../../services/products';
// import { useCart } from '../../contexts/CartContext';
// import { useTheme } from '../../contexts/ThemeContext';
// import { formatCurrency } from '../../lib/utils';
// import { Skeleton } from '../../components/ui/Skeleton';
// import type { Product } from '../../types';
// import { toast } from 'sonner';

// export function ProductDetailPage() {
//   const { slug } = useParams<{ slug: string }>();
//   const [product, setProduct] = useState<Product | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [selectedImage, setSelectedImage] = useState(0);
//   const [quantity, setQuantity] = useState(1);
//   const { addItem } = useCart();
//   const { settings } = useTheme();

//   useEffect(() => {
//     if (!slug) return;
//     setLoading(true);
//     getProductBySlug(slug).then(({ data }) => {
//       setProduct(data);
//       setLoading(false);
//     });
//   }, [slug]);

//   const handleAddToCart = () => {
//     if (!product) return;
//     addItem(product, quantity);
//     toast.success(`${product.name} ajouté au panier de devis`);
//   };

//   const stockInfo = product
//     ? product.stock_qty === 0
//       ? { label: 'Rupture de stock', icon: XCircle, color: 'var(--color-error)' }
//       : product.stock_qty <= 5
//       ? { label: `Stock faible — Plus que ${product.stock_qty} unité${product.stock_qty > 1 ? 's' : ''}`, icon: AlertTriangle, color: 'var(--color-warning)' }
//       : { label: 'En stock', icon: CheckCircle, color: 'var(--color-success)' }
//     : null;

//   // Nettoie le HTML avant affichage
//   const safeDescription = product?.description
//     ? DOMPurify.sanitize(product.description, {
//         ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'span'],
//         ALLOWED_ATTR: ['href', 'target', 'rel', 'style'],
//       })
//     : '';

//   if (loading) {
//     return (
//       <div className="max-w-6xl mx-auto px-4 py-10" style={{ backgroundColor: 'var(--color-bg)' }}>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
//           <Skeleton className="aspect-square w-full rounded-2xl" />
//           <div className="space-y-4">
//             <Skeleton className="h-8 w-3/4" />
//             <Skeleton className="h-4 w-full" />
//             <Skeleton className="h-4 w-2/3" />
//             <Skeleton className="h-10 w-36" />
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (!product) {
//     return (
//       <div className="max-w-2xl mx-auto px-4 py-20 text-center" style={{ color: 'var(--color-text)' }}>
//         <Package size={48} className="mx-auto mb-4 opacity-30" />
//         <h1 className="text-2xl font-bold mb-2">Produit introuvable</h1>
//         <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>Le produit que vous recherchez n'existe pas.</p>
//         <Link to="/catalog" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
//           Retour au catalogue
//         </Link>
//       </div>
//     );
//   }

//   const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
//   const discountPct = hasDiscount
//     ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
//     : 0;

//   return (
//     <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '80vh' }}>
//       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Breadcrumb */}
//         <nav className="flex items-center gap-1.5 text-sm mb-6">
//           <Link to="/" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Accueil</Link>
//           <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
//           <Link to="/catalog" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Catalogue</Link>
//           {product.category && (
//             <>
//               <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
//               <Link
//                 to={`/category/${product.category.slug}`}
//                 className="hover:underline"
//                 style={{ color: 'var(--color-text-muted)' }}
//               >
//                 {product.category.name}
//               </Link>
//             </>
//           )}
//           <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
//           <span style={{ color: 'var(--color-text)' }}>{product.name}</span>
//         </nav>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
//           {/* Image Gallery */}
//           <div>
//             <div
//               className="aspect-square rounded-2xl overflow-hidden mb-3"
//               style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
//             >
//               {product.images && product.images[selectedImage] ? (
//                 <img
//                   src={product.images[selectedImage].url}
//                   alt={product.images[selectedImage].alt || product.name}
//                   className="w-full h-full object-cover"
//                 />
//               ) : (
//                 <div className="w-full h-full flex items-center justify-center">
//                   <Package size={60} className="opacity-20" />
//                 </div>
//               )}
//             </div>
//             {product.images && product.images.length > 1 && (
//               <div className="flex gap-2 overflow-x-auto">
//                 {product.images.map((img, idx) => (
//                   <button
//                     key={idx}
//                     onClick={() => setSelectedImage(idx)}
//                     className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === idx ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
//                     style={{ borderColor: selectedImage === idx ? 'var(--color-primary)' : 'var(--color-border)' }}
//                   >
//                     <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Product Info */}
//           <div className="flex flex-col">
//             {product.category && (
//               <Link
//                 to={`/category/${product.category.slug}`}
//                 className="text-sm font-medium uppercase tracking-wide mb-1 hover:underline"
//                 style={{ color: 'var(--color-secondary)' }}
//               >
//                 {product.category.name}
//               </Link>
//             )}
//             <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
//               {product.name}
//             </h1>
//             <p className="text-xs font-mono mb-4" style={{ color: 'var(--color-text-muted)' }}>SKU: {product.sku}</p>

//             {/* Price */}
//             <div className="flex items-baseline gap-3 mb-4">
//               <span className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
//                 {formatCurrency(product.price, settings.currency)}
//               </span>
//               {hasDiscount && (
//                 <>
//                   <span className="text-lg line-through" style={{ color: 'var(--color-text-muted)' }}>
//                     {formatCurrency(product.compare_at_price!, settings.currency)}
//                   </span>
//                   <span className="px-2 py-0.5 rounded-full text-sm font-bold text-white bg-red-500">
//                     -{discountPct}%
//                   </span>
//                 </>
//               )}
//             </div>

//             {/* Stock indicator */}
//             {stockInfo && (
//               <div className="flex items-center gap-2 mb-5 text-sm font-medium">
//                 <stockInfo.icon size={16} style={{ color: stockInfo.color }} />
//                 <span style={{ color: stockInfo.color }}>{stockInfo.label}</span>
//               </div>
//             )}

//             {product.short_description && (
//               <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>
//                 {product.short_description}
//               </p>
//             )}

//             {/* Quantity + CTA */}
//             {product.stock_qty > 0 && (
//               <div className="flex items-center gap-3 mb-4">
//                 <div
//                   className="flex items-center rounded-xl overflow-hidden border"
//                   style={{ borderColor: 'var(--color-border)' }}
//                 >
//                   <button
//                     onClick={() => setQuantity(Math.max(1, quantity - 1))}
//                     className="w-10 h-10 flex items-center justify-center text-lg font-medium hover:bg-black/5 transition-colors"
//                     style={{ color: 'var(--color-text)' }}
//                   >
//                     −
//                   </button>
//                   <span
//                     className="w-12 text-center text-sm font-semibold"
//                     style={{ color: 'var(--color-text)' }}
//                   >
//                     {quantity}
//                   </span>
//                   <button
//                     onClick={() => setQuantity(Math.min(product.stock_qty, quantity + 1))}
//                     className="w-10 h-10 flex items-center justify-center text-lg font-medium hover:bg-black/5 transition-colors"
//                     style={{ color: 'var(--color-text)' }}
//                   >
//                     +
//                   </button>
//                 </div>
//                 <button
//                   onClick={handleAddToCart}
//                   className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-md hover:opacity-90 text-white"
//                   style={{ backgroundColor: 'var(--color-accent)' }}
//                 >
//                   <ShoppingCart size={16} />
//                   Ajouter au panier de devis
//                 </button>
//               </div>
//             )}

//             <Link
//               to="/quote"
//               className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border hover:shadow-sm mb-5"
//               style={{
//                 borderColor: 'var(--color-primary)',
//                 color: 'var(--color-primary)',
//                 backgroundColor: 'transparent',
//               }}
//             >
//               Demander un devis
//             </Link>

//             <button
//               onClick={() => {
//                 navigator.clipboard.writeText(window.location.href);
//                 toast.success('Lien copié dans le presse-papiers');
//               }}
//               className="flex items-center gap-2 text-sm transition-opacity hover:opacity-60 self-start"
//               style={{ color: 'var(--color-text-muted)' }}
//             >
//               <Share2 size={14} />
//               Partager ce produit
//             </button>

//             {safeDescription && (
//               <div
//                 className="mt-6 pt-6 border-t"
//                 style={{ borderColor: 'var(--color-border)' }}
//               >
//                 <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Description</h3>
//                 <div
//                   className="text-sm leading-relaxed prose prose-slate max-w-none"
//                   dangerouslySetInnerHTML={{ __html: safeDescription }}
//                 />
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// import React, { useEffect, useState } from 'react';
// import { useParams, Link } from 'react-router-dom';
// import { ShoppingCart, ChevronRight, Package, CheckCircle, AlertTriangle, XCircle, Share2 } from 'lucide-react';
// import { getProductBySlug } from '../../services/products';
// import { useCart } from '../../contexts/CartContext';
// import { useTheme } from '../../contexts/ThemeContext';
// import { formatCurrency } from '../../lib/utils';
// import { Skeleton } from '../../components/ui/Skeleton';
// import type { Product } from '../../types';
// import { toast } from 'sonner';

// export function ProductDetailPage() {
//   const { slug } = useParams<{ slug: string }>();
//   const [product, setProduct] = useState<Product | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [selectedImage, setSelectedImage] = useState(0);
//   const [quantity, setQuantity] = useState(1);
//   const { addItem } = useCart();
//   const { settings } = useTheme();

//   useEffect(() => {
//     if (!slug) return;
//     setLoading(true);
//     getProductBySlug(slug).then(({ data }) => {
//       setProduct(data);
//       setLoading(false);
//     });
//   }, [slug]);

//   const handleAddToCart = () => {
//     if (!product) return;
//     addItem(product, quantity);
//     toast.success(`${product.name} ajouté au panier de devis`);
//   };

//   const stockInfo = product
//     ? product.stock_qty === 0
//       ? { label: 'Rupture de stock', icon: XCircle, color: 'var(--color-error)' }
//       : product.stock_qty <= 5
//       ? { label: `Stock faible — Plus que ${product.stock_qty} unité${product.stock_qty > 1 ? 's' : ''}`, icon: AlertTriangle, color: 'var(--color-warning)' }
//       : { label: 'En stock', icon: CheckCircle, color: 'var(--color-success)' }
//     : null;

//   if (loading) {
//     return (
//       <div className="max-w-6xl mx-auto px-4 py-10" style={{ backgroundColor: 'var(--color-bg)' }}>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
//           <Skeleton className="aspect-square w-full rounded-2xl" />
//           <div className="space-y-4">
//             <Skeleton className="h-8 w-3/4" />
//             <Skeleton className="h-4 w-full" />
//             <Skeleton className="h-4 w-2/3" />
//             <Skeleton className="h-10 w-36" />
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (!product) {
//     return (
//       <div className="max-w-2xl mx-auto px-4 py-20 text-center" style={{ color: 'var(--color-text)' }}>
//         <Package size={48} className="mx-auto mb-4 opacity-30" />
//         <h1 className="text-2xl font-bold mb-2">Produit introuvable</h1>
//         <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>Le produit que vous recherchez n'existe pas.</p>
//         <Link to="/catalog" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
//           Retour au catalogue
//         </Link>
//       </div>
//     );
//   }

//   const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
//   const discountPct = hasDiscount
//     ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
//     : 0;

//   return (
//     <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '80vh' }}>
//       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Breadcrumb */}
//         <nav className="flex items-center gap-1.5 text-sm mb-6">
//           <Link to="/" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Accueil</Link>
//           <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
//           <Link to="/catalog" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Catalogue</Link>
//           {product.category && (
//             <>
//               <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
//               <Link
//                 to={`/category/${product.category.slug}`}
//                 className="hover:underline"
//                 style={{ color: 'var(--color-text-muted)' }}
//               >
//                 {product.category.name}
//               </Link>
//             </>
//           )}
//           <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
//           <span style={{ color: 'var(--color-text)' }}>{product.name}</span>
//         </nav>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
//           {/* Image Gallery */}
//           <div>
//             <div
//               className="aspect-square rounded-2xl overflow-hidden mb-3"
//               style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
//             >
//               {product.images && product.images[selectedImage] ? (
//                 <img
//                   src={product.images[selectedImage].url}
//                   alt={product.images[selectedImage].alt || product.name}
//                   className="w-full h-full object-cover"
//                 />
//               ) : (
//                 <div className="w-full h-full flex items-center justify-center">
//                   <Package size={60} className="opacity-20" />
//                 </div>
//               )}
//             </div>
//             {product.images && product.images.length > 1 && (
//               <div className="flex gap-2 overflow-x-auto">
//                 {product.images.map((img, idx) => (
//                   <button
//                     key={idx}
//                     onClick={() => setSelectedImage(idx)}
//                     className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === idx ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
//                     style={{ borderColor: selectedImage === idx ? 'var(--color-primary)' : 'var(--color-border)' }}
//                   >
//                     <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Product Info */}
//           <div className="flex flex-col">
//             {product.category && (
//               <Link
//                 to={`/category/${product.category.slug}`}
//                 className="text-sm font-medium uppercase tracking-wide mb-1 hover:underline"
//                 style={{ color: 'var(--color-secondary)' }}
//               >
//                 {product.category.name}
//               </Link>
//             )}
//             <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
//               {product.name}
//             </h1>
//             <p className="text-xs font-mono mb-4" style={{ color: 'var(--color-text-muted)' }}>SKU: {product.sku}</p>

//             {/* Price */}
//             <div className="flex items-baseline gap-3 mb-4">
//               <span className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
//                 {formatCurrency(product.price, settings.currency)}
//               </span>
//               {hasDiscount && (
//                 <>
//                   <span className="text-lg line-through" style={{ color: 'var(--color-text-muted)' }}>
//                     {formatCurrency(product.compare_at_price!, settings.currency)}
//                   </span>
//                   <span className="px-2 py-0.5 rounded-full text-sm font-bold text-white bg-red-500">
//                     -{discountPct}%
//                   </span>
//                 </>
//               )}
//             </div>

//             {/* Stock indicator */}
//             {stockInfo && (
//               <div className="flex items-center gap-2 mb-5 text-sm font-medium">
//                 <stockInfo.icon size={16} style={{ color: stockInfo.color }} />
//                 <span style={{ color: stockInfo.color }}>{stockInfo.label}</span>
//               </div>
//             )}

//             {product.short_description && (
//               <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>
//                 {product.short_description}
//               </p>
//             )}

//             {/* Quantity + CTA */}
//             {product.stock_qty > 0 && (
//               <div className="flex items-center gap-3 mb-4">
//                 <div
//                   className="flex items-center rounded-xl overflow-hidden border"
//                   style={{ borderColor: 'var(--color-border)' }}
//                 >
//                   <button
//                     onClick={() => setQuantity(Math.max(1, quantity - 1))}
//                     className="w-10 h-10 flex items-center justify-center text-lg font-medium hover:bg-black/5 transition-colors"
//                     style={{ color: 'var(--color-text)' }}
//                   >
//                     −
//                   </button>
//                   <span
//                     className="w-12 text-center text-sm font-semibold"
//                     style={{ color: 'var(--color-text)' }}
//                   >
//                     {quantity}
//                   </span>
//                   <button
//                     onClick={() => setQuantity(Math.min(product.stock_qty, quantity + 1))}
//                     className="w-10 h-10 flex items-center justify-center text-lg font-medium hover:bg-black/5 transition-colors"
//                     style={{ color: 'var(--color-text)' }}
//                   >
//                     +
//                   </button>
//                 </div>
//                 <button
//                   onClick={handleAddToCart}
//                   className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-md hover:opacity-90 text-white"
//                   style={{ backgroundColor: 'var(--color-accent)' }}
//                 >
//                   <ShoppingCart size={16} />
//                   Ajouter au panier de devis
//                 </button>
//               </div>
//             )}

//             <Link
//               to="/quote"
//               className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border hover:shadow-sm mb-5"
//               style={{
//                 borderColor: 'var(--color-primary)',
//                 color: 'var(--color-primary)',
//                 backgroundColor: 'transparent',
//               }}
//             >
//               Demander un devis
//             </Link>

//             <button
//               onClick={() => {
//                 navigator.clipboard.writeText(window.location.href);
//                 toast.success('Lien copié dans le presse-papiers');
//               }}
//               className="flex items-center gap-2 text-sm transition-opacity hover:opacity-60 self-start"
//               style={{ color: 'var(--color-text-muted)' }}
//             >
//               <Share2 size={14} />
//               Partager ce produit
//             </button>

//             {product.description && (
//               <div
//                 className="mt-6 pt-6 border-t"
//                 style={{ borderColor: 'var(--color-border)' }}
//               >
//                 <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Description</h3>
//                 <div
//                   className="text-sm leading-relaxed prose prose-slate max-w-none"
//                   dangerouslySetInnerHTML={{ __html: product.description }}
//                 />
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// import React, { useEffect, useState } from 'react';
// import { useParams, Link } from 'react-router-dom';
// import { ShoppingCart, ChevronRight, Package, CheckCircle, AlertTriangle, XCircle, Share2 } from 'lucide-react';
// import { getProductBySlug } from '../../services/products';
// import { useCart } from '../../contexts/CartContext';
// import { useTheme } from '../../contexts/ThemeContext';
// import { formatCurrency } from '../../lib/utils';
// import { Skeleton } from '../../components/ui/Skeleton';
// import type { Product } from '../../types';
// import { toast } from 'sonner';

// export function ProductDetailPage() {
//   const { slug } = useParams<{ slug: string }>();
//   const [product, setProduct] = useState<Product | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [selectedImage, setSelectedImage] = useState(0);
//   const [quantity, setQuantity] = useState(1);
//   const { addItem } = useCart();
//   const { settings } = useTheme();

//   useEffect(() => {
//     if (!slug) return;
//     setLoading(true);
//     getProductBySlug(slug).then(({ data }) => {
//       setProduct(data);
//       setLoading(false);
//     });
//   }, [slug]);

//   const handleAddToCart = () => {
//     if (!product) return;
//     addItem(product, quantity);
//     toast.success(`${product.name} added to quote cart`);
//   };

//   const stockInfo = product
//     ? product.stock_qty === 0
//       ? { label: 'Out of Stock', icon: XCircle, color: 'var(--color-error)' }
//       : product.stock_qty <= 5
//       ? { label: `Low Stock — Only ${product.stock_qty} left`, icon: AlertTriangle, color: 'var(--color-warning)' }
//       : { label: 'In Stock', icon: CheckCircle, color: 'var(--color-success)' }
//     : null;

//   if (loading) {
//     return (
//       <div className="max-w-6xl mx-auto px-4 py-10" style={{ backgroundColor: 'var(--color-bg)' }}>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
//           <Skeleton className="aspect-square w-full rounded-2xl" />
//           <div className="space-y-4">
//             <Skeleton className="h-8 w-3/4" />
//             <Skeleton className="h-4 w-full" />
//             <Skeleton className="h-4 w-2/3" />
//             <Skeleton className="h-10 w-36" />
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (!product) {
//     return (
//       <div className="max-w-2xl mx-auto px-4 py-20 text-center" style={{ color: 'var(--color-text)' }}>
//         <Package size={48} className="mx-auto mb-4 opacity-30" />
//         <h1 className="text-2xl font-bold mb-2">Produit introuvable</h1>
//         <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>Le produit que vous recherchez n'existe pas.</p>
//         <Link to="/catalog" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
//           Retour au catalogue
//         </Link>
//       </div>
//     );
//   }

//   const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
//   const discountPct = hasDiscount
//     ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
//     : 0;

//   return (
//     <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '80vh' }}>
//       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Breadcrumb */}
//         <nav className="flex items-center gap-1.5 text-sm mb-6">
//           <Link to="/" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Home</Link>
//           <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
//           <Link to="/catalog" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Catalog</Link>
//           {product.category && (
//             <>
//               <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
//               <Link
//                 to={`/category/${product.category.slug}`}
//                 className="hover:underline"
//                 style={{ color: 'var(--color-text-muted)' }}
//               >
//                 {product.category.name}
//               </Link>
//             </>
//           )}
//           <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
//           <span style={{ color: 'var(--color-text)' }}>{product.name}</span>
//         </nav>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
//           {/* Image Gallery */}
//           <div>
//             <div
//               className="aspect-square rounded-2xl overflow-hidden mb-3"
//               style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
//             >
//               {product.images && product.images[selectedImage] ? (
//                 <img
//                   src={product.images[selectedImage].url}
//                   alt={product.images[selectedImage].alt || product.name}
//                   className="w-full h-full object-cover"
//                 />
//               ) : (
//                 <div className="w-full h-full flex items-center justify-center">
//                   <Package size={60} className="opacity-20" />
//                 </div>
//               )}
//             </div>
//             {product.images && product.images.length > 1 && (
//               <div className="flex gap-2 overflow-x-auto">
//                 {product.images.map((img, idx) => (
//                   <button
//                     key={idx}
//                     onClick={() => setSelectedImage(idx)}
//                     className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === idx ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
//                     style={{ borderColor: selectedImage === idx ? 'var(--color-primary)' : 'var(--color-border)' }}
//                   >
//                     <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Product Info */}
//           <div className="flex flex-col">
//             {product.category && (
//               <Link
//                 to={`/category/${product.category.slug}`}
//                 className="text-sm font-medium uppercase tracking-wide mb-1 hover:underline"
//                 style={{ color: 'var(--color-secondary)' }}
//               >
//                 {product.category.name}
//               </Link>
//             )}
//             <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
//               {product.name}
//             </h1>
//             <p className="text-xs font-mono mb-4" style={{ color: 'var(--color-text-muted)' }}>SKU: {product.sku}</p>

//             {/* Price */}
//             <div className="flex items-baseline gap-3 mb-4">
//               <span className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
//                 {formatCurrency(product.price, settings.currency)}
//               </span>
//               {hasDiscount && (
//                 <>
//                   <span className="text-lg line-through" style={{ color: 'var(--color-text-muted)' }}>
//                     {formatCurrency(product.compare_at_price!, settings.currency)}
//                   </span>
//                   <span className="px-2 py-0.5 rounded-full text-sm font-bold text-white bg-red-500">
//                     -{discountPct}%
//                   </span>
//                 </>
//               )}
//             </div>

//             {/* Stock indicator */}
//             {stockInfo && (
//               <div className="flex items-center gap-2 mb-5 text-sm font-medium">
//                 <stockInfo.icon size={16} style={{ color: stockInfo.color }} />
//                 <span style={{ color: stockInfo.color }}>{stockInfo.label}</span>
//               </div>
//             )}

//             {product.short_description && (
//               <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>
//                 {product.short_description}
//               </p>
//             )}

//             {/* Quantity + CTA */}
//             {product.stock_qty > 0 && (
//               <div className="flex items-center gap-3 mb-4">
//                 <div
//                   className="flex items-center rounded-xl overflow-hidden border"
//                   style={{ borderColor: 'var(--color-border)' }}
//                 >
//                   <button
//                     onClick={() => setQuantity(Math.max(1, quantity - 1))}
//                     className="w-10 h-10 flex items-center justify-center text-lg font-medium hover:bg-black/5 transition-colors"
//                     style={{ color: 'var(--color-text)' }}
//                   >
//                     −
//                   </button>
//                   <span
//                     className="w-12 text-center text-sm font-semibold"
//                     style={{ color: 'var(--color-text)' }}
//                   >
//                     {quantity}
//                   </span>
//                   <button
//                     onClick={() => setQuantity(Math.min(product.stock_qty, quantity + 1))}
//                     className="w-10 h-10 flex items-center justify-center text-lg font-medium hover:bg-black/5 transition-colors"
//                     style={{ color: 'var(--color-text)' }}
//                   >
//                     +
//                   </button>
//                 </div>
//                 <button
//                   onClick={handleAddToCart}
//                   className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-md hover:opacity-90 text-white"
//                   style={{ backgroundColor: 'var(--color-accent)' }}
//                 >
//                   <ShoppingCart size={16} />
//                   Ajouter au panier de devis
//                 </button>
//               </div>
//             )}

//             <Link
//               to="/quote"
//               className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border hover:shadow-sm mb-5"
//               style={{
//                 borderColor: 'var(--color-primary)',
//                 color: 'var(--color-primary)',
//                 backgroundColor: 'transparent',
//               }}
//             >
//               Demander un devis
//             </Link>

//             <button
//               onClick={() => {
//                 navigator.clipboard.writeText(window.location.href);
//                 toast.success('Link copied to clipboard');
//               }}
//               className="flex items-center gap-2 text-sm transition-opacity hover:opacity-60 self-start"
//               style={{ color: 'var(--color-text-muted)' }}
//             >
//               <Share2 size={14} />
//               Partager ce produit
//             </button>

//             {product.description && (
//               <div
//                 className="mt-6 pt-6 border-t"
//                 style={{ borderColor: 'var(--color-border)' }}
//               >
//                 <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Description</h3>
//                 <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-muted)' }}>
//                   {product.description}
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
