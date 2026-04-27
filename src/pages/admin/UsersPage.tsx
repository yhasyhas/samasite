import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Users, Mail, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getProfiles, updateProfile, inviteUser } from '../../services/profiles';
import { logActivity, logActivityWithDiff } from '../../services/activityLogs';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Profile } from '../../types';
import { toast } from 'sonner';

const ROLE_COLORS: Record<string, string> = {
  super_admin: '#8b5cf6',
  manager: '#3b82f6',
  seller: '#10b981',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super administrateur',
  manager: 'Gestionnaire',
  seller: 'Vendeur',
};

export function UsersPage() {
  const { profile: currentProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'seller' as Profile['role'] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getProfiles();
    setProfiles(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async () => {
    if (!form.email.trim()) { toast.error('L\'email est requis'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Adresse email invalide');
      return;
    }

    setSaving(true);
    const { error } = await inviteUser(form.email.trim(), form.role, form.full_name.trim());

    if (error) {
      toast.error('Échec de l\'invitation : ' + error.message);
      setSaving(false);
      return;
    }

    await logActivity({
      action: 'create',
      entity_type: 'user',
      details: { email: form.email, role: form.role },
    });

    toast.success(`Invitation envoyée à ${form.email}`);
    setSaving(false);
    setShowModal(false);
    setForm({ email: '', full_name: '', role: 'seller' });
    load();
  };

  const toggleActive = async (p: Profile) => {
    if (p.id === currentProfile?.id) { toast.error('Impossible de désactiver votre propre compte'); return; }
    const newState = !p.is_active;
    await updateProfile(p.id, { is_active: newState });

    await logActivityWithDiff(
      { action: 'status_change', entity_type: 'user', entity_id: p.id },
      { is_active: p.is_active },
      { is_active: newState }
    );

    load();
  };

  const canManage = currentProfile?.role === 'super_admin';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utilisateurs</h1>
          <p className="text-sm text-slate-500 mt-0.5">{profiles.length} membre{profiles.length !== 1 ? 's' : ''} du personnel</p>
        </div>
        {canManage && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
            <Plus size={15} /> Inviter un utilisateur
          </button>
        )}
      </div>

      {!canManage && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-center gap-2 text-sm text-amber-800">
          <Shield size={14} /> Seuls les super administrateurs peuvent gérer les utilisateurs
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Utilisateur</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Rôle</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Téléphone</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Inscription</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Statut</th>
              {canManage && <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                ))
              : profiles.map((p) => (
                  <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.id === currentProfile?.id ? 'bg-slate-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                          {p.full_name?.charAt(0) || p.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{p.full_name || '—'}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={10} />{p.email}</p>
                        </div>
                        {p.id === currentProfile?.id && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Vous</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white capitalize" style={{ backgroundColor: ROLE_COLORS[p.role] || '#64748b' }}>
                        {ROLE_LABELS[p.role] || p.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{p.phone || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(p.created_at), 'dd MMM yyyy', { locale: fr })}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => toggleActive(p)}
                            disabled={p.id === currentProfile?.id}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-30"
                            title={p.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {p.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && profiles.length === 0 && (
          <div className="text-center py-16">
            <Users size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 font-medium">Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Inviter un utilisateur" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Un email d'invitation sera envoyé à l'utilisateur avec un lien pour définir son mot de passe.</p>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="utilisateur@exemple.com" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Nom complet</label>
            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jean Dupont" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Rôle</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Profile['role'] })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2">
              <option value="seller">Vendeur</option>
              <option value="manager">Gestionnaire</option>
              <option value="super_admin">Super administrateur</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleInvite} disabled={saving} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
              {saving ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
            </button>
            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Annuler</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// import React, { useEffect, useState, useCallback } from 'react';
// import { Plus, Users, Mail, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
// import { format } from 'date-fns';
// import { getProfiles, updateProfile, inviteUser } from '../../services/profiles';
// import { logActivity } from '../../services/activityLogs';
// import { useAuth } from '../../contexts/AuthContext';
// import { Modal } from '../../components/ui/Modal';
// import { Skeleton } from '../../components/ui/Skeleton';
// import type { Profile } from '../../types';
// import { toast } from 'sonner';
// import { logActivityWithDiff } from '../../services/activityLogs';

// const ROLE_COLORS: Record<string, string> = {
//   super_admin: '#8b5cf6',
//   manager: '#3b82f6',
//   seller: '#10b981',
// };

// const ROLE_LABELS: Record<string, string> = {
//   super_admin: 'Super administrateur',
//   manager: 'Gestionnaire',
//   seller: 'Vendeur',
// };

// export function UsersPage() {
//   const { profile: currentProfile } = useAuth();
//   const [profiles, setProfiles] = useState<Profile[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showModal, setShowModal] = useState(false);
//   const [form, setForm] = useState({ email: '', full_name: '', role: 'seller' as Profile['role'] });
//   const [saving, setSaving] = useState(false);

//   const load = useCallback(async () => {
//     setLoading(true);
//     const { data } = await getProfiles();
//     setProfiles(data || []);
//     setLoading(false);
//   }, []);

//   useEffect(() => { load(); }, [load]);

//   const handleInvite = async () => {
//     if (!form.email.trim()) { toast.error('L\'email est requis'); return; }
//     if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
//       toast.error('Adresse email invalide');
//       return;
//     }

//     setSaving(true);
//     const { error } = await inviteUser(form.email.trim(), form.role, form.full_name.trim());

//     if (error) {
//       toast.error('Échec de l\'invitation : ' + error.message);
//       setSaving(false);
//       return;
//     }

//     await logActivity({
//       action: 'create',
//       entity_type: 'user',
//       details: { email: form.email, role: form.role },
//     });

//     toast.success(`Invitation envoyée à ${form.email}`);
//     setSaving(false);
//     setShowModal(false);
//     setForm({ email: '', full_name: '', role: 'seller' });
//     load();
//   };

//   const toggleActive = async (p: Profile) => {
//     if (p.id === currentProfile?.id) { toast.error('Impossible de désactiver votre propre compte'); return; }
//     await updateProfile(p.id, { is_active: !p.is_active });
//     load();
//   };

//   const canManage = currentProfile?.role === 'super_admin';

//   return (
//     <div className="p-6">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Utilisateurs</h1>
//           <p className="text-sm text-slate-500 mt-0.5">{profiles.length} membre{profiles.length !== 1 ? 's' : ''} du personnel</p>
//         </div>
//         {canManage && (
//           <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
//             <Plus size={15} />
//             Inviter un utilisateur
//           </button>
//         )}
//       </div>

//       {!canManage && (
//         <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-center gap-2 text-sm text-amber-800">
//           <Shield size={14} />
//           Seuls les super administrateurs peuvent gérer les utilisateurs
//         </div>
//       )}

//       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//         <table className="w-full text-sm">
//           <thead>
//             <tr className="border-b border-slate-100 bg-slate-50">
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Utilisateur</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Rôle</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Téléphone</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Inscription</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Statut</th>
//               {canManage && <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Actions</th>}
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {loading
//               ? Array.from({ length: 4 }).map((_, i) => (
//                   <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
//                 ))
//               : profiles.map((p) => (
//                   <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.id === currentProfile?.id ? 'bg-slate-50' : ''}`}>
//                     <td className="px-4 py-3">
//                       <div className="flex items-center gap-2.5">
//                         <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
//                           {p.full_name?.charAt(0) || p.email.charAt(0).toUpperCase()}
//                         </div>
//                         <div>
//                           <p className="font-medium text-slate-900">{p.full_name || '—'}</p>
//                           <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={10} />{p.email}</p>
//                         </div>
//                         {p.id === currentProfile?.id && (
//                           <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Vous</span>
//                         )}
//                       </div>
//                     </td>
//                     <td className="px-4 py-3">
//                       <span
//                         className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white capitalize"
//                         style={{ backgroundColor: ROLE_COLORS[p.role] || '#64748b' }}
//                       >
//                         {ROLE_LABELS[p.role] || p.role.replace(/_/g, ' ')}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 text-slate-600 text-xs">{p.phone || '—'}</td>
//                     <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(p.created_at), 'dd MMM yyyy')}</td>
//                     <td className="px-4 py-3">
//                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
//                         {p.is_active ? 'Actif' : 'Inactif'}
//                       </span>
//                     </td>
//                     {canManage && (
//                       <td className="px-4 py-3">
//                         <div className="flex justify-end">
//                           <button
//                             onClick={() => toggleActive(p)}
//                             disabled={p.id === currentProfile?.id}
//                             className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-30"
//                             title={p.is_active ? 'Désactiver' : 'Activer'}
//                           >
//                             {p.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
//                           </button>
//                         </div>
//                       </td>
//                     )}
//                   </tr>
//                 ))}
//           </tbody>
//         </table>
//         {!loading && profiles.length === 0 && (
//           <div className="text-center py-16">
//             <Users size={36} className="mx-auto mb-3 text-slate-200" />
//             <p className="text-slate-500 font-medium">Aucun utilisateur trouvé</p>
//           </div>
//         )}
//       </div>

//       <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Inviter un utilisateur" size="sm">
//         <div className="space-y-4">
//           <p className="text-sm text-slate-500">Un email d'invitation sera envoyé à l'utilisateur avec un lien pour définir son mot de passe.</p>
//           <div>
//             <label className="text-sm font-medium text-slate-700 block mb-1">Email *</label>
//             <input
//               type="email"
//               value={form.email}
//               onChange={(e) => setForm({ ...form, email: e.target.value })}
//               placeholder="utilisateur@exemple.com"
//               className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//             />
//           </div>
//           <div>
//             <label className="text-sm font-medium text-slate-700 block mb-1">Nom complet</label>
//             <input
//               type="text"
//               value={form.full_name}
//               onChange={(e) => setForm({ ...form, full_name: e.target.value })}
//               placeholder="Jean Dupont"
//               className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//             />
//           </div>
//           <div>
//             <label className="text-sm font-medium text-slate-700 block mb-1">Rôle</label>
//             <select
//               value={form.role}
//               onChange={(e) => setForm({ ...form, role: e.target.value as Profile['role'] })}
//               className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
//             >
//               <option value="seller">Vendeur</option>
//               <option value="manager">Gestionnaire</option>
//               <option value="super_admin">Super administrateur</option>
//             </select>
//           </div>
//           <div className="flex gap-3 pt-2">
//             <button
//               onClick={handleInvite}
//               disabled={saving}
//               className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
//             >
//               {saving ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
//             </button>
//             <button
//               onClick={() => setShowModal(false)}
//               className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50"
//             >
//               Annuler
//             </button>
//           </div>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// import React, { useEffect, useState, useCallback } from 'react';
// import { Plus, Users, Mail, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
// import { format } from 'date-fns';
// import { getProfiles, updateProfile, inviteUser } from '../../services/profiles';
// import { logActivity } from '../../services/activityLogs';
// import { useAuth } from '../../contexts/AuthContext';
// import { Modal } from '../../components/ui/Modal';
// import { Skeleton } from '../../components/ui/Skeleton';
// import type { Profile } from '../../types';
// import { toast } from 'sonner';

// const ROLE_COLORS: Record<string, string> = {
//   super_admin: '#8b5cf6',
//   manager: '#3b82f6',
//   seller: '#10b981',
// };

// export function UsersPage() {
//   const { profile: currentProfile } = useAuth();
//   const [profiles, setProfiles] = useState<Profile[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showModal, setShowModal] = useState(false);
//   const [form, setForm] = useState({ email: '', full_name: '', role: 'seller' as Profile['role'] });
//   const [saving, setSaving] = useState(false);

//   const load = useCallback(async () => {
//     setLoading(true);
//     const { data } = await getProfiles();
//     setProfiles(data || []);
//     setLoading(false);
//   }, []);

//   useEffect(() => { load(); }, [load]);

//   const handleInvite = async () => {
//     if (!form.email.trim()) { toast.error('Email est requis'); return; }
//     setSaving(true);
//     const { error } = await inviteUser(form.email, form.role, form.full_name);
//     if (error) { toast.error('Échec de invitation utilisateur: ' + error.message); setSaving(false); return; }
//     await logActivity({ action: 'create', entity_type: 'user', details: { email: form.email, role: form.role } });
//     toast.success('Utilisateur invité avec succès');
//     setSaving(false);
//     setShowModal(false);
//     load();
//   };

//   const toggleActive = async (p: Profile) => {
//     if (p.id === currentProfile?.id) { toast.error('Impossible de désactiver votre propre compte'); return; }
//     await updateProfile(p.id, { is_active: !p.is_active });
//     load();
//   };

//   const canManage = currentProfile?.role === 'super_admin';

//   return (
//     <div className="p-6">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Utilisateurs</h1>
//           <p className="text-sm text-slate-500 mt-0.5">{profiles.length} Membres du personnel</p>
//         </div>
//         {canManage && (
//           <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
//             <Plus size={15} />
//             Inviter un utilisateur
//           </button>
//         )}
//       </div>

//       {!canManage && (
//         <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-center gap-2 text-sm text-amber-800">
//           <Shield size={14} />
//           Seuls les super admins peuvent gérer les utilisateurs
//         </div>
//       )}

//       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//         <table className="w-full text-sm">
//           <thead>
//             <tr className="border-b border-slate-100 bg-slate-50">
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Utilisateur</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Role</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Téléphone</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Inscription</th>
//               <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
//               {canManage && <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Actions</th>}
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {loading
//               ? Array.from({ length: 4 }).map((_, i) => (
//                   <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
//                 ))
//               : profiles.map((p) => (
//                   <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.id === currentProfile?.id ? 'bg-slate-50' : ''}`}>
//                     <td className="px-4 py-3">
//                       <div className="flex items-center gap-2.5">
//                         <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
//                           {p.full_name?.charAt(0) || p.email.charAt(0).toUpperCase()}
//                         </div>
//                         <div>
//                           <p className="font-medium text-slate-900">{p.full_name || '—'}</p>
//                           <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={10} />{p.email}</p>
//                         </div>
//                         {p.id === currentProfile?.id && (
//                           <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">You</span>
//                         )}
//                       </div>
//                     </td>
//                     <td className="px-4 py-3">
//                       <span
//                         className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white capitalize"
//                         style={{ backgroundColor: ROLE_COLORS[p.role] || '#64748b' }}
//                       >
//                         {p.role.replace(/_/g, ' ')}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 text-slate-600 text-xs">{p.phone || '—'}</td>
//                     <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
//                     <td className="px-4 py-3">
//                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
//                         {p.is_active ? 'Active' : 'Inactive'}
//                       </span>
//                     </td>
//                     {canManage && (
//                       <td className="px-4 py-3">
//                         <div className="flex justify-end">
//                           <button
//                             onClick={() => toggleActive(p)}
//                             disabled={p.id === currentProfile?.id}
//                             className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-30"
//                           >
//                             {p.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
//                           </button>
//                         </div>
//                       </td>
//                     )}
//                   </tr>
//                 ))}
//           </tbody>
//         </table>
//         {!loading && profiles.length === 0 && (
//           <div className="text-center py-16">
//             <Users size={36} className="mx-auto mb-3 text-slate-200" />
//             <p className="text-slate-500 font-medium">Aucun utilisateur trouvé</p>
//           </div>
//         )}
//       </div>

//       <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Invite User" size="sm">
//         <div className="space-y-4">
//           <p className="text-sm text-slate-500">Un e-mail d'invitation sera envoyé à l'utilisateur.</p>
//           <div>
//             <label className="text-sm font-medium text-slate-700 block mb-1">Email *</label>
//             <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
//               className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//           </div>
//           <div>
//             <label className="text-sm font-medium text-slate-700 block mb-1">Nom complet</label>
//             <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
//               className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2" />
//           </div>
//           <div>
//             <label className="text-sm font-medium text-slate-700 block mb-1">Role</label>
//             <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Profile['role'] })}
//               className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2">
//               <option value="seller">Vendeur</option>
//               <option value="manager">Gestionnaire</option>
//               <option value="super_admin">Super administrateur</option>
//             </select>
//           </div>
//           <div className="flex gap-3 pt-2">
//             <button onClick={handleInvite} disabled={saving} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
//               {saving ? 'Inviting...' : 'Send Invitation'}
//             </button>
//             <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
//           </div>
//         </div>
//       </Modal>
//     </div>
//   );
// }
