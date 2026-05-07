// api/submit-quote.js
// Route API Vercel - appelée côté serveur, utilise service_role_key

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { full_name, phone, email, message, items } = req.body;

    // Validation
    if (!full_name?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'Nom et téléphone requis' });
    }

    // Appel Supabase côté serveur avec SERVICE_ROLE_KEY
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await fetch(`${supabaseUrl}/rest/v1/quote_requests?select=*`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        full_name: full_name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        message: message?.trim() || null,
        items: items || [],
        status: 'new',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur Supabase:', errorText);
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement' });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, data: data[0] });

  } catch (err) {
    console.error('Erreur API:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}