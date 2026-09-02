import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Check web/.env.local',
  )
}

// The publishable key is meant to be public — it identifies the project but
// grants nothing on its own. Row Level Security decides what a guest may
// actually read, and guests have no write access to any table: orders are
// created only through the submit_guest_order function.
export const supabase = createClient(url, key)
