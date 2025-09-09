import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Cliente con autenticación automática para componentes del lado del servidor
export const createServerSupabaseClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}
