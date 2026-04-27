import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars");
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Types
export type Peptide = {
  id: string;
  user_id: string;
  name: string;
  mg: number;
  ml: number;
  mcg_per_unit: number;
  created_at: string;
};

export type Dose = {
  id: string;
  user_id: string;
  peptide_id: string;
  peptide_name: string;
  date: string;
  time_of_day: "AM" | "PM";
  units: number;
  mcg: number;
  created_at: string;
};
