// Deno Deploy Edge Function: razorpay_webhook
// Set env: RAZORPAY_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  const bodyText = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');

  const isValid = timingSafeEqual(encoder.encode(signature), encoder.encode(expected));
  if (!isValid) return new Response('Invalid signature', { status: 401, headers: corsHeaders });

  const payload = JSON.parse(bodyText);
  const event = payload?.event as string;
  const orderId = payload?.payload?.payment?.entity?.order_id as string | undefined;

  if (event === 'payment.captured' && orderId) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRole);

    // Mark payment paid
    const { data: payment } = await supabase
      .from('payments')
      .update({ status: 'paid' })
      .eq('provider_order_id', orderId)
      .select('auction_id')
      .single();

    if (payment?.auction_id) {
      await supabase
        .from('auctions')
        .update({ payment_status: 'paid' })
        .eq('id', payment.auction_id);
    }
  }

  return new Response('ok', { status: 200, headers: corsHeaders });
});


