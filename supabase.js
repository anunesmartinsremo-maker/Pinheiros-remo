import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://panvynpklduxryxmkbmc.supabase.co'
const SUPABASE_KEY = 'sb_publishable_z3i9kS8WVdN7kqtb4HRYBg_BG9lhYV9'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
