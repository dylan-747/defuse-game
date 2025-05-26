// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Your Supabase project URL and anon public key
const supabaseUrl = "https://ifpxkmogfmjrcarcfris.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmcHhrbW9nZm1qcmNhcmNmcmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNzQ1MjQsImV4cCI6MjA2Mzg1MDUyNH0.Zb0wakfocy2gCms1xg471ICZEu3InHNTqfu0NMcZ8so";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
