
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
    try {
        const { data: users, error: uError } = await supabase.from('app_users').select('username, employee_id');
        console.log('App Users:', users);

        const { data: emps, error: eError } = await supabase.from('employees').select('id, full_name, email').limit(5);
        console.log('Employees:', emps);
    } catch (e) {
        console.error('Catch:', e);
    }
}

check();
