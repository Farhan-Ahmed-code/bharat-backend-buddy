// Deno Deploy Edge Function: create_payment_order
// Env required: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Razorpay from "https://esm.sh/razorpay@2.9.5?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

type CreateOrderBody = {
  auction_id: string;
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
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { auction_id } = (await req.json()) as CreateOrderBody;
    if (!auction_id) return Response.json({ error: "auction_id required" }, { status: 400, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRole);

    const { data: auction, error: aErr } = await supabase
      .from("auctions")
      .select("id,title,current_price,winner_id")
      .eq("id", auction_id)
      .single();
    if (aErr || !auction) return Response.json({ error: aErr?.message || "Auction not found" }, { status: 404, headers: corsHeaders });

    // Optional: Verify requester is the winner by reading Authorization header user if available
    // In production, validate JWT and compare to auction.winner_id.

    const key_id = Deno.env.get("RAZORPAY_KEY_ID")!;
    const key_secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const instance = new Razorpay({ key_id, key_secret });

    const order = await instance.orders.create({
      amount: Math.max(1, Math.floor((auction.current_price || 0) * 100)),
      currency: "INR",
      receipt: `auction_${auction.id}`,
      notes: { title: auction.title },
    });

    // Upsert pending payment record
    await supabase.from("payments").insert({
      auction_id: auction.id,
      winner_id: auction.winner_id,
      amount: auction.current_price,
      status: "pending",
      provider_order_id: order.id,
    });

    return Response.json({ order_id: order.id, key_id }, { headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500, headers: corsHeaders });
  }
});


