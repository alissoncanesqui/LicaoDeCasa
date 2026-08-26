import { createClient } from '@supabase/supabase-js';

// Fazendo a ligação direta com a fábrica (Supabase)
const supabaseUrl = "https://switudaszwnbmgpbhamd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3aXR1ZGFzenduYm1ncGJoYW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2Nzk5MDUsImV4cCI6MjEwMzI1NTkwNX0.yodx01zOqwhdRCog-msV6YRGvz3bReAdPjY_W7Nfk9Q";

export const supabase = createClient(supabaseUrl, supabaseKey);
