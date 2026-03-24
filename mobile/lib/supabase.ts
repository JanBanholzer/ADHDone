import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qvbnkblzytedxueunaem.supabase.co";

// The anon key is safe for client-side use.
// Replace with your project's anon key from the Supabase dashboard.
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
