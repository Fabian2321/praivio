import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtvlbavlhlnfamlreiql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0dmxiYXZsaGxuZmFtbHJlaXFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMjUyMzEsImV4cCI6MjA2NjYwMTIzMX0.Y7X_m_GMqkMgNKkZztdrqXn99WiUlqal4RGqNWCCOXI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 