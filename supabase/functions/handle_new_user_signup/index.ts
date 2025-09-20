// Deno Edge Function: handle_new_user_signup
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

type SignupBody = {
  email: string;
  password: string;
  redirect_url?: string;
  profile?: Record<string, unknown>;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  try {
    const body = (await req.json()) as SignupBody;
    const { email, password, profile, redirect_url } = body;
    if (!email || !password) return Response.json({ error: "email and password required" }, { status: 400, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    // Create auth user via admin API (atomic server-side)
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // mark email as confirmed to bypass verification
      user_metadata: { full_name: (profile as any)?.full_name ?? null },
    });
    if (createErr || !created.user) return Response.json({ error: createErr?.message || "user create failed" }, { status: 400, headers: corsHeaders });

    const userId = created.user.id;
    // Insert profile row
    const { error: profileErr } = await supabase.from('profiles').insert({
      user_id: userId,
      full_name: (profile as any)?.full_name ?? null,
      phone: (profile as any)?.phone ?? null,
      address: (profile as any)?.address ?? null,
      city: (profile as any)?.city ?? null,
      state: (profile as any)?.state ?? null,
      pincode: (profile as any)?.pincode ?? null,
    });
    if (profileErr) return Response.json({ error: profileErr.message }, { status: 400, headers: corsHeaders });

    // Send email invite/verification (optional)
    // Note: The Admin API doesn't send magic link by default; clients can sign in and verify via email link configured in Auth.
    // If you need a confirmation email, you can call generateLink and send yourself.

    return Response.json({ user_id: userId, redirect_url }, { headers: corsHeaders });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500, headers: corsHeaders });
  }
});


