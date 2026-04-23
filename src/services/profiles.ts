import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

export async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data as Profile[] | null, error };
}

export async function createProfile(profile: Partial<Profile> & { password: string }) {
  const { password, ...profileData } = profile;
  const { data: authData, error: authError } = await supabase.auth.admin
    ? await (supabase.auth as any).admin.createUser({ email: profile.email!, password, email_confirm: true })
    : { data: null, error: new Error('Admin API not available') };

  if (authError) return { data: null, error: authError };

  const { data, error } = await supabase
    .from('profiles')
    .insert({ ...profileData, id: authData?.user?.id })
    .select()
    .maybeSingle();
  return { data: data as Profile | null, error };
}

export async function updateProfile(id: string, profile: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', id)
    .select()
    .maybeSingle();
  return { data: data as Profile | null, error };
}

export async function inviteUser(email: string, role: Profile['role'], fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: Math.random().toString(36).slice(-12) + 'Aa1!',
    options: {
      data: { full_name: fullName, role },
    },
  });

  if (error) return { data: null, error };

  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      role,
    });
  }

  return { data, error: null };
}
