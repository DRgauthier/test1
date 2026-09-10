const SUPABASE_URL = 'https://ciafbekrxnaglfpuyyjs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VwSCglUJmHIC6WZz8NI0XQ_xPBChtf4';

// Initialize the Supabase client
// This assumes the Supabase library is loaded via CDN globally in index.html as 'supabase'
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
