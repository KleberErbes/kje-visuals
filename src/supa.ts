import { createClient, type SupabaseClient } from "@supabase/supabase-js";
export const BUCKET = "media";
let client: SupabaseClient | undefined;
// Só o servidor usa esta chave (service role / secret). Nunca vai para o navegador.
export function supa() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.");
  return client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
