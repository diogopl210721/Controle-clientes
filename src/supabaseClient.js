import { createClient } from "@supabase/supabase-js";

// Dados do projeto Supabase (Project Settings > API)
const SUPABASE_URL = "https://arffptuclrrzuzdrcmuc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyZmZwdHVjbHJyenV6ZHJjbXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTcxMDAsImV4cCI6MjEwMTI5MzEwMH0.n3AqYrMwv2ayVa4la6vesVJOfd_LkdmY-ikp8P8uFAg";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
);
