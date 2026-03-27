
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
try {
    const envFile = fs.readFileSync('.env', 'utf8');
    envFile.split('\n').forEach(l => {
        const [k, v] = l.split('=');
        if (k && v) env[k.trim()] = v.trim().replace(/^"(.*)"$/, '$1');
    });
} catch (e) { }

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function checkAppUsers() {
    const { data, error } = await supabase.from('app_users').select('*').limit(1);
    if (error) {
        console.log('Error checking app_users:', error.message);
    } else {
        console.log('app_users table exists.');
    }
}

checkAppUsers();
