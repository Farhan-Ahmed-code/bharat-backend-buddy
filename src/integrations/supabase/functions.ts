import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Create a lightweight client for invoking edge functions with the existing anon key
const SUPABASE_URL = "https://botexzthlcmeuvsjbblh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdGV4enRobGNtZXV2c2piYmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MzAwOTEsImV4cCI6MjA3MzQwNjA5MX0.uMB5zGfrqQLf77nvWl5XHGYxAzjbd-2b4iYhBSOfiIY";

export const supabaseEdge = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export async function callSignupFunction(payload: Record<string, unknown>) {
	const { data, error } = await supabaseEdge.functions.invoke('handle_new_user_signup', {
		body: payload,
	});
	if (error) throw error;
	return data as { user_id: string };
}


