import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, ShieldCheck, Mail, ArrowLeft, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../services/activityLogs';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [recoveryUrl, setRecoveryUrl] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      console.error('Erreur Supabase signIn:', signInError);

      if (signInError.message?.toLowerCase().includes('email not confirmed')) {
        setError('Email non confirmé. Contactez votre administrateur.');
      } else if (signInError.message?.toLowerCase().includes('invalid login credentials')) {
        setError('Email ou mot de passe incorrect.');
      } else {
        setError('E-mail ou mot de passe invalide');
      }
      setLoading(false);
      return;
    }

    await logActivity({ action: 'login', entity_type: 'user' });
    navigate('/admin');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ✅ Utilise la méthode native Supabase (plus fiable)
      // Le redirectTo DOIT être dans la liste des URLs autorisées dans Supabase Auth
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/admin/reset-password`,
        }
      );

      if (resetError) {
        console.error('Erreur resetPasswordForEmail:', resetError);
        setError(resetError.message || 'Erreur lors de l\'envoi de l\'email');
        setLoading(false);
        return;
      }

      setResetSent(true);
      toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
    } catch (err) {
      console.error('Erreur reset password:', err);
      setError('Erreur réseau. Vérifiez votre connexion.');
    }

    setLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(recoveryUrl);
    toast.success('Lien copié dans le presse-papiers');
  };

  if (forgotMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-slate-300" />
            </div>
            <h1 className="text-xl font-bold text-white">Mot de passe oublié</h1>
            <p className="text-sm text-slate-400 mt-1">
              Entrez votre email pour recevoir un lien de réinitialisation.
            </p>
          </div>

          {resetSent ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="text-center">
                <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-300 mb-2">
                  Un email a été envoyé à <strong>{email}</strong>.
                </p>
                <p className="text-xs text-slate-500">
                  Cliquez sur le lien dans l'email pour définir un nouveau mot de passe.
                  Si vous ne voyez pas l'email, vérifiez vos spams.
                </p>
              </div>

              <button
                onClick={() => { setForgotMode(false); setResetSent(false); setEmail(''); }}
                className="w-full text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1"
              >
                <ArrowLeft size={14} /> Retour à la connexion
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleForgotPassword}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
            >
              {error && (
                <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
              </button>

              <button
                type="button"
                onClick={() => { setForgotMode(false); setError(''); }}
                className="w-full text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1"
              >
                <ArrowLeft size={14} /> Retour à la connexion
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={24} className="text-slate-300" />
          </div>
          <h1 className="text-xl font-bold text-white">Connexion admin</h1>
          <p className="text-sm text-slate-400 mt-1">Connectez-vous au tableau de bord</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Mot de Passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Connexion en cours...</span>
            ) : (
              <>
                <LogIn size={15} />
                Connexion
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setForgotMode(true); setError(''); }}
            className="w-full text-sm text-slate-400 hover:text-white transition-colors"
          >
            Mot de passe oublié ?
          </button>
        </form>
      </div>
    </div>
  );
}

// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { LogIn, Eye, EyeOff, ShieldCheck, Mail, ArrowLeft, ExternalLink, Copy, CheckCircle } from 'lucide-react';
// import { useAuth } from '../../contexts/AuthContext';
// import { logActivity } from '../../services/activityLogs';
// import { supabase } from '../../lib/supabase';
// import { toast } from 'sonner';

// export function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [forgotMode, setForgotMode] = useState(false);
//   const [resetSent, setResetSent] = useState(false);
//   const [recoveryUrl, setRecoveryUrl] = useState('');
//   const { signIn } = useAuth();
//   const navigate = useNavigate();

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);

//     const { error: signInError } = await signIn(email, password);
//     if (signInError) {
//       console.error('Erreur Supabase signIn:', signInError);

//       if (signInError.message?.toLowerCase().includes('email not confirmed')) {
//         setError('Email non confirmé. Contactez votre administrateur.');
//       } else if (signInError.message?.toLowerCase().includes('invalid login credentials')) {
//         setError('Email ou mot de passe incorrect.');
//       } else {
//         setError('E-mail ou mot de passe invalide');
//       }
//       setLoading(false);
//       return;
//     }

//     await logActivity({ action: 'login', entity_type: 'user' });
//     navigate('/admin');
//   };

//   const handleForgotPassword = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!email.trim()) {
//       setError('Veuillez entrer votre email');
//       return;
//     }

//     setLoading(true);
//     setError('');

//     // ✅ Appel Edge Function au lieu de resetPasswordForEmail()
//     const redirectUrl = typeof window !== 'undefined' ? window.location.origin : '';
//     const { data, error: fnError } = await supabase.functions.invoke('reset-password', {
//       body: { email: email.trim(), redirect_url: redirectUrl },
//     });

//     if (fnError) {
//       setError(fnError.message || 'Erreur lors de la génération du lien');
//       setLoading(false);
//       return;
//     }

//     if (data?.error) {
//       setError(data.error);
//       setLoading(false);
//       return;
//     }

//     // ✅ Ouvrir automatiquement le lien dans un nouvel onglet
//     if (data?.recovery_url) {
//       setRecoveryUrl(data.recovery_url);
//       setResetSent(true);
//       toast.success('Lien de réinitialisation généré !');

//       // Ouvrir automatiquement après 1 seconde
//       setTimeout(() => {
//         window.open(data.recovery_url, '_blank');
//       }, 1000);
//     } else {
//       setError('Impossible de générer le lien. Réessayez.');
//     }

//     setLoading(false);
//   };

//   const copyLink = () => {
//     navigator.clipboard.writeText(recoveryUrl);
//     toast.success('Lien copié dans le presse-papiers');
//   };

//   if (forgotMode) {
//     return (
//       <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
//         <div className="w-full max-w-sm">
//           <div className="text-center mb-8">
//             <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
//               <Mail size={24} className="text-slate-300" />
//             </div>
//             <h1 className="text-xl font-bold text-white">Mot de passe oublié</h1>
//             <p className="text-sm text-slate-400 mt-1">
//               Entrez votre email pour recevoir un lien de réinitialisation.
//             </p>
//           </div>

//           {resetSent ? (
//             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
//               <div className="text-center">
//                 <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
//                 <p className="text-sm text-slate-300 mb-2">
//                   Un lien de réinitialisation a été généré pour <strong>{email}</strong>.
//                 </p>
//                 <p className="text-xs text-slate-500">
//                   Le lien s'est ouvert dans un nouvel onglet. Si ce n'est pas le cas, cliquez ci-dessous :
//                 </p>
//               </div>

//               {recoveryUrl && (
//                 <div className="bg-slate-800 rounded-xl p-3 break-all text-xs text-slate-300 font-mono border border-slate-700">
//                   {recoveryUrl}
//                 </div>
//               )}

//               <div className="flex gap-2">
//                 <button
//                   onClick={() => window.open(recoveryUrl, '_blank')}
//                   className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white text-slate-900 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors"
//                 >
//                   <ExternalLink size={14} />
//                   Ouvrir le lien
//                 </button>
//                 <button
//                   onClick={copyLink}
//                   className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-slate-700 rounded-xl text-sm text-slate-300 hover:bg-slate-800 transition-colors"
//                 >
//                   <Copy size={14} />
//                 </button>
//               </div>

//               <button
//                 onClick={() => { setForgotMode(false); setResetSent(false); setEmail(''); setRecoveryUrl(''); }}
//                 className="w-full text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1"
//               >
//                 <ArrowLeft size={14} /> Retour à la connexion
//               </button>
//             </div>
//           ) : (
//             <form
//               onSubmit={handleForgotPassword}
//               className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
//             >
//               {error && (
//                 <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl">
//                   {error}
//                 </div>
//               )}

//               <div>
//                 <label className="text-sm font-medium text-slate-300 block mb-1.5">Email</label>
//                 <input
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   placeholder="admin@example.com"
//                   required
//                   className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
//                 />
//               </div>

//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
//               >
//                 {loading ? 'Génération en cours...' : 'Générer le lien de réinitialisation'}
//               </button>

//               <button
//                 type="button"
//                 onClick={() => { setForgotMode(false); setError(''); }}
//                 className="w-full text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1"
//               >
//                 <ArrowLeft size={14} /> Retour à la connexion
//               </button>
//             </form>
//           )}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
//       <div className="w-full max-w-sm">
//         <div className="text-center mb-8">
//           <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
//             <ShieldCheck size={24} className="text-slate-300" />
//           </div>
//           <h1 className="text-xl font-bold text-white">Connexion admin</h1>
//           <p className="text-sm text-slate-400 mt-1">Connectez-vous au tableau de bord</p>
//         </div>

//         <form
//           onSubmit={handleSubmit}
//           className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
//         >
//           {error && (
//             <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl">
//               {error}
//             </div>
//           )}

//           <div>
//             <label className="text-sm font-medium text-slate-300 block mb-1.5">Email</label>
//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="admin@example.com"
//               required
//               className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
//             />
//           </div>

//           <div>
//             <label className="text-sm font-medium text-slate-300 block mb-1.5">Mot de Passe</label>
//             <div className="relative">
//               <input
//                 type={showPassword ? 'text' : 'password'}
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 placeholder="••••••••"
//                 required
//                 className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowPassword(!showPassword)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
//               >
//                 {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
//               </button>
//             </div>
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
//           >
//             {loading ? (
//               <span className="animate-pulse">Connexion en cours...</span>
//             ) : (
//               <>
//                 <LogIn size={15} />
//                 Connexion
//               </>
//             )}
//           </button>

//           <button
//             type="button"
//             onClick={() => { setForgotMode(true); setError(''); }}
//             className="w-full text-sm text-slate-400 hover:text-white transition-colors"
//           >
//             Mot de passe oublié ?
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }

// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { LogIn, Eye, EyeOff, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
// import { useAuth } from '../../contexts/AuthContext';
// import { logActivity } from '../../services/activityLogs';
// import { supabase } from '../../lib/supabase';
// import { toast } from 'sonner';

// export function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [forgotMode, setForgotMode] = useState(false);
//   const [resetSent, setResetSent] = useState(false);
//   const { signIn } = useAuth();
//   const navigate = useNavigate();

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);

//     const { error: signInError } = await signIn(email, password);
//     if (signInError) {
//       console.error('Erreur Supabase signIn:', signInError);

//       if (signInError.message?.toLowerCase().includes('email not confirmed')) {
//         setError('Email non confirmé. Contactez votre administrateur.');
//       } else if (signInError.message?.toLowerCase().includes('invalid login credentials')) {
//         setError('Email ou mot de passe incorrect.');
//       } else {
//         setError('E-mail ou mot de passe invalide');
//       }
//       setLoading(false);
//       return;
//     }

//     await logActivity({ action: 'login', entity_type: 'user' });
//     navigate('/admin');
//   };

//   const handleForgotPassword = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!email.trim()) {
//       setError('Veuillez entrer votre email');
//       return;
//     }

//     setLoading(true);
//     const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
//       redirectTo: `${window.location.origin}/admin/reset-password`,
//     });

//     if (error) {
//       setError(error.message);
//       setLoading(false);
//       return;
//     }

//     setResetSent(true);
//     setLoading(false);
//     toast.success('Email de réinitialisation envoyé !');
//   };

//   if (forgotMode) {
//     return (
//       <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
//         <div className="w-full max-w-sm">
//           <div className="text-center mb-8">
//             <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
//               <Mail size={24} className="text-slate-300" />
//             </div>
//             <h1 className="text-xl font-bold text-white">Mot de passe oublié</h1>
//             <p className="text-sm text-slate-400 mt-1">
//               Entrez votre email pour recevoir un lien de réinitialisation.
//             </p>
//           </div>

//           {resetSent ? (
//             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
//               <p className="text-sm text-slate-300 mb-4">
//                 Un email a été envoyé à <strong>{email}</strong>. Cliquez sur le lien pour définir un nouveau mot de passe.
//               </p>
//               <button
//                 onClick={() => { setForgotMode(false); setResetSent(false); setEmail(''); }}
//                 className="text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto"
//               >
//                 <ArrowLeft size={14} /> Retour à la connexion
//               </button>
//             </div>
//           ) : (
//             <form
//               onSubmit={handleForgotPassword}
//               className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
//             >
//               {error && (
//                 <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl">
//                   {error}
//                 </div>
//               )}

//               <div>
//                 <label className="text-sm font-medium text-slate-300 block mb-1.5">Email</label>
//                 <input
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   placeholder="admin@example.com"
//                   required
//                   className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
//                 />
//               </div>

//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
//               >
//                 {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
//               </button>

//               <button
//                 type="button"
//                 onClick={() => { setForgotMode(false); setError(''); }}
//                 className="w-full text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1"
//               >
//                 <ArrowLeft size={14} /> Retour à la connexion
//               </button>
//             </form>
//           )}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
//       <div className="w-full max-w-sm">
//         <div className="text-center mb-8">
//           <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
//             <ShieldCheck size={24} className="text-slate-300" />
//           </div>
//           <h1 className="text-xl font-bold text-white">Connexion admin</h1>
//           <p className="text-sm text-slate-400 mt-1">Connectez-vous au tableau de bord</p>
//         </div>

//         <form
//           onSubmit={handleSubmit}
//           className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
//         >
//           {error && (
//             <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl">
//               {error}
//             </div>
//           )}

//           <div>
//             <label className="text-sm font-medium text-slate-300 block mb-1.5">Email</label>
//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="admin@example.com"
//               required
//               className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
//             />
//           </div>

//           <div>
//             <label className="text-sm font-medium text-slate-300 block mb-1.5">Mot de Passe</label>
//             <div className="relative">
//               <input
//                 type={showPassword ? 'text' : 'password'}
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 placeholder="••••••••"
//                 required
//                 className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowPassword(!showPassword)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
//               >
//                 {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
//               </button>
//             </div>
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
//           >
//             {loading ? (
//               <span className="animate-pulse">Connexion en cours...</span>
//             ) : (
//               <>
//                 <LogIn size={15} />
//                 Connexion
//               </>
//             )}
//           </button>

//           <button
//             type="button"
//             onClick={() => { setForgotMode(true); setError(''); }}
//             className="w-full text-sm text-slate-400 hover:text-white transition-colors"
//           >
//             Mot de passe oublié ?
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }

// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { LogIn, Eye, EyeOff, ShieldCheck } from 'lucide-react';
// import { useAuth } from '../../contexts/AuthContext';
// import { logActivity } from '../../services/activityLogs';

// export function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const { signIn } = useAuth();
//   const navigate = useNavigate();

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);

//     const { error: signInError } = await signIn(email, password);
//     if (signInError) {
//       // ✅ LOG DE L'ERREUR EXACTE DANS LA CONSOLE POUR DIAGNOSTIC
//       console.error('Erreur Supabase signIn:', signInError);
//       console.error('Code:', signInError.status);
//       console.error('Message:', signInError.message);

//       // Messages plus précis selon l'erreur
//       if (signInError.message?.toLowerCase().includes('email not confirmed')) {
//         setError('Email non confirmé. Contactez votre administrateur.');
//       } else if (signInError.message?.toLowerCase().includes('invalid login credentials')) {
//         setError('Email ou mot de passe incorrect.');
//       } else if (signInError.message?.toLowerCase().includes('user not found')) {
//         setError('Utilisateur introuvable.');
//       } else {
//         setError('E-mail ou mot de passe invalide');
//       }
//       setLoading(false);
//       return;
//     }

//     await logActivity({ action: 'login', entity_type: 'user' });
//     navigate('/admin');
//   };

//   return (
//     <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
//       <div className="w-full max-w-sm">
//         <div className="text-center mb-8">
//           <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
//             <ShieldCheck size={24} className="text-slate-300" />
//           </div>
//           <h1 className="text-xl font-bold text-white">Connexion admin</h1>
//           <p className="text-sm text-slate-400 mt-1">Connectez-vous au tableau de bord</p>
//         </div>

//         <form
//           onSubmit={handleSubmit}
//           className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
//         >
//           {error && (
//             <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl">
//               {error}
//             </div>
//           )}

//           <div>
//             <label className="text-sm font-medium text-slate-300 block mb-1.5">Email</label>
//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="admin@example.com"
//               required
//               className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
//             />
//           </div>

//           <div>
//             <label className="text-sm font-medium text-slate-300 block mb-1.5">Mot de Passe</label>
//             <div className="relative">
//               <input
//                 type={showPassword ? 'text' : 'password'}
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 placeholder="••••••••"
//                 required
//                 className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowPassword(!showPassword)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
//               >
//                 {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
//               </button>
//             </div>
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
//           >
//             {loading ? (
//               <span className="animate-pulse">Connexion en cours...</span>
//             ) : (
//               <>
//                 <LogIn size={15} />
//                 Connexion
//               </>
//             )}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }

// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { LogIn, Eye, EyeOff, ShieldCheck } from 'lucide-react';
// import { useAuth } from '../../contexts/AuthContext';
// import { logActivity } from '../../services/activityLogs';

// export function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const { signIn } = useAuth();
//   const navigate = useNavigate();

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);

//     const { error: signInError } = await signIn(email, password);
//     if (signInError) {
//       setError('E-mail ou mot de passe invalide');
//       setLoading(false);
//       return;
//     }

//     await logActivity({ action: 'login', entity_type: 'user' });
//     navigate('/admin');
//   };

//   return (
//     <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
//       <div className="w-full max-w-sm">
//         <div className="text-center mb-8">
//           <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
//             <ShieldCheck size={24} className="text-slate-300" />
//           </div>
//           <h1 className="text-xl font-bold text-white">Connexion admin</h1>
//           <p className="text-sm text-slate-400 mt-1">Connectez-vous au tableau de bord</p>
//         </div>

//         <form
//           onSubmit={handleSubmit}
//           className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
//         >
//           {error && (
//             <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl">
//               {error}
//             </div>
//           )}

//           <div>
//             <label className="text-sm font-medium text-slate-300 block mb-1.5">Email</label>
//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="admin@example.com"
//               required
//               className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
//             />
//           </div>

//           <div>
//             <label className="text-sm font-medium text-slate-300 block mb-1.5">Mot de Passe</label>
//             <div className="relative">
//               <input
//                 type={showPassword ? 'text' : 'password'}
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 placeholder="••••••••"
//                 required
//                 className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowPassword(!showPassword)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
//               >
//                 {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
//               </button>
//             </div>
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
//           >
//             {loading ? (
//               <span className="animate-pulse">Connexion en cours...</span>
//             ) : (
//               <>
//                 <LogIn size={15} />
//                 Connexion
//               </>
//             )}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }
