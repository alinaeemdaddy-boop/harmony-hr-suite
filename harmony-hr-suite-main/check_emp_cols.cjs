
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
    const [k, v] = l.split('=');
    if (k && v) env[k.trim()] = v.trim().replace(/^\"(.*)\"$/, '$1');
});

const s = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
    const { data, error } = await s.from('employees').select('*').limit(1);
    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Columns:', data?.[0] ? Object.keys(data[0]) : 'Empty');
    }
}

check();
