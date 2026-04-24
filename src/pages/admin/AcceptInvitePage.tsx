import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      // Vérifier s\'il y a une erreur dans le hash de l\'URL
      const hash = window.location.hash;
      if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.slice(1));
        const errDesc = params.get('error_description') || 'Lien invalide';
        if (!cancelled) {
          setVerifying(false);
          setLoading(false);
          setError(errDesc);
        }
        return;
      }

      // Attendre que Supabase parse automatiquement le hash d\'invitation
      await new Promise((r) => setTimeout(r, 1500));

      if (cancelled) return;

      // Vérifier si une session a été créée automatiquement
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setVerifying(false);
        setLoading(false);
        return;
      }

      // Fallback : essayer de récupérer l\'utilisateur courant
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setVerifying(false);
        setLoading(false);
        return;
      }

      if (!cancelled) {
        setVerifying(false);
        setLoading(false);
        setError("Ce lien d\'invitation est invalide ou a expiré. Demandez une nouvelle invitation à votre administrateur.");
      }
    };

    verifySession();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    toast.success('Mot de passe défini avec succès !');

    setTimeout(() => {
      navigate('/admin');
    }, 2000);
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-600 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Vérification de votre invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-950 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Lien invalide</h1>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/admin/login')}
            className="w-full py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-950 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Compte activé !</h1>
          <p className="text-sm text-slate-400 mb-6">
            Votre mot de passe est défini. Redirection vers le tableau de bord...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <KeyRound size={24} className="text-slate-300" />
          </div>
          <h1 className="text-xl font-bold text-white">Bienvenue !</h1>
          <p className="text-sm text-slate-400 mt-1">
            Vous avez été invité à rejoindre l\'équipe. Définissez votre mot de passe pour accéder au tableau de bord.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
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
            <p className="text-xs text-slate-500 mt-1">Minimum 8 caractères</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Confirmer le mot de passe</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Enregistrement...</span>
            ) : (
              'Définir mon mot de passe'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}