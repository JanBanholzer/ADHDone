import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qvbnkblzytedxueunaem.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9GEkklCbpB_LeJYdW33ADw_sbIaFoeq";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
