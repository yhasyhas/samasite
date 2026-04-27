import React from 'react';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export function ContactPage() {
  const { settings } = useTheme();

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '80vh' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Nous contacter</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            Nous serions ravis d'avoir de vos nouvelles. Contactez notre équipe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact info */}
          <div className="space-y-4">
            {settings.contact_phone && (
              <div
                className="flex items-start gap-4 p-5 rounded-2xl"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' + '15' }}
                >
                  <Phone size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--color-text)' }}>Téléphone</p>
                  <a
                    href={`tel:${settings.contact_phone}`}
                    className="text-sm hover:underline"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {settings.contact_phone}
                  </a>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Appelez-nous pour une assistance immédiate</p>
                </div>
              </div>
            )}

            {settings.contact_email && (
              <div
                className="flex items-start gap-4 p-5 rounded-2xl"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' + '15' }}
                >
                  <Mail size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--color-text)' }}>Email</p>
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="text-sm hover:underline"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {settings.contact_email}
                  </a>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Nous répondons sous 24 heures</p>
                </div>
              </div>
            )}

            {settings.contact_address && (
              <div
                className="flex items-start gap-4 p-5 rounded-2xl"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' + '15' }}
                >
                  <MapPin size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--color-text)' }}>Adresse</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{settings.contact_address}</p>
                </div>
              </div>
            )}

            <div
              className="flex items-start gap-4 p-5 rounded-2xl"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--color-primary)' + '15' }}
              >
                <Clock size={20} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--color-text)' }}>Horaires de la boutique</p>
                <div className="text-sm space-y-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  <p>Lundi – vendredi : 8h00 – 18h00</p>
                  <p>Samedi : 9h00 – 16h00</p>
                  <p>Dimanche : Fermé</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info card */}
          <div
            className="rounded-2xl p-6 flex flex-col justify-center"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--color-text-on-primary)' }}>
              Comment commander ?
            </h2>
            <div className="space-y-4">
              {[
                { step: '1', title: 'Parcourez notre catalogue', desc: 'Explorez notre large gamme de produits' },
                { step: '2', title: 'Ajoutez au panier de devis', desc: 'Sélectionnez les articles souhaités' },
                { step: '3', title: 'Soumettez une demande de devis', desc: 'Remplissez vos coordonnées' },
                { step: '4', title: 'Nous vous contactons', desc: 'Notre équipe vous recontactera avec un prix et les infos de livraison' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'var(--color-text-on-primary)' }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-on-primary)' }}>{item.title}</p>
                    <p className="text-xs opacity-70" style={{ color: 'var(--color-text-on-primary)' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// import React from 'react';
// import { Phone, Mail, MapPin, Clock } from 'lucide-react';
// import { useTheme } from '../../contexts/ThemeContext';

// export function ContactPage() {
//   const { settings } = useTheme();

//   return (
//     <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '80vh' }}>
//       <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Nous contacter</h1>
//           <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
//             Nous serions ravis d'avoir de vos nouvelles. Contactez notre équipe.
//           </p>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//           {/* Contact info */}
//           <div className="space-y-4">
//             {settings.contact_phone && (
//               <div
//                 className="flex items-start gap-4 p-5 rounded-2xl"
//                 style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
//               >
//                 <div
//                   className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
//                   style={{ backgroundColor: 'var(--color-primary)' + '15' }}
//                 >
//                   <Phone size={20} style={{ color: 'var(--color-primary)' }} />
//                 </div>
//                 <div>
//                   <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--color-text)' }}>Téléphone</p>
//                   <a
//                     href={`tel:${settings.contact_phone}`}
//                     className="text-sm hover:underline"
//                     style={{ color: 'var(--color-primary)' }}
//                   >
//                     {settings.contact_phone}
//                   </a>
//                   <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Appelez-nous pour une assistance immédiate</p>
//                 </div>
//               </div>
//             )}

//             {settings.contact_email && (
//               <div
//                 className="flex items-start gap-4 p-5 rounded-2xl"
//                 style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
//               >
//                 <div
//                   className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
//                   style={{ backgroundColor: 'var(--color-primary)' + '15' }}
//                 >
//                   <Mail size={20} style={{ color: 'var(--color-primary)' }} />
//                 </div>
//                 <div>
//                   <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--color-text)' }}>Email</p>
//                   <a
//                     href={`mailto:${settings.contact_email}`}
//                     className="text-sm hover:underline"
//                     style={{ color: 'var(--color-primary)' }}
//                   >
//                     {settings.contact_email}
//                   </a>
//                   <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Nous répondons sous 24 heures</p>
//                 </div>
//               </div>
//             )}

//             {settings.contact_address && (
//               <div
//                 className="flex items-start gap-4 p-5 rounded-2xl"
//                 style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
//               >
//                 <div
//                   className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
//                   style={{ backgroundColor: 'var(--color-primary)' + '15' }}
//                 >
//                   <MapPin size={20} style={{ color: 'var(--color-primary)' }} />
//                 </div>
//                 <div>
//                   <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--color-text)' }}>Adresse</p>
//                   <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{settings.contact_address}</p>
//                 </div>
//               </div>
//             )}

//             <div
//               className="flex items-start gap-4 p-5 rounded-2xl"
//               style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
//             >
//               <div
//                 className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
//                 style={{ backgroundColor: 'var(--color-primary)' + '15' }}
//               >
//                 <Clock size={20} style={{ color: 'var(--color-primary)' }} />
//               </div>
//               <div>
//                 <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--color-text)' }}>Horaires de la boutique</p>
//                 <div className="text-sm space-y-0.5" style={{ color: 'var(--color-text-muted)' }}>
//                   <p>Lundi – vendredi : 8h00 – 18h00</p>
//                   <p>Samedi : 9h00 – 16h00</p>
//                   <p>Dimanche : Fermé</p>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Info card */}
//           <div
//             className="rounded-2xl p-6 flex flex-col justify-center"
//             style={{ backgroundColor: 'var(--color-primary)' }}
//           >
//             <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--color-text-on-primary)' }}>
//               Comment commander?
//             </h2>
//             <div className="space-y-4">
//               {[
//                 { step: '1', title: 'Browse our catalog', desc: 'Explore our wide range of products' },
//                 { step: '2', title: 'Add to quote cart', desc: 'Select the items you want' },
//                 { step: '3', title: 'Submit a quote request', desc: 'Fill in your contact details' },
//                 { step: '4', title: 'We contact you', desc: 'Our team will follow up with pricing and delivery info' },
//               ].map((item) => (
//                 <div key={item.step} className="flex items-start gap-3">
//                   <div
//                     className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
//                     style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'var(--color-text-on-primary)' }}
//                   >
//                     {item.step}
//                   </div>
//                   <div>
//                     <p className="text-sm font-semibold" style={{ color: 'var(--color-text-on-primary)' }}>{item.title}</p>
//                     <p className="text-xs opacity-70" style={{ color: 'var(--color-text-on-primary)' }}>{item.desc}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
