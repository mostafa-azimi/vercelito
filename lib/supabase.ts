import { createClient } from "@supabase/supabase-js"

// Your Supabase project credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wmbksxmtxbvlvkftaxyl.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtYmtzeG10eGJ2bHZrZnRheHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NDA1NjksImV4cCI6MjA2NTMxNjU2OX0.kkWJcOZP_15idtrR4w313rq68cYvqJIqUd8DMyIYJ0c"

// Create a mock client if environment variables are not available
const createMockSupabase = () => ({
  from: (table: string) => ({
    insert: (data: any) => Promise.resolve({ data: { id: `mock-${Date.now()}`, ...data }, error: null }),
    select: (columns?: string) => ({
      single: () => Promise.resolve({ data: { id: `mock-${Date.now()}` }, error: null }),
      order: (column: string, options?: any) => ({
        limit: (count: number) => Promise.resolve({ data: [], error: null }),
      }),
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => Promise.resolve({ data: null, error: null }),
    }),
  }),
})

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : createMockSupabase()

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

export type BarcodeJob = {
  id: string
  job_name: string
  code_type: "qr" | "code128"
  label_size: string
  total_codes: number
  processed_codes: number
  status: "pending" | "processing" | "completed" | "failed"
  display_barcode_data: boolean
  created_at: string
  updated_at: string
}

export type BarcodeItem = {
  id: string
  job_id: string
  sku?: string
  data: string
  top_text?: string
  bottom_text?: string
  barcode_url?: string
  created_at: string
}
