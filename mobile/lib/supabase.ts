import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const FALLBACK_SUPABASE_URL = "https://qvbnkblzytedxueunaem.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Ym5rYmx6eXRlZHh1ZXVuYWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNDc3NDIsImV4cCI6MjA4OTgyMzc0Mn0.o6VJVzh0xWXiUnT4yoxl2LY_-0rGRBNc6DLOmcwwP-Q";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? FALLBACK_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  FALLBACK_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = SUPABASE_KEY.length > 0;

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase key missing. Add EXPO_PUBLIC_SUPABASE_ANON_KEY to mobile/.env."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
