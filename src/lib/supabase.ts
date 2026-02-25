import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://unyxukazqxjrreviyajp.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueXh1a2F6cXhqcnJldml5YWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTU4NjMsImV4cCI6MjA4NzU5MTg2M30.MTeQ8Kv46K2iMH1za2aFY66iRsa3XgFKqI6haVSGvu8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
