const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

// Initialize the Supabase client
// This assumes the Supabase library is loaded via CDN globally in index.html as 'supabase'
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
