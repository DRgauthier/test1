const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
code = code.replace(
    'let { data: player, error: playerError } = await window.supabaseClient',
    'if (!window.supabaseClient) return; let { data: player, error: playerError } = await window.supabaseClient'
);
fs.writeFileSync('index.html', code);
