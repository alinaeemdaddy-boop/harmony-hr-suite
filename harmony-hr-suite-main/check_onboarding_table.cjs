
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
try {
    const envFile = fs.readFileSync('.env', 'utf8');
    envFile.split('\n').forEach(l => {
        const [k, v] = l.split('=');
        if (k && v) env[k.trim()] = v.trim().replace(/^"(.*)"$/, '$1');
    });
} catch (e) {
    console.log('No .env file found');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function checkTable() {
    const { data, error } = await supabase.from('onboarding_cases').select('*').limit(1);
    if (error) {
        console.log('Error checking onboarding_cases:', error.message);
    } else {
        console.log('onboarding_cases table exists.');
    }
}

checkTable();
