import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfig = {
  isConfigured: Boolean(supabaseUrl && supabasePublishableKey),
  missing: [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : "",
    !supabasePublishableKey ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : "",
  ].filter(Boolean),
};

export const supabase: SupabaseClient | null = supabaseConfig.isConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;
