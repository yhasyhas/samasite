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

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerProfile?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Seuls les super admins peuvent inviter des utilisateurs' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, role, full_name, redirect_url } = await req.json();

    if (!email?.trim()) {
      return new Response(JSON.stringify({ error: 'Email requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['super_admin', 'manager', 'seller'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Rôle invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appUrl = redirect_url || Deno.env.get('APP_URL') || '';
    const redirectTo = appUrl ? `${appUrl.replace(/\/$/, '')}/admin/reset-password` : undefined;

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.trim(),
      {
        data: {
          full_name: full_name || '',
          role: role,
        },
        redirectTo,
      }
    );

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (inviteData.user) {
      // ✅ CONFIRMER L'EMAIL AUTOMATIQUEMENT pour permettre la reconnexion
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        inviteData.user.id,
        { email_confirm: true }
      );
      if (confirmError) {
        console.error('Erreur confirmation email:', confirmError);
      }

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: inviteData.user.id,
          email: email.trim(),
          full_name: full_name || null,
          role: role,
          is_active: true,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Erreur création profil:', profileError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation envoyée à ${email}`,
        user_id: inviteData.user?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    console.error('Erreur invite-user:', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   try {
//     const supabaseAdmin = createClient(
//       Deno.env.get('SUPABASE_URL') ?? '',
//       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
//     );

//     const authHeader = req.headers.get('authorization');
//     if (!authHeader) {
//       return new Response(JSON.stringify({ error: 'Non autorisé' }), {
//         status: 401,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     const token = authHeader.replace('Bearer ', '');
//     const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);

//     if (callerError || !caller) {
//       return new Response(JSON.stringify({ error: 'Token invalide' }), {
//         status: 401,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     const { data: callerProfile } = await supabaseAdmin
//       .from('profiles')
//       .select('role')
//       .eq('id', caller.id)
//       .maybeSingle();

//     if (callerProfile?.role !== 'super_admin') {
//       return new Response(JSON.stringify({ error: 'Seuls les super admins peuvent inviter des utilisateurs' }), {
//         status: 403,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     const { email, role, full_name, redirect_url } = await req.json();

//     if (!email?.trim()) {
//       return new Response(JSON.stringify({ error: 'Email requis' }), {
//         status: 400,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     if (!['super_admin', 'manager', 'seller'].includes(role)) {
//       return new Response(JSON.stringify({ error: 'Rôle invalide' }), {
//         status: 400,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     // URL de redirection : priorité au paramètre frontend, fallback sur var d'env
//     const appUrl = redirect_url || Deno.env.get('APP_URL') || '';
//     const redirectTo = appUrl ? `${appUrl.replace(/\/$/, '')}/admin/reset-password` : undefined;

//     const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
//       email.trim(),
//       {
//         data: {
//           full_name: full_name || '',
//           role: role,
//         },
//         redirectTo,
//       }
//     );

//     if (inviteError) {
//       return new Response(JSON.stringify({ error: inviteError.message }), {
//         status: 400,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     if (inviteData.user) {
//       const { error: profileError } = await supabaseAdmin
//         .from('profiles')
//         .upsert({
//           id: inviteData.user.id,
//           email: email.trim(),
//           full_name: full_name || null,
//           role: role,
//           is_active: true,
//         }, { onConflict: 'id' });

//       if (profileError) {
//         console.error('Erreur création profil:', profileError);
//       }
//     }

//     return new Response(
//       JSON.stringify({
//         success: true,
//         message: `Invitation envoyée à ${email}`,
//         user_id: inviteData.user?.id,
//       }),
//       {
//         status: 200,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       }
//     );

//   } catch (err) {
//     console.error('Erreur invite-user:', err);
//     return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
//       status: 500,
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//     });
//   }
// });

// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// serve(async (req) => {
//   // Gérer les requêtes OPTIONS (CORS preflight)
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   try {
//     // 1. Créer un client Supabase avec la clé service_role (admin)
//     const supabaseAdmin = createClient(
//       Deno.env.get('SUPABASE_URL') ?? '',
//       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
//     );

//     // 2. Vérifier que l'appelant est authentifié
//     const authHeader = req.headers.get('authorization');
//     if (!authHeader) {
//       return new Response(JSON.stringify({ error: 'Non autorisé' }), {
//         status: 401,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     const token = authHeader.replace('Bearer ', '');
//     const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);

//     if (callerError || !caller) {
//       return new Response(JSON.stringify({ error: 'Token invalide' }), {
//         status: 401,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     // 3. Vérifier que l'appelant est super_admin
//     const { data: callerProfile } = await supabaseAdmin
//       .from('profiles')
//       .select('role')
//       .eq('id', caller.id)
//       .maybeSingle();

//     if (callerProfile?.role !== 'super_admin') {
//       return new Response(JSON.stringify({ error: 'Seuls les super admins peuvent inviter des utilisateurs' }), {
//         status: 403,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     // 4. Récupérer les données du body
//     const { email, role, full_name } = await req.json();

//     if (!email?.trim()) {
//       return new Response(JSON.stringify({ error: 'Email requis' }), {
//         status: 400,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     if (!['super_admin', 'manager', 'seller'].includes(role)) {
//       return new Response(JSON.stringify({ error: 'Rôle invalide' }), {
//         status: 400,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     // 5. Envoyer l'invitation via l'API admin
//     const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
//       email.trim(),
//       {
//         data: {
//           full_name: full_name || '',
//           role: role,
//         },
//         redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}/admin/login`, // optionnel
//       }
//     );

//     if (inviteError) {
//       return new Response(JSON.stringify({ error: inviteError.message }), {
//         status: 400,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     // 6. Créer le profil dans la table profiles (upsert au cas où)
//     if (inviteData.user) {
//       const { error: profileError } = await supabaseAdmin
//         .from('profiles')
//         .upsert({
//           id: inviteData.user.id,
//           email: email.trim(),
//           full_name: full_name || null,
//           role: role,
//           is_active: true,
//         }, { onConflict: 'id' });

//       if (profileError) {
//         console.error('Erreur création profil:', profileError);
//         // On ne bloque pas, l'auth est déjà créée, le profil peut être créé plus tard par un trigger
//       }
//     }

//     return new Response(
//       JSON.stringify({
//         success: true,
//         message: `Invitation envoyée à ${email}`,
//         user_id: inviteData.user?.id,
//       }),
//       {
//         status: 200,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       }
//     );

//   } catch (err) {
//     console.error('Erreur invite-user:', err);
//     return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
//       status: 500,
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//     });
//   }
// });