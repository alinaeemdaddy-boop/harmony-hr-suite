
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
        const { data: emps } = await supabase.from('employees').select('id').limit(1);
        const { data: types } = await supabase.from('leave_types').select('id').limit(1);

        if (!emps?.[0] || !types?.[0]) {
            console.log('Missing employee or leave type');
            return;
        }

        const { error } = await supabase.from('leave_requests').insert({
            employee_id: emps[0].id,
            leave_type_id: types[0].id,
            start_date: '2026-02-10',
            end_date: '2026-02-11',
            reason: 'Test purpose',
            total_days: 2,
            status: 'pending'
        });

        if (error) {
            console.log('Insert Error:', error.message);
            console.log('Details:', error.details);
            console.log('Code:', error.code);
        } else {
            console.log('Insert Success');
        }
    } catch (e) {
        console.error('Catch:', e);
    }
}

check();
