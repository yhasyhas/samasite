import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, redirect_url } = await req.json();

    if (!email?.trim()) {
      return new Response(JSON.stringify({ error: 'Email requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier que l'utilisateur existe dans auth.users
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = listData.users.find((u) => u.email === email.trim());
    if (!user) {
      // On retourne quand même un succès pour ne pas leak d'infos (sécurité)
      return new Response(
        JSON.stringify({ success: true, message: 'Si cet email existe, un lien a été généré.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Générer le lien de recovery côté serveur
    const appUrl = redirect_url || Deno.env.get('APP_URL') || '';
    const redirectTo = appUrl
      ? `${appUrl.replace(/\/$/, '')}/admin/reset-password`
      : undefined;

    const { data, error: genError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim(),
      options: { redirectTo },
    });

    if (genError) {
      return new Response(JSON.stringify({ error: genError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        recovery_url: data.properties.action_link,
        message: `Lien de réinitialisation généré pour ${email}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Erreur reset-password:', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});