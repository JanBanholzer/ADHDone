import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const FALLBACK_SUPABASE_URL = "https://qvbnkblzytedxueunaem.supabase.co";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? FALLBACK_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

export const isSupabaseConfigured = SUPABASE_KEY.length > 0;

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase key missing. Add EXPO_PUBLIC_SUPABASE_ANON_KEY to mobile/.env."
  );
}

// createClient() may throw if the key is empty; keep app boot non-fatal.
const SAFE_SUPABASE_KEY =
  SUPABASE_KEY.length > 0 ? SUPABASE_KEY : "public-anon-key-not-set";

export const supabase = createClient(SUPABASE_URL, SAFE_SUPABASE_KEY);
