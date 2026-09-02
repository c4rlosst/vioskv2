import 'react-native-url-polyfill/auto';
import {createClient} from '@supabase/supabase-js';

// The publishable key is safe to ship: it identifies the project and
// grants nothing on its own. Row Level Security decides what a signed-in
// waiter or manager may actually read and write.
const SUPABASE_URL = 'https://vxkrnlizcdbvaybdvbgk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rAzKBl8MDfJjmQvfChsyIw_biBNL3qc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // No AsyncStorage yet, so the session lives in memory only and staff
    // sign in again when the app restarts. Deliberate: it keeps the build
    // free of extra native modules. Add persistence later if the
    // re-login during a shift becomes annoying.
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
