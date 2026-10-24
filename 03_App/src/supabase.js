import { createClient } from '@supabase/supabase-js'

// The publishable key is safe to ship: row-level security and the private bucket
// only let signed-in users in.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
